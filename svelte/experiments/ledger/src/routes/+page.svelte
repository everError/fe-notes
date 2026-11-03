<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import Icon from '#lib/components/Icon.svelte';
	import SaveProgress from '#lib/components/SaveProgress.svelte';
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
	let startInput = $state('');

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

	const budgetBy = $derived(Object.fromEntries(data.budgets.map((b) => [b.name, b])));
	const selectedBudget = $derived(formKind === 'spend' ? (budgetBy[formCategory] ?? null) : null);

	/** 남은 날 기준 하루·이번 주 사용 가능액 — 이번 달에만 계산한다 */
	const pace = $derived.by(() => {
		if (!data.todayInMonth || data.balance === null) return null;
		const remainingDays = data.daysInMonth - todayDay + 1; // 오늘 포함
		const unrecordedFixed = data.fixedDefs
			.filter((d) => !data.recordedFixedIds.includes(d.id))
			.reduce((sum, d) => sum + d.amount, 0);
		const available = data.balance - unrecordedFixed;
		const daily = Math.floor(available / remainingDays);
		const weekday = new Date(`${data.today}T00:00:00`).getDay();
		const weekDaysLeft = Math.min(7 - weekday, remainingDays); // 오늘부터 토요일까지
		return { remainingDays, unrecordedFixed, available, daily, weekDaysLeft };
	});

	/** 지난달 같은 기간과 비교한 지출 증감 */
	const spendDelta = $derived(
		data.compare.days > 0 ? data.spendTotal - data.compare.prevSpendTotal : null
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
		formGoalId = k === 'save' ? formGoalId || String(data.savingsGoals[0]?.id ?? '') : '';
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
		editBuf.goalId = k === 'save' ? editBuf.goalId || String(data.savingsGoals[0]?.id ?? '') : '';
	}

	function openStart() {
		startInput = data.startAmount === null ? '' : num(data.startAmount);
		startOpen = true;
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
						<button class="btn-ghost" onclick={openStart}>
							<Icon name="edit" size={12} /> 시작금액
						</button>
					{/if}
				</div>
				{#if pace}
					<div class="mt-3 rounded-xl bg-surface-2 px-3 py-2.5 text-[12.5px]">
						{#if pace.available < 0}
							<p class="tnum font-semibold text-danger">
								남은 돈보다 나갈 돈이 {num(-pace.available)}원 많아요
							</p>
						{:else}
							<p class="tnum">
								<span class="text-mute">하루</span>
								<span class="font-num text-[15px] font-bold">{num(Math.max(0, pace.daily))}원</span>
								<span class="text-mute"> · 이번 주 남은 {pace.weekDaysLeft}일 동안</span>
								<span class="font-num text-[15px] font-bold"
									>{num(Math.max(0, pace.daily) * pace.weekDaysLeft)}원</span
								>
							</p>
						{/if}
						<p class="tnum mt-0.5 text-[11.5px] text-mute">
							남은 {pace.remainingDays}일(오늘 포함)
							{#if pace.unrecordedFixed > 0}
								· 아직 기록하지 않은 고정지출 {num(pace.unrecordedFixed)}원 반영
							{/if}
						</p>
					</div>
				{/if}
			{:else}
				<p class="mt-1 font-num text-[30px] leading-none font-semibold text-faint">—</p>
				<p class="mt-2 max-w-sm text-[13px] leading-relaxed text-mute">
					이번 달 시작 금액이 아직 없어요. 월초에 쓸 수 있는 돈을 정해 두면 남은 돈을 계산해 드려요.
				</p>
				{#if !startOpen}
					<div class="mt-3 flex flex-wrap items-center gap-2">
						{#if data.prevBalance !== null}
							<form method="POST" action={act('carryStart')} use:enhance>
								<input type="hidden" name="month" value={data.month} />
								<button class="btn btn-sm btn-brand">
									지난달 남은 돈 {num(Math.max(0, data.prevBalance))}원으로 시작
								</button>
							</form>
						{/if}
						<button class="btn-ghost" onclick={openStart}>직접 정하기</button>
					</div>
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
						bind:value={startInput}
						oninput={() => (startInput = money(startInput))}
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
				{#if data.prevBalance !== null}
					<button
						type="button"
						class="btn-ghost mt-2"
						onclick={() => (startInput = money(String(Math.max(0, data.prevBalance ?? 0))))}
					>
						지난달 남은 돈 {num(Math.max(0, data.prevBalance))}원 넣기
					</button>
				{/if}
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
			{#if spendDelta !== null}
				<p
					class="tnum mt-0.5 text-[11.5px] font-semibold {spendDelta > 0
						? 'text-danger'
						: spendDelta < 0
							? 'text-income'
							: 'text-mute'}"
				>
					지난달 같은 기간보다 {spendDelta === 0
						? '같아요'
						: `${num(Math.abs(spendDelta))}원 ${spendDelta > 0 ? '많아요' : '적어요'}`}
				</p>
			{/if}
		</div>

		<!-- 저축 -->
		<div class="card col-span-2 flex items-start gap-4 p-4">
			<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-save-soft text-save">
				<Icon name="target" size={20} />
			</span>
			<div class="min-w-0 flex-1">
				<SaveProgress saved={data.saveTotal} plan={data.monthSavePlan} />
			</div>
		</div>

		<!-- 고정지출 -->
		<div class="card col-span-2 flex items-center gap-4 p-4">
			<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
				<Icon name="repeat" size={20} />
			</span>
			<div class="min-w-0 flex-1">
				{#if pendingFixed.length > 0}
					<p class="text-[13px] font-semibold">기록하지 않은 고정지출 {pendingFixed.length}건</p>
					<p class="truncate text-[12px] text-mute">{pendingFixed.map((d) => d.name).join(', ')}</p>
				{:else}
					<p class="text-[13px] font-semibold">고정지출 {data.fixedDefs.length}건</p>
					<p class="text-[12px] text-mute">
						{data.fixedDefs.length === 0
							? '관리 화면에서 매달 나가는 돈을 등록해 보세요.'
							: '지정일이 지난 항목은 모두 기록했어요.'}
					</p>
				{/if}
			</div>
			{#if pendingFixed.length > 0}
				<form method="POST" action={act('recordAllFixed')} use:enhance>
					<input type="hidden" name="month" value={data.month} />
					<button class="btn btn-sm btn-brand shrink-0">
						<Icon name="check" size={13} /> 한 번에 기록
					</button>
				</form>
			{/if}
		</div>
	</section>

	<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_344px]">
		<!-- ── 달력 ──────────────────────────────── -->
		<section class="card flex flex-col p-3 sm:p-4" aria-label="{data.monthLabel} 달력">
			<div class="grid grid-cols-7 gap-1.5 pb-2" aria-hidden="true">
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

			<div class="grid flex-1 auto-rows-fr grid-cols-7 gap-1.5" role="grid">
				{#each weeks as row, ri (ri)}
					{#each row as cell, ci (cell ? cell.date : `empty-${ri}-${ci}`)}
						{#if cell}
							{@const selected = cell.day === data.selectedDay}
							{@const isToday = cell.date === data.today}
							{@const future = cell.date > data.today}
							{@const shown = [...cell.entries].sort((a, b) => b.amount - a.amount).slice(0, 3)}
							<a
								href={resolve(`/?m=${data.month}&d=${cell.day}`)}
								data-sveltekit-noscroll
								aria-label="{dayLabel(cell.date)} {weekdayOf(cell.date)}요일{cell.spend > 0
									? `, 지출 ${num(cell.spend)}원`
									: ''}{cell.income > 0 ? `, 입금 ${num(cell.income)}원` : ''}{cell.save > 0
									? `, 저축 ${num(cell.save)}원`
									: ''}{cell.alerts.length > 0
									? `, 예산 경고: ${cell.alerts.map((a) => `${a.category} ${a.level === 'over' ? '초과' : '80% 도달'}`).join(', ')}`
									: ''}"
								aria-current={isToday ? 'date' : undefined}
								class="flex min-h-[72px] min-w-0 flex-col rounded-xl p-1 transition-colors sm:min-h-[128px] sm:p-1.5 {selected
									? 'bg-brand-soft ring-2 ring-brand'
									: future
										? 'bg-transparent ring-1 ring-line ring-inset hover:bg-surface-2'
										: 'bg-surface-2/70 hover:bg-surface-2'}"
							>
								<span class="flex items-center justify-between gap-1">
									<span
										class="grid h-5 min-w-5 place-items-center rounded-full px-1 font-num text-[12px] font-semibold tabular-nums {isToday
											? 'bg-brand text-white'
											: future
												? 'text-faint'
												: 'text-ink'}"
									>
										{cell.day}
									</span>
									<span class="flex items-center gap-1">
										{#if cell.fixed > 0}
											<span
												class="h-1.5 w-1.5 rounded-[2px] border border-ink/60"
												title="고정지출"
												aria-hidden="true"
											></span>
										{/if}
										{#if cell.alerts.length > 0}
											<span
												class="grid h-4 min-w-4 place-items-center rounded-full text-[10px] leading-none font-bold {cell.alerts.some(
													(a) => a.level === 'over'
												)
													? 'bg-danger text-white'
													: 'bg-brand-soft text-brand'}"
												title={cell.alerts
													.map(
														(a) => `${a.category} 예산 ${a.level === 'over' ? '초과' : '80% 도달'}`
													)
													.join(', ')}>!</span
											>
										{/if}
									</span>
								</span>

								<!-- 넓은 화면: 그날 내역을 줄로 -->
								<span class="mt-1 hidden min-w-0 flex-1 flex-col gap-[3px] sm:flex">
									{#each shown as e (e.id)}
										<span
											class="flex min-w-0 items-center justify-between gap-1 rounded-[5px] border-l-[3px] bg-[color-mix(in_srgb,var(--c)_14%,transparent)] py-[2px] pr-1 pl-1 text-[11px] leading-tight"
											style="--c: {colorOf(e)}; border-color: var(--c)"
										>
											<span class="min-w-0 truncate font-medium">{e.memo || e.category}</span>
											<span
												class="shrink-0 font-num tabular-nums {e.kind === 'income'
													? 'text-income'
													: e.kind === 'save'
														? 'text-save'
														: ''}"
											>
												{e.kind === 'spend' ? '-' : e.kind === 'income' ? '+' : ''}{compact(
													e.amount
												)}
											</span>
										</span>
									{/each}
									{#if cell.entries.length > 3}
										<span class="px-1 text-[10.5px] text-mute">외 {cell.entries.length - 3}건</span>
									{/if}
								</span>

								<!-- 좁은 화면: 합계와 분류 점 -->
								<span
									class="mt-auto space-y-px text-right font-num text-[9.5px] leading-tight font-medium tabular-nums sm:hidden"
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
									<span class="mt-1 flex items-center gap-[3px] sm:hidden" aria-hidden="true">
										{#each dots(cell) as c, i (i)}
											<span class="h-1.5 w-1.5 rounded-full" style="background: {c}"></span>
										{/each}
									</span>
								{/if}
							</a>
						{:else}
							<div aria-hidden="true"></div>
						{/if}
					{/each}
				{/each}
			</div>

			<p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11.5px] text-mute">
				<span class="text-income">+ 입금</span>
				<span>- 지출</span>
				<span class="text-save">저축</span>
				<span class="flex items-center gap-1.5">
					<span class="h-1.5 w-1.5 rounded-[2px] border border-ink/60"></span> 고정지출이 있는 날
				</span>
				<span class="flex items-center gap-1.5">
					<span
						class="grid h-4 w-4 place-items-center rounded-full bg-brand-soft text-[10px] font-bold text-brand"
						>!</span
					>
					예산 80% 도달 · <span class="text-danger">초과</span>
				</span>
				<span class="hidden sm:inline">금액이 큰 순서로 3건까지 보여요</span>
			</p>
		</section>

		<!-- ── 선택한 날 ─────────────────────────── -->
		<aside
			bind:this={panelEl}
			class="card scroll-mt-16 overflow-hidden"
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
									{#if formKind === 'spend' && budgetBy[c.name] && budgetBy[c.name].level !== 'ok'}
										<span
											class="rounded-full px-1.5 text-[10.5px] font-bold {budgetBy[c.name].level ===
											'over'
												? 'bg-danger text-white'
												: 'bg-brand-soft text-brand'}"
											title="예산 {budgetBy[c.name].pct}% 사용"
										>
											{budgetBy[c.name].level === 'over' ? '초과' : `${budgetBy[c.name].pct}%`}
										</span>
									{/if}
								</button>
							{/each}
						</div>
						{#if selectedBudget}
							<p
								class="tnum rounded-lg px-3 py-2 text-[12px] {selectedBudget.level === 'over'
									? 'bg-danger-soft text-danger'
									: selectedBudget.level === 'warn'
										? 'bg-brand-soft text-brand'
										: 'bg-surface-2 text-mute'}"
							>
								{selectedBudget.name} 예산 {num(selectedBudget.budget)}원 중 {selectedBudget.pct}%
								사용 ·
								{selectedBudget.level === 'over'
									? `${num(selectedBudget.spent - selectedBudget.budget)}원 초과`
									: `${num(selectedBudget.budget - selectedBudget.spent)}원 남음`}
							</p>
						{/if}
					{/if}

					{#if formKind === 'spend'}
						<select name="methodId" bind:value={formMethodId} class="input" aria-label="결제수단">
							<option value="">결제수단 선택 안 함</option>
							{#each data.paymentMethods as m (m.id)}
								<option value={String(m.id)}>{m.name}</option>
							{/each}
						</select>
					{:else if formKind === 'save'}
						{#if data.savingsGoals.length === 0}
							<p class="msg-error">
								저축은 목표를 정해야 기록할 수 있어요. 관리 화면에서 저축 목표를 먼저 만들어 주세요.
							</p>
						{:else}
							<label class="block">
								<span class="eyebrow mb-1 block">어느 목표에 저축하나요?</span>
								<select name="goalId" bind:value={formGoalId} class="input" required>
									{#each data.savingsGoals as g (g.id)}
										<option value={String(g.id)}>{g.name}</option>
									{/each}
								</select>
							</label>
						{/if}
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
											required
										>
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
