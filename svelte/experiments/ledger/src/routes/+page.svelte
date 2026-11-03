<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import Icon from '#lib/components/Icon.svelte';
	import { SAVE_COLOR, INCOME_COLOR } from '#lib/categories';
	import { compact, dayLabel, firstWeekdayOf, num, signed, weekdayOf, WEEKDAYS } from '#lib/format';
	import type { DayCell, Entry, Kind } from '#lib/types';

	let { data, form }: PageProps = $props();

	const KINDS: { kind: Kind; label: string }[] = [
		{ kind: 'spend', label: '지출' },
		{ kind: 'income', label: '입금' },
		{ kind: 'save', label: '저축' }
	];

	/* ---------------- 입력 상태 ---------------- */
	let formKind = $state<Kind>('spend');
	let pickedCategory = $state('');
	let formMethodId = $state('');
	let formGoalId = $state('');
	let amtInput = $state('');
	let memoInput = $state('');
	let addedFlash = $state(false);
	let amountEl = $state<HTMLInputElement>();
	let panelEl = $state<HTMLElement>();

	let editBuf = $state<{
		id: number;
		kind: Kind;
		amount: string;
		category: string;
		memo: string;
		methodId: string;
		goalId: string;
	} | null>(null);
	let startOpen = $state(false);

	/** 분류 칩 목록 — 종류별 */
	const catList = (k: Kind) => data.categories.filter((c) => k !== 'save' && c.kind === k);

	/** 현재 종류에서 쓸 수 있는 첫 분류로 맞춘다 */
	function normalizeCategory(k: Kind, current: string): string {
		if (k === 'save') return '저축';
		const list = catList(k);
		return list.some((c) => c.name === current) ? current : (list[0]?.name ?? '');
	}

	// 고른 분류가 현재 종류에 없으면 그 종류의 첫 분류로 보정한다
	const formCategory = $derived(normalizeCategory(formKind, pickedCategory));

	/* 날짜·달이 바뀌면 열려 있는 편집기를 닫는다 */
	$effect(() => {
		void data.month;
		void data.selectedDate;
		editBuf = null;
		startOpen = false;
	});

	/* 좁은 화면에서는 날짜를 누르면 기록 패널로 이동한다 */
	afterNavigate(({ type }) => {
		if (type === 'link' && window.innerWidth < 1280) {
			panelEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	});

	/* ---------------- 파생 값 ---------------- */
	const todayMonth = $derived(data.today.slice(0, 7));
	const todayDay = $derived(Number(data.today.slice(8, 10)));
	const selectedIsFuture = $derived(data.selectedDate > data.today);
	const selectedIsToday = $derived(data.selectedDate === data.today);
	const catColor = $derived(Object.fromEntries(data.categories.map((c) => [c.name, c.color])));
	const colorOf = (e: Entry) =>
		e.kind === 'income'
			? INCOME_COLOR
			: e.kind === 'save'
				? SAVE_COLOR
				: (catColor[e.category] ?? '#6B7280');

	const gauge = $derived.by(() => {
		if (data.startAmount === null || data.balance === null) return null;
		const { startAmount: start, balance } = data;
		const pct =
			start > 0 ? Math.max(0, Math.min(100, (balance / start) * 100)) : balance >= 0 ? 100 : 0;
		return { start, balance, pct, low: pct <= 20 };
	});

	const hasSaveCard = $derived(data.monthSaveGoal !== null || data.saveTotal > 0);
	const saveGoalPct = $derived(
		data.monthSaveGoal && data.monthSaveGoal > 0
			? Math.min(100, Math.round((data.saveTotal / data.monthSaveGoal) * 100))
			: null
	);

	const weeks = $derived.by(() => {
		const rows: (DayCell | null)[][] = [];
		let row: (DayCell | null)[] = Array<DayCell | null>(firstWeekdayOf(data.month)).fill(null);
		for (const cell of data.byDay) {
			row.push(cell);
			if (row.length === 7) {
				rows.push(row);
				row = [];
			}
		}
		if (row.length > 0) rows.push([...row, ...Array<null>(7 - row.length).fill(null)]);
		return rows;
	});

	/** 칸 안에 찍을 분류 점 — 금액이 큰 순서로 최대 4개 */
	function dots(cell: DayCell): string[] {
		const sums: Record<string, number> = {};
		for (const e of cell.entries) {
			if (e.kind !== 'spend') continue;
			sums[e.category] = (sums[e.category] ?? 0) + e.amount;
		}
		return Object.entries(sums)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 4)
			.map(([name]) => catColor[name] ?? '#6B7280');
	}

	const pendingFixed = $derived.by(() => {
		const dueDay = data.todayInMonth ? todayDay : data.month < todayMonth ? 31 : 0;
		return data.fixedDefs.filter((d) => !data.recordedFixedIds.includes(d.id) && d.day <= dueDay);
	});

	const dayTotals = $derived({
		spend: data.selectedEntries.filter((e) => e.kind === 'spend').reduce((s, e) => s + e.amount, 0),
		income: data.selectedEntries
			.filter((e) => e.kind === 'income')
			.reduce((s, e) => s + e.amount, 0),
		save: data.selectedEntries.filter((e) => e.kind === 'save').reduce((s, e) => s + e.amount, 0)
	});

	const msgOf = (where: string) =>
		form?.where === where && 'message' in form && typeof form.message === 'string'
			? form.message
			: null;
	const addMsg = $derived(msgOf('add'));
	const updateMsg = $derived(msgOf('update'));

	/* ---------------- 동작 ---------------- */
	/** 폼 액션 주소 — JS 없이 제출돼도 보던 달·날짜가 유지되도록 쿼리를 함께 둔다 */
	const act = (name: string) => `?/${name}&m=${data.month}&d=${data.selectedDay}`;

	const afterAdd: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				amtInput = '';
				memoInput = '';
				addedFlash = true;
				setTimeout(() => (addedFlash = false), 2200);
				amountEl?.focus();
			}
		};
	};

	const afterUpdate: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') editBuf = null;
		};
	};

	function setKind(k: Kind) {
		formKind = k;
		if (k !== 'spend') formMethodId = '';
		if (k !== 'save') formGoalId = '';
	}

	function startEdit(e: Entry) {
		editBuf = {
			id: e.id,
			kind: e.kind,
			amount: String(e.amount),
			category: e.category,
			memo: e.memo,
			methodId: e.methodId === null ? '' : String(e.methodId),
			goalId: e.goalId === null ? '' : String(e.goalId)
		};
	}

	function setEditKind(k: Kind) {
		if (!editBuf) return;
		editBuf.kind = k;
		editBuf.category = normalizeCategory(k, editBuf.category);
		if (k !== 'spend') editBuf.methodId = '';
		if (k !== 'save') editBuf.goalId = '';
	}

	/** 숫자만 남기고 천 단위 쉼표를 붙인다 */
	const money = (raw: string) => {
		const digits = raw.replace(/[^\d]/g, '');
		return digits ? num(Number(digits)) : '';
	};
</script>

<svelte:head>
	<title>달통장 — {data.monthLabel}</title>
	<meta name="description" content="달력으로 기록하는 한 달 가계부" />
</svelte:head>

{#snippet kindTabs(current: Kind, pick: (k: Kind) => void, small: boolean, off: boolean)}
	<div
		class="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1"
		role="group"
		aria-label="지출·입금·저축"
	>
		{#each KINDS as k (k.kind)}
			<button
				type="button"
				disabled={off}
				aria-pressed={current === k.kind}
				onclick={() => pick(k.kind)}
				class="rounded-lg font-bold transition-colors disabled:opacity-40 {small
					? 'py-1 text-[12px]'
					: 'py-1.5 text-[13px]'} {current === k.kind
					? 'bg-surface text-ink shadow-sm'
					: 'text-mute hover:text-ink'}"
			>
				{k.label}
			</button>
		{/each}
	</div>
{/snippet}

<div class="space-y-4 pt-1">
	<!-- ── 요약 ─────────────────────────────────── -->
	<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="이번 달 요약">
		<!-- 남은 돈 -->
		<div class="card col-span-2 p-5">
			<h2 class="eyebrow">남은 돈</h2>
			{#if gauge}
				<p class="mt-1 flex items-baseline gap-1.5">
					<span
						class="font-num text-[38px] leading-none font-semibold tracking-tight tabular-nums {gauge.low
							? 'text-danger'
							: ''}"
					>
						{num(gauge.balance)}
					</span>
					<span class="text-[14px] text-mute">원</span>
				</p>
				<div
					class="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
					role="img"
					aria-label="시작 금액의 {Math.round(gauge.pct)}% 남음"
				>
					<div
						class="h-full rounded-full transition-[width] duration-500 {gauge.low
							? 'bg-danger'
							: 'bg-brand'}"
						style="width: {gauge.pct}%"
					></div>
				</div>
				<div class="mt-2 flex items-center justify-between gap-2 text-[12px] text-mute">
					<span class="tnum">{Math.round(gauge.pct)}% 남음 · 시작 {num(gauge.start)}원</span>
					{#if !startOpen}
						<button class="btn-ghost" onclick={() => (startOpen = true)}>
							<Icon name="edit" size={12} /> 시작금액
						</button>
					{/if}
				</div>
			{:else}
				<p class="mt-1 font-num text-[30px] leading-none font-semibold text-faint">—</p>
				<p class="mt-2 max-w-sm text-[13px] leading-relaxed text-mute">
					이번 달 시작 금액이 아직 없어요. 월초에 쓸 수 있는 돈을 정해 두면 남은 돈을 계산해 드려요.
				</p>
				{#if !startOpen}
					<button class="btn btn-sm btn-brand mt-3" onclick={() => (startOpen = true)}>
						시작금액 정하기
					</button>
				{/if}
			{/if}
			{#if startOpen}
				<form
					method="POST"
					action={act('setStart')}
					use:enhance={() => {
						return async ({ result, update }) => {
							await update({ reset: false });
							if (result.type === 'success') startOpen = false;
						};
					}}
					class="mt-3 flex items-center gap-2"
				>
					<input type="hidden" name="month" value={data.month} />
					<input
						name="amount"
						value={data.startAmount ?? ''}
						inputmode="numeric"
						placeholder="예: 2,600,000"
						class="input font-num tabular-nums"
						aria-label="시작 금액"
					/>
					<button class="btn btn-sm shrink-0">저장</button>
					<button type="button" class="btn-ghost shrink-0" onclick={() => (startOpen = false)}>
						취소
					</button>
				</form>
				{#if msgOf('setStart')}<p class="msg-error mt-2">{msgOf('setStart')}</p>{/if}
			{/if}
		</div>

		<!-- 입금 -->
		<div class="card p-4">
			<h3 class="eyebrow flex items-center gap-1.5">
				<span class="h-2 w-2 rounded-full bg-income"></span> 입금
			</h3>
			<p class="mt-2 font-num text-[22px] leading-none font-semibold text-income tabular-nums">
				+{num(data.incomeTotal)}
			</p>
		</div>

		<!-- 지출 -->
		<div class="card p-4">
			<h3 class="eyebrow flex items-center gap-1.5">
				<span class="h-2 w-2 rounded-full bg-ink"></span> 지출
			</h3>
			<p class="mt-2 font-num text-[22px] leading-none font-semibold tabular-nums">
				-{num(data.spendTotal)}
			</p>
			<p class="tnum mt-1.5 text-[11.5px] text-mute">
				{#if data.fixedTotal > 0}고정 {num(data.fixedTotal)}원 포함{:else}고정지출 없음{/if}
			</p>
		</div>
	</section>

	<!-- 저축 진행 + 고정지출 안내 -->
	{#if hasSaveCard || pendingFixed.length > 0}
		<section class="grid gap-3 {hasSaveCard && pendingFixed.length > 0 ? 'md:grid-cols-2' : ''}">
			{#if hasSaveCard}
				<div class="card flex items-center gap-4 p-4">
					<span
						class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-save-soft text-save"
					>
						<Icon name="target" size={20} />
					</span>
					<div class="min-w-0 flex-1">
						<p class="flex items-baseline justify-between gap-2 text-[13px] font-semibold">
							<span>이번 달 저축</span>
							<span class="font-num text-save tabular-nums">
								{num(data.saveTotal)}{data.monthSaveGoal ? ` / ${num(data.monthSaveGoal)}` : ''}원
							</span>
						</p>
						{#if saveGoalPct !== null}
							<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-save-soft">
								<div class="h-full rounded-full bg-save" style="width: {saveGoalPct}%"></div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
			{#if pendingFixed.length > 0}
				<div class="card flex items-center gap-4 p-4">
					<span
						class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"
					>
						<Icon name="repeat" size={20} />
					</span>
					<div class="min-w-0 flex-1">
						<p class="text-[13px] font-semibold">기록하지 않은 고정지출 {pendingFixed.length}건</p>
						<p class="truncate text-[12px] text-mute">
							{pendingFixed.map((d) => d.name).join(', ')}
						</p>
					</div>
					<form method="POST" action={act('recordAllFixed')} use:enhance>
						<input type="hidden" name="month" value={data.month} />
						<button class="btn btn-sm btn-brand shrink-0">
							<Icon name="check" size={13} /> 한 번에 기록
						</button>
					</form>
				</div>
			{/if}
		</section>
	{/if}

	<div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_372px]">
		<!-- ── 달력 ──────────────────────────────── -->
		<section class="card p-3 sm:p-4" aria-label="{data.monthLabel} 달력">
			<div class="grid grid-cols-7 gap-1 pb-1.5" aria-hidden="true">
				{#each WEEKDAYS as w, i (w)}
					<span
						class="text-center text-[11.5px] font-semibold {i === 0
							? 'text-danger/80'
							: i === 6
								? 'text-brand/80'
								: 'text-mute'}"
					>
						{w}
					</span>
				{/each}
			</div>

			<div class="grid grid-cols-7 gap-1" role="grid">
				{#each weeks as row, ri (ri)}
					{#each row as cell, ci (cell ? cell.date : `empty-${ri}-${ci}`)}
						{#if cell}
							{@const selected = cell.day === data.selectedDay}
							{@const isToday = cell.date === data.today}
							{@const future = cell.date > data.today}
							<a
								href={resolve(`/?m=${data.month}&d=${cell.day}`)}
								data-sveltekit-noscroll
								aria-label="{dayLabel(cell.date)} {weekdayOf(cell.date)}요일{cell.spend > 0
									? `, 지출 ${num(cell.spend)}원`
									: ''}{cell.income > 0 ? `, 입금 ${num(cell.income)}원` : ''}{cell.save > 0
									? `, 저축 ${num(cell.save)}원`
									: ''}"
								aria-current={isToday ? 'date' : undefined}
								class="group flex h-[70px] flex-col rounded-xl p-1 transition-colors sm:h-[96px] sm:p-2 {selected
									? 'bg-brand-soft ring-2 ring-brand'
									: future
										? 'bg-transparent hover:bg-surface-2'
										: 'bg-surface-2/60 hover:bg-surface-2'}"
							>
								<span
									class="grid h-5 min-w-5 place-items-center self-start rounded-full px-1 font-num text-[12px] font-semibold tabular-nums {isToday
										? 'bg-brand text-white'
										: future
											? 'text-faint'
											: 'text-ink'}"
								>
									{cell.day}
								</span>
								<span
									class="mt-auto space-y-px text-right font-num text-[9.5px] leading-tight font-medium tabular-nums sm:text-[11.5px]"
								>
									{#if cell.income > 0}
										<span class="block truncate text-income">+{compact(cell.income)}</span>
									{/if}
									{#if cell.spend > 0}
										<span class="block truncate">-{compact(cell.spend)}</span>
									{/if}
									{#if cell.save > 0}
										<span class="block truncate text-save">{compact(cell.save)}</span>
									{/if}
								</span>
								{#if cell.entries.length > 0}
									<span class="mt-1 flex items-center gap-[3px]" aria-hidden="true">
										{#each dots(cell) as c, i (i)}
											<span class="h-1.5 w-1.5 rounded-full" style="background: {c}"></span>
										{/each}
										{#if cell.fixed > 0}
											<span class="ml-auto h-1.5 w-1.5 rounded-[2px] border border-ink/60"></span>
										{/if}
									</span>
								{/if}
							</a>
						{:else}
							<div class="h-[70px] sm:h-[96px]" aria-hidden="true"></div>
						{/if}
					{/each}
				{/each}
			</div>

			<p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11.5px] text-mute">
				<span class="text-income">+ 입금</span>
				<span>- 지출</span>
				<span class="text-save">저축</span>
				<span class="flex items-center gap-1.5">
					<span class="h-1.5 w-1.5 rounded-full bg-ink/40"></span> 분류별 지출
				</span>
				<span class="flex items-center gap-1.5">
					<span class="h-1.5 w-1.5 rounded-[2px] border border-ink/60"></span> 고정지출
				</span>
			</p>
		</section>

		<!-- ── 선택한 날 ─────────────────────────── -->
		<aside
			bind:this={panelEl}
			class="card scroll-mt-16 overflow-hidden xl:sticky xl:top-16"
			aria-label="선택한 날의 기록"
		>
			<header class="flex items-start justify-between gap-2 border-b border-line px-4 py-3.5">
				<div>
					<h2 class="card-title">
						{dayLabel(data.selectedDate)}
						<span class="ml-0.5 text-[13px] font-medium text-mute"
							>{weekdayOf(data.selectedDate)}요일</span
						>
					</h2>
					<p class="tnum mt-0.5 text-[12px] text-mute">
						{#if dayTotals.spend + dayTotals.income + dayTotals.save === 0}
							기록 없음
						{:else}
							{#if dayTotals.income > 0}<span class="text-income">+{num(dayTotals.income)}</span
								>{/if}
							{#if dayTotals.spend > 0}<span>-{num(dayTotals.spend)}</span>{/if}
							{#if dayTotals.save > 0}<span class="text-save">저축 {num(dayTotals.save)}</span>{/if}
						{/if}
					</p>
				</div>
				{#if selectedIsToday}
					<span class="pill bg-brand-soft text-brand">오늘</span>
				{:else if selectedIsFuture}
					<span class="pill bg-surface-2 text-mute">앞으로 올 날</span>
				{/if}
			</header>

			<!-- 입력 -->
			{#if selectedIsFuture}
				<p class="border-b border-line px-4 py-4 text-[12.5px] leading-relaxed text-mute">
					오늘까지의 날짜에만 기록할 수 있어요.
				</p>
			{:else}
				<form
					method="POST"
					action={act('add')}
					use:enhance={afterAdd}
					class="space-y-3 border-b border-line p-4"
				>
					<input type="hidden" name="date" value={data.selectedDate} />
					<input type="hidden" name="kind" value={formKind} />
					<input type="hidden" name="category" value={formCategory} />

					{@render kindTabs(formKind, setKind, false, false)}

					<label
						class="flex items-baseline gap-1.5 rounded-xl border border-line-strong px-3 py-2 transition focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15"
					>
						<span class="sr-only">금액</span>
						<input
							bind:this={amountEl}
							name="amount"
							value={amtInput}
							oninput={(e) => {
								amtInput = money(e.currentTarget.value);
								e.currentTarget.value = amtInput;
							}}
							inputmode="numeric"
							autocomplete="off"
							placeholder="0"
							class="min-w-0 flex-1 bg-transparent font-num text-[28px] font-semibold tabular-nums outline-none placeholder:text-faint"
						/>
						<span class="text-[14px] text-mute">원</span>
					</label>

					{#if formKind !== 'save'}
						<div class="flex flex-wrap gap-1.5" role="group" aria-label="분류">
							{#each catList(formKind) as c (c.name)}
								<button
									type="button"
									class="chip"
									aria-pressed={formCategory === c.name}
									onclick={() => (pickedCategory = c.name)}
								>
									<span class="h-2 w-2 rounded-full" style="background: {c.color}"></span>
									{c.name}
								</button>
							{/each}
						</div>
					{/if}

					{#if formKind === 'spend'}
						<select name="methodId" bind:value={formMethodId} class="input" aria-label="결제수단">
							<option value="">결제수단 선택 안 함</option>
							{#each data.paymentMethods as m (m.id)}
								<option value={String(m.id)}>{m.name}</option>
							{/each}
						</select>
					{:else if formKind === 'save'}
						<select name="goalId" bind:value={formGoalId} class="input" aria-label="저축 목표">
							<option value="">저축 목표 선택 안 함</option>
							{#each data.savingsGoals as g (g.id)}
								<option value={String(g.id)}>{g.name}</option>
							{/each}
						</select>
					{/if}

					<div class="flex items-center gap-2">
						<input
							name="memo"
							bind:value={memoInput}
							placeholder="메모 (선택)"
							autocomplete="off"
							class="input min-w-0 flex-1"
							aria-label="메모"
						/>
						<button class="btn shrink-0"><Icon name="plus" size={15} /> 기록</button>
					</div>

					<p role="status" class="min-h-[18px] text-[12.5px]">
						{#if addedFlash}
							<span class="inline-flex items-center gap-1 font-semibold text-income">
								<Icon name="check" size={13} /> 기록했어요
							</span>
						{:else if addMsg}
							<span class="font-medium text-danger">{addMsg}</span>
						{/if}
					</p>
				</form>
			{/if}

			<!-- 그날 내역 -->
			<div class="p-2">
				{#if updateMsg}<p class="msg-error m-2">{updateMsg}</p>{/if}
				<ul>
					{#each data.selectedEntries as e (e.id)}
						<li class="rounded-xl">
							{#if editBuf && editBuf.id === e.id}
								<form
									method="POST"
									action={act('update')}
									use:enhance={afterUpdate}
									class="m-1 space-y-2.5 rounded-xl bg-surface-2 p-3"
								>
									<input type="hidden" name="id" value={e.id} />
									<input type="hidden" name="date" value={data.selectedDate} />
									<input type="hidden" name="kind" value={editBuf.kind} />
									{@render kindTabs(editBuf.kind, setEditKind, true, false)}
									<label class="flex items-baseline gap-1.5">
										<span class="sr-only">금액</span>
										<input
											name="amount"
											value={editBuf.amount}
											oninput={(ev) => {
												if (editBuf) editBuf.amount = money(ev.currentTarget.value);
												ev.currentTarget.value = editBuf?.amount ?? '';
											}}
											inputmode="numeric"
											class="input font-num tabular-nums"
										/>
										<span class="text-[13px] text-mute">원</span>
									</label>
									{#if editBuf.kind !== 'save'}
										<select
											name="category"
											bind:value={editBuf.category}
											class="input"
											aria-label="분류"
										>
											{#each catList(editBuf.kind) as c (c.name)}
												<option value={c.name}>{c.name}</option>
											{/each}
										</select>
									{:else}
										<input type="hidden" name="category" value="저축" />
									{/if}
									{#if editBuf.kind === 'spend'}
										<select
											name="methodId"
											bind:value={editBuf.methodId}
											class="input"
											aria-label="결제수단"
										>
											<option value="">결제수단 선택 안 함</option>
											{#each data.paymentMethods as m (m.id)}
												<option value={String(m.id)}>{m.name}</option>
											{/each}
										</select>
									{:else if editBuf.kind === 'save'}
										<select
											name="goalId"
											bind:value={editBuf.goalId}
											class="input"
											aria-label="저축 목표"
										>
											<option value="">저축 목표 선택 안 함</option>
											{#each data.savingsGoals as g (g.id)}
												<option value={String(g.id)}>{g.name}</option>
											{/each}
										</select>
									{/if}
									<input
										name="memo"
										bind:value={editBuf.memo}
										class="input"
										placeholder="메모"
										aria-label="메모"
									/>
									<div class="flex justify-end gap-1.5">
										<button type="button" class="btn-ghost" onclick={() => (editBuf = null)}
											>취소</button
										>
										<button class="btn btn-sm">저장</button>
									</div>
								</form>
							{:else}
								<div
									class="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 hover:bg-surface-2/70"
								>
									<span
										class="h-8 w-1 shrink-0 rounded-full"
										style="background: {colorOf(e)}"
										aria-hidden="true"
									></span>
									<div class="min-w-0 flex-1">
										<p class="truncate text-[14px] leading-tight font-semibold">
											{e.memo || e.category}
										</p>
										<p class="mt-0.5 truncate text-[11.5px] text-mute">
											{e.category}{e.source.startsWith('fixed:') ? ' · 고정' : ''}{e.goalName
												? ` · ${e.goalName}`
												: e.methodName
													? ` · ${e.methodName}`
													: ''}
										</p>
									</div>
									<span
										class="font-num text-[14px] font-semibold tabular-nums {e.kind === 'income'
											? 'text-income'
											: e.kind === 'save'
												? 'text-save'
												: ''}"
									>
										{signed(e.kind === 'spend' ? -e.amount : e.amount)}
									</span>
									<div
										class="flex shrink-0 items-center opacity-100 transition-opacity xl:opacity-0 xl:group-focus-within:opacity-100 xl:group-hover:opacity-100"
									>
										<button class="iconbtn" aria-label="수정" onclick={() => startEdit(e)}>
											<Icon name="edit" size={14} />
										</button>
										<form method="POST" action={act('delete')} use:enhance>
											<input type="hidden" name="id" value={e.id} />
											<button class="iconbtn iconbtn-danger" aria-label="삭제">
												<Icon name="trash" size={14} />
											</button>
										</form>
									</div>
								</div>
							{/if}
						</li>
					{:else}
						<li class="px-3 py-6 text-center text-[13px] text-mute">
							{selectedIsFuture ? '아직 오지 않은 날이에요.' : '이 날의 기록이 아직 없어요.'}
						</li>
					{/each}
				</ul>
			</div>
		</aside>
	</div>
</div>
