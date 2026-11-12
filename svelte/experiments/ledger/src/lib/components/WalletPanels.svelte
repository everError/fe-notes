<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import { cycleText, md, num, signed } from '#lib/format';
	import type { MonthData } from '#lib/types';

	/**
	 * 통장·카드 패널 — 결제 계획, 월초 잔액 기록, 통장 목록, 카드별 청구·결제·금액 맞추기.
	 * 액션은 act(이름)으로 만든 주소로 보낸다(지금 보고 있는 화면의 액션).
	 */
	let {
		data,
		form,
		act,
		startEditing = false
	}: {
		data: MonthData;
		form: unknown;
		act: (name: string) => string;
		startEditing?: boolean;
	} = $props();

	const msgOf = (where: string) => {
		const f = form as { where?: unknown; message?: unknown } | null | undefined;
		return f && f.where === where && typeof f.message === 'string' ? f.message : null;
	};

	let startOpen = $state(false);
	let balInputs = $state<Record<number, string>>({});
	let payCardId = $state<number | null>(null);
	let adjCardId = $state<number | null>(null); // 금액 맞추기 폼이 열린 카드
	let adjTarget = $state(''); // 명세서에 찍힌 이번 결제 금액
	let adjMemo = $state('');
	let payAmount = $state('');
	let payAccountId = $state('');

	/* 달이 바뀌면 열린 폼을 닫는다 */
	let shownMonth = '';
	$effect(() => {
		if (data.month === shownMonth) return;
		shownMonth = data.month;
		payCardId = null;
		adjCardId = null;
		startOpen = false;
	});

	onMount(() => {
		if (startEditing) openStart();
	});

	function openStart() {
		balInputs = Object.fromEntries([
			...data.accountBalances.map((a) => [a.id, num(a.amount)]),
			...data.cardDebts.map((c) => [c.id, num(c.start)])
		]);
		startOpen = true;
	}

	function openAdj(c: { id: number; bill: { dueRaw: number } }) {
		adjCardId = adjCardId === c.id ? null : c.id;
		payCardId = null;
		adjTarget = num(Math.max(0, c.bill.dueRaw));
		adjMemo = '';
	}

	const adjValue = $derived(adjTarget.trim() === '' ? null : Number(adjTarget.replace(/[^d]/g, '')));

	/** 카드대금 결제 폼 열기 — 금액은 이번 결제 예정액(없으면 전체 미결제)으로 채워 둔다 */
	function openPay(c: { id: number; owed: number; bill: { due: number } }) {
		payCardId = payCardId === c.id ? null : c.id;
		adjCardId = null;
		const amount = c.bill.due > 0 ? c.bill.due : c.owed;
		payAmount = amount > 0 ? num(amount) : '';
		payAccountId = String(data.accountBalances[0]?.id ?? '');
	}

	const accountTotal = $derived(data.accountBalances.reduce((sum, a) => sum + a.current, 0));
	const cardOwedTotal = $derived(data.cardDebts.reduce((sum, c) => sum + c.owed, 0));
	const planMonth = $derived(
		data.cardDebts.filter((c) => c.bill.due > 0).map((c) => c.bill.month).sort()[0] ?? null
	);
	/** 가장 먼저 돌아오는 결제 달의 카드대금 합계 */
	const dueTotal = $derived(
		data.cardDebts.filter((c) => c.bill.month === planMonth).reduce((sum, c) => sum + c.bill.due, 0)
	);
	/** 결제일 순으로 카드대금을 낼 때 통장에 남는 금액 */
	const payPlan = $derived.by(() => {
		let rest = accountTotal;
		return data.cardDebts
			.filter((c) => c.bill.due > 0)
			.sort((a, b) =>
				`${a.bill.month}-${String(a.payDay ?? 99).padStart(2, '0')}`.localeCompare(
					`${b.bill.month}-${String(b.payDay ?? 99).padStart(2, '0')}`
				)
			)
			.map((c) => {
				rest -= c.bill.due;
				return { c, after: rest };
			});
	});

	/** 결제 날짜 — 오늘(지난 달이면 그 달 말일) */
	const payDate = $derived(
		data.today.startsWith(data.month)
			? data.today
			: (data.byDay[data.byDay.length - 1]?.date ?? data.today)
	);

	/** 숫자만 남기고 천 단위 쉼표를 붙인다 */
	const money = (raw: string) => {
		const digits = raw.replace(/[^d]/g, '');
		return digits ? num(Number(digits)) : '';
	};
</script>

<div class="space-y-4">
<!-- ── 통장 · 카드 ───────────────────────────── -->
{#if startOpen}
	<section class="card p-4 sm:p-5" aria-label="통장 잔액 기록">
		<h2 class="card-title">통장 잔액 기록</h2>
		<p class="mt-0.5 text-[12px] text-mute">
			{data.monthLabel} 시작 때 가지고 있던 금액이에요. 이전 달에서 이어진 값이 채워져 있고, 실제와 다르면 고쳐 주세요.
		</p>
		<form
			method="POST"
			action={act('setStart')}
			use:enhance={() => {
				return async ({ result, update }) => {
					await update({ reset: false });
					if (result.type === 'success') startOpen = false;
				};
			}}
			class="mt-3 grid gap-x-8 gap-y-2 md:grid-cols-2"
		>
			<input type="hidden" name="month" value={data.month} />
			<div class="space-y-2">
				<h3 class="eyebrow">통장</h3>
				{#each data.accountBalances as a (a.id)}
					<label class="flex items-center gap-3">
						<span class="min-w-0 flex-1 truncate text-[13px] font-semibold">{a.name}</span>
						<span class="relative w-44">
							<input
								name="bal_{a.id}"
								bind:value={balInputs[a.id]}
								oninput={() => (balInputs[a.id] = money(balInputs[a.id] ?? ''))}
								inputmode="numeric"
								placeholder="0"
								class="input pr-8 text-right font-num tabular-nums"
								aria-label="{a.name} 잔액"
							/>
							<span
								class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-mute"
								>원</span
							>
						</span>
					</label>
				{/each}
			</div>
			<div class="space-y-2">
				<h3 class="eyebrow">카드 · 아직 결제하지 않은 금액</h3>
				{#each data.cardDebts as c (c.id)}
					<label class="flex items-center gap-3">
						<span class="min-w-0 flex-1 truncate text-[13px] font-semibold">{c.name}</span>
						<span class="relative w-44">
							<input
								name="bal_{c.id}"
								bind:value={balInputs[c.id]}
								oninput={() => (balInputs[c.id] = money(balInputs[c.id] ?? ''))}
								inputmode="numeric"
								placeholder="0"
								class="input pr-8 text-right font-num tabular-nums"
								aria-label="{c.name} 월초 미결제 금액"
							/>
							<span
								class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-mute"
								>원</span
							>
						</span>
					</label>
				{:else}
					<p class="text-[12.5px] text-mute">등록된 카드가 없어요.</p>
				{/each}
			</div>
			<div class="flex items-center justify-end gap-1.5 md:col-span-2">
				{#if msgOf('setStart')}<p class="msg-error mr-auto">{msgOf('setStart')}</p>{/if}
				<button type="button" class="btn-ghost" onclick={() => (startOpen = false)}>취소</button>
				<button class="btn btn-sm">저장</button>
			</div>
		</form>
	</section>
{/if}

{#if !startOpen && data.cardDebts.length > 0 && data.accountBalances.length > 0}
	<section class="card p-4 sm:p-5" aria-label="카드대금 결제 계획">
		<header class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="card-title">카드대금 결제 계획</h2>
			<a class="btn-ghost" href={resolve('/assets')}>전체 일정 보기</a>
		</header>
		<div class="mt-3 grid gap-2.5 sm:grid-cols-3">
			<div class="rounded-xl bg-surface-2 px-3.5 py-3">
				<p class="eyebrow">지금 통장 합계</p>
				<p class="tnum font-num text-[20px] leading-tight font-semibold">{num(accountTotal)}원</p>
			</div>
			<div class="rounded-xl bg-brand-soft px-3.5 py-3">
				<p class="text-[12px] font-bold text-brand">
					{planMonth ? `${Number(planMonth.slice(5))}월 ` : ''}결제 예정 합계
				</p>
				<p class="tnum font-num text-[20px] leading-tight font-semibold">{num(dueTotal)}원</p>
			</div>
			<div
				class="rounded-xl px-3.5 py-3 {accountTotal - dueTotal < 0 ? 'bg-danger-soft' : 'bg-income-soft'}"
			>
				<p class="text-[12px] font-bold {accountTotal - dueTotal < 0 ? 'text-danger' : 'text-income'}">
					결제하고 남는 통장
				</p>
				<p
					class="tnum font-num text-[20px] leading-tight font-semibold {accountTotal - dueTotal < 0
						? 'text-danger'
						: ''}"
				>
					{num(accountTotal - dueTotal)}원
				</p>
				{#if accountTotal - dueTotal < 0}
					<p class="tnum text-[11px] font-semibold text-danger">{num(dueTotal - accountTotal)}원 모자라요</p>
				{/if}
			</div>
		</div>
		{#if payPlan.length > 0}
			<ol class="mt-3 divide-y divide-line rounded-xl border border-line">
				{#each payPlan as p (p.c.id)}
					<li class="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
						<span class="pill shrink-0 bg-brand-soft text-brand">
							{Number(p.c.bill.month.slice(5))}월{p.c.payDay ? ` ${p.c.payDay}일` : ''}
						</span>
						<span class="min-w-0 flex-1 truncate font-semibold">{p.c.name}</span>
						<span class="tnum font-num font-semibold">{num(p.c.bill.due)}원</span>
						<span
							class="tnum hidden w-40 shrink-0 text-right text-[12px] sm:block {p.after < 0
								? 'font-semibold text-danger'
								: 'text-mute'}"
						>
							결제 후 통장 {num(p.after)}원
						</span>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="mt-3 text-[12.5px] text-mute">이번에 낼 카드대금이 없어요.</p>
		{/if}
		<p class="mt-2 text-[11.5px] text-mute">앞으로 들어올 입금은 넣지 않고, 지금 통장 합계 기준이에요.</p>
	</section>
{/if}

{#if !startOpen && (data.accountBalances.length > 0 || data.cardDebts.length > 0)}
	<section class="space-y-4" aria-label="통장과 카드">
		{#if data.accountBalances.length > 0}
			<!-- 통장 -->
			<div class="card overflow-hidden">
				<header
					class="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-income-soft/60 px-4 py-3 sm:px-5"
				>
					<div class="flex items-center gap-2.5">
						<span class="grid h-8 w-8 place-items-center rounded-lg bg-income-soft text-income">
							<Icon name="wallet" size={17} />
						</span>
						<h2 class="card-title">통장</h2>
					</div>
					<div class="flex items-center gap-3">
						<p class="tnum text-right text-[12px] text-mute">
							합계
							<b
								class="font-num text-[17px] font-semibold {accountTotal < 0
									? 'text-danger'
									: 'text-ink'}">{num(accountTotal)}원</b
							>
						</p>
						<button class="btn-ghost" onclick={openStart}>
							<Icon name="edit" size={12} /> 잔액 기록
						</button>
					</div>
				</header>
				<ul class="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
					{#each data.accountBalances as a (a.id)}
						{@const delta = a.current - a.amount}
						<li class="flex flex-col justify-between gap-2 bg-surface px-4 py-3.5">
							<p class="truncate text-[13.5px] font-bold">{a.name}</p>
							<div>
								<p
									class="tnum font-num text-[21px] leading-tight font-semibold {a.current < 0
										? 'text-danger'
										: ''}"
								>
									{num(a.current)}<span class="ml-0.5 text-[12px] font-normal text-mute">원</span>
								</p>
								<p class="tnum mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-mute">
									<span>월초 {num(a.amount)}</span>
									<span
										class="font-semibold {delta > 0
											? 'text-income'
											: delta < 0
												? 'text-danger'
												: ''}">이번 달 {signed(delta)}</span
									>
									{#if a.current < 0}
										<span class="pill bg-danger-soft text-danger">잔액 부족</span>
									{/if}
								</p>
							</div>
						</li>
					{/each}
				</ul>
				{#if data.unassignedNet !== 0}
					<p
						class="tnum border-t border-line bg-surface-2/60 px-4 py-2.5 text-[12px] text-mute sm:px-5"
					>
						통장을 지정하지 않은 내역·저축 누적
						<span class="font-num font-semibold text-ink">{signed(data.unassignedNet)}원</span>
					</p>
				{/if}
			</div>
		{/if}

		{#if data.cardDebts.length > 0}
			<!-- 카드 -->
			<div class="card overflow-hidden">
				<header
					class="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-brand-soft/60 px-4 py-3 sm:px-5"
				>
					<div class="flex items-center gap-2.5">
						<span class="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">
							<Icon name="spend" size={17} />
						</span>
						<h2 class="card-title">카드</h2>
					</div>
					<p class="tnum text-right text-[12px] text-mute">
						전체 미결제
						<b class="font-num text-[17px] font-semibold text-ink">{num(cardOwedTotal)}원</b>
					</p>
				</header>

				<ul class="grid items-stretch gap-3 p-3 sm:p-4 md:grid-cols-2 2xl:grid-cols-3">
					{#each data.cardDebts as c (c.id)}
						{@const pp = payPlan.find((x) => x.c.id === c.id)}
						<li class="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface">
							<!-- 이름 · 버튼 -->
							<div class="flex items-start justify-between gap-2 border-b border-line px-3.5 py-3">
								<div class="min-w-0">
									<p class="truncate text-[14.5px] font-bold">{c.name}</p>
									<p class="mt-0.5 text-[11.5px] leading-snug text-mute">
										{cycleText(c.cycleStart, c.payDay)}
									</p>
								</div>
								<div class="flex shrink-0 gap-1.5">
									<button class="btn-ghost" onclick={() => openAdj(c)}>금액 맞추기</button>
									<button
										class="btn-ghost"
										disabled={c.owed <= 0 || data.accountBalances.length === 0}
										onclick={() => openPay(c)}
									>
										결제
									</button>
								</div>
							</div>

							<!-- 이번 결제 / 다음 결제 -->
							<div class="space-y-2 px-3.5 pt-3">
								<div class="rounded-lg bg-brand-soft px-3 py-2.5">
									<div class="flex items-baseline justify-between gap-2">
										<p class="text-[12px] font-bold text-brand">
											이번 결제 · {Number(c.bill.month.slice(5))}월{c.payDay ? ` ${c.payDay}일` : ''}
										</p>
										<p class="tnum font-num text-[21px] leading-none font-semibold">
											{num(c.bill.due)}<span class="ml-0.5 text-[12px] font-normal text-mute">원</span>
										</p>
									</div>
									<p class="tnum mt-1 text-[11.5px] text-mute">
										{md(c.bill.periodFrom)} ~ {md(c.bill.periodTo)} 사용분
									</p>
									{#if pp}
										<p
											class="tnum mt-1.5 flex items-baseline justify-between gap-2 border-t border-brand/15 pt-1.5 text-[12px]"
										>
											<span class="text-mute">결제하고 남는 통장</span>
											<span
												class="font-num font-semibold {pp.after < 0 ? 'text-danger' : 'text-ink'}"
											>
												{num(pp.after)}원
											</span>
										</p>
									{/if}
								</div>
								<div class="rounded-lg bg-surface-2 px-3 py-2.5">
									<div class="flex items-baseline justify-between gap-2">
										<p class="text-[12px] font-bold text-mute">
											다음 결제 · {Number(c.bill.nextMonth.slice(5))}월{c.payDay
												? ` ${c.payDay}일`
												: ''}
										</p>
										<p class="tnum font-num text-[16px] leading-none font-semibold">
											{num(c.bill.next)}<span class="ml-0.5 text-[11px] font-normal text-mute">원</span>
										</p>
									</div>
									<p class="tnum mt-1 text-[11.5px] text-mute">
										{md(c.bill.nextFrom)} ~ {md(c.bill.nextTo)} 사용분
									</p>
								</div>
							</div>

							<!-- 구성 -->
							<div class="tnum mt-auto flex flex-wrap items-center gap-1.5 px-3.5 pt-3">
								<span class="pill bg-surface-2 text-ink">사용 {num(c.bill.usage)}</span>
								{#if c.bill.installment > 0}
									<span class="pill bg-save-soft text-save">할부 {num(c.bill.installment)}</span>
								{/if}
								{#if c.bill.carry > 0}
									<span class="pill bg-surface-2 text-mute">이월 {num(c.bill.carry)}</span>
								{/if}
								{#if c.bill.adjust !== 0}
									<span
										class="pill {c.bill.adjust > 0
											? 'bg-danger-soft text-danger'
											: 'bg-income-soft text-income'}"
									>
										명세서 조정 {signed(c.bill.adjust)}
									</span>
								{/if}
								{#if c.bill.paid > 0}
									<span class="pill bg-income-soft text-income">결제함 −{num(c.bill.paid)}</span>
								{/if}
								{#if c.bill.installLeft > 0}
									<span class="pill border border-save/30 text-save">
										남은 할부 {num(c.bill.installLeft)}
									</span>
								{/if}
							</div>

							<!-- 맞추기 폼 -->
							{#if adjCardId === c.id}
								<form
									method="POST"
									action={act('adjustCard')}
									use:enhance={() => {
										return async ({ result, update }) => {
											await update({ reset: false });
											if (result.type === 'success') adjCardId = null;
										};
									}}
									class="mx-3.5 mt-3 space-y-2 rounded-lg border border-line bg-surface-2 p-3"
								>
									<input type="hidden" name="cardId" value={c.id} />
									<input type="hidden" name="date" value={payDate} />
									<p class="text-[12px] leading-relaxed text-mute">
										카드사 명세서에 찍힌 <b class="text-ink">이번 결제 금액</b>을 그대로 입력하세요. 지금 계산된
										금액과의 차이를 알아서 맞춰 드려요.
									</p>
									<label class="block">
										<span class="eyebrow mb-1 block">명세서 금액</span>
										<span class="relative block">
											<input
												name="target"
												bind:value={adjTarget}
												oninput={() => (adjTarget = money(adjTarget))}
												inputmode="numeric"
												autocomplete="off"
												class="input pr-8 text-right font-num text-[17px] font-semibold tabular-nums"
												aria-label="명세서에 찍힌 이번 결제 금액"
											/>
											<span
												class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-mute"
												>원</span
											>
										</span>
									</label>
									{#if adjValue !== null}
										{@const diff = adjValue - c.bill.dueRaw}
										<div
											class="tnum flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[12.5px] {diff >
											0
												? 'bg-danger-soft text-danger'
												: diff < 0
													? 'bg-income-soft text-income'
													: 'bg-surface text-mute'}"
										>
											<span>지금 {num(Math.max(0, c.bill.dueRaw))}원 → {num(adjValue)}원</span>
											<b class="font-num">
												{diff === 0 ? '차이 없음' : `${signed(diff)}원 ${diff > 0 ? '늘어요' : '줄어요'}`}
											</b>
										</div>
									{/if}
									<input
										name="memo"
										bind:value={adjMemo}
										placeholder="메모 (선택 · 예: 누락 결제, 할인)"
										class="input"
										aria-label="메모"
									/>
									{#if c.bill.dueRaw < 0}
										<p class="text-[11.5px] leading-relaxed text-mute">
											미리 낸 {num(-c.bill.dueRaw)}원이 있어서, 그만큼 더 늘려서 맞춰요.
										</p>
									{/if}
									{#if msgOf('adjustCard')}<p class="msg-error">{msgOf('adjustCard')}</p>{/if}
									<div class="flex justify-end gap-1.5">
										<button type="button" class="btn-ghost" onclick={() => (adjCardId = null)}>취소</button>
										<button class="btn btn-sm" disabled={adjValue === null || adjValue === c.bill.dueRaw}>
											이 금액으로 맞추기
										</button>
									</div>
								</form>
							{/if}

							<!-- 결제 폼 -->
							{#if payCardId === c.id}
								<form
									method="POST"
									action={act('payCard')}
									use:enhance={() => {
										return async ({ result, update }) => {
											await update({ reset: false });
											if (result.type === 'success') payCardId = null;
										};
									}}
									class="mx-3.5 mt-3 space-y-2 rounded-lg border border-line bg-surface-2 p-3"
								>
									<input type="hidden" name="cardId" value={c.id} />
									<input type="hidden" name="date" value={payDate} />
									<label class="block">
										<span class="eyebrow mb-1 block">어느 통장에서 내나요?</span>
										<select
											name="accountId"
											bind:value={payAccountId}
											class="input"
											aria-label="결제할 통장"
										>
											{#each data.accountBalances as a (a.id)}
												<option value={String(a.id)}>{a.name} · {num(a.current)}원</option>
											{/each}
										</select>
									</label>
									<label class="block">
										<span class="eyebrow mb-1 block">결제 금액 (일부만 내도 돼요)</span>
										<span class="relative block">
											<input
												name="amount"
												bind:value={payAmount}
												oninput={() => (payAmount = money(payAmount))}
												inputmode="numeric"
												class="input pr-8 text-right font-num text-[17px] font-semibold tabular-nums"
												aria-label="결제 금액"
											/>
											<span
												class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-mute"
												>원</span
											>
										</span>
									</label>
									<div class="flex justify-end gap-1.5">
										<button type="button" class="btn-ghost" onclick={() => (payCardId = null)}>취소</button>
										<button class="btn btn-sm">결제</button>
									</div>
								</form>
							{/if}

							<!-- 전체 미결제 -->
							<div
								class="tnum mt-3 flex items-center justify-between gap-2 border-t border-line bg-surface-2/50 px-3.5 py-2.5 text-[12px]"
							>
								<span class="text-mute">전체 미결제 (남은 할부 포함)</span>
								<span class="font-num text-[14px] font-semibold">{num(c.owed)}원</span>
							</div>
						</li>
					{/each}
				</ul>

				{#if msgOf('payCard') || msgOf('deleteCardPayment') || msgOf('deleteCardAdjustment')}
					<p class="msg-error mx-3 mb-3 sm:mx-4">
						{msgOf('payCard') ?? msgOf('deleteCardPayment') ?? msgOf('deleteCardAdjustment')}
					</p>
				{/if}
				{#if data.cardAdjustments.length > 0}
					<div class="border-t border-line bg-surface-2/60 px-4 py-2.5 sm:px-5">
						<p class="eyebrow mb-1">이번 달 카드 금액 조정</p>
						<ul class="text-[12px] text-mute">
							{#each data.cardAdjustments as j (j.id)}
								<li class="tnum flex items-center justify-between gap-2 py-0.5">
									<span class="min-w-0 flex-1 truncate">
										{md(j.date)} · {j.cardName}{j.memo ? ` · ${j.memo}` : ''}
									</span>
									<span
										class="font-num font-semibold tabular-nums {j.amount > 0
											? 'text-danger'
											: 'text-income'}">{signed(j.amount)}원</span
									>
									<form method="POST" action={act('deleteCardAdjustment')} use:enhance>
										<input type="hidden" name="id" value={j.id} />
										<button class="iconbtn iconbtn-danger !h-7 !w-7" aria-label="카드 금액 조정 삭제"
											><Icon name="trash" size={12} /></button
										>
									</form>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if data.cardPayments.length > 0}
					<div class="border-t border-line bg-surface-2/60 px-4 py-2.5 sm:px-5">
						<p class="eyebrow mb-1">이번 달 카드대금 결제</p>
						<ul class="text-[12px] text-mute">
							{#each data.cardPayments as p (p.id)}
								<li class="tnum flex items-center justify-between gap-2 py-0.5">
									<span class="min-w-0 flex-1 truncate">
										{md(p.date)} · {p.accountName} → {p.cardName}
									</span>
									<span class="font-num font-semibold text-ink tabular-nums">{num(p.amount)}원</span>
									<form method="POST" action={act('deleteCardPayment')} use:enhance>
										<input type="hidden" name="id" value={p.id} />
										<button class="iconbtn iconbtn-danger !h-7 !w-7" aria-label="카드대금 결제 기록 삭제"
											><Icon name="trash" size={12} /></button
										>
									</form>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}
	</section>
{/if}
</div>
