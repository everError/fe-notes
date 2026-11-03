<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import BalanceChart from '#lib/components/BalanceChart.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { monthsBetween, num } from '#lib/format';

	let { data, form }: PageProps = $props();

	const todayMonth = $derived(data.today.slice(0, 7));
	const todayDay = $derived(Number(data.today.slice(8, 10)));
	const isPast = $derived(data.month < todayMonth);
	const isFuture = $derived(data.month > todayMonth);

	/** 지금까지 지나온 날 수 */
	const elapsed = $derived(data.todayInMonth ? todayDay : isPast ? data.daysInMonth : 0);

	const variableSpend = $derived(data.spendTotal - data.fixedTotal);
	const dailyAvg = $derived(elapsed > 0 ? Math.round(variableSpend / elapsed) : null);

	/** 남은 날에도 같은 속도로 쓰고, 아직 기록하지 않은 고정지출이 나간다고 가정한 월말 예상 잔액 */
	const projected = $derived.by(() => {
		if (!data.todayInMonth || data.balance === null || dailyAvg === null) return null;
		const remainingDays = data.daysInMonth - todayDay;
		const unrecordedFixed = data.fixedDefs
			.filter((d) => !data.recordedFixedIds.includes(d.id))
			.reduce((s, d) => s + d.amount, 0);
		return data.balance - dailyAvg * remainingDays - unrecordedFixed;
	});

	/** 월말 카드에 보일 값 — 지난 달은 확정 잔액, 이번 달은 예상 잔액 */
	const endValue = $derived(isPast ? data.balance : projected);

	const top = $derived(data.byCategory[0] ?? null);

	/* 분류 도넛 */
	const R = 54;
	const C = 2 * Math.PI * R;
	const slices = $derived.by(() => {
		let offset = 0;
		return data.byCategory.map((c) => {
			const frac = data.spendTotal > 0 ? c.amount / data.spendTotal : 0;
			const s = { ...c, frac, dash: frac * C, offset };
			offset += frac * C;
			return s;
		});
	});

	const methodMax = $derived(Math.max(1, ...data.byMethod.map((m) => m.amount)));
	const methodTotal = $derived(data.byMethod.reduce((s, m) => s + m.amount, 0));
	const unassigned = $derived(Math.max(0, data.spendTotal - methodTotal));

	const goalHint = (g: (typeof data.savingsGoals)[number]) => {
		const left = Math.max(0, g.targetAmount - g.saved);
		if (left === 0) return '목표를 달성했어요';
		const months = monthsBetween(todayMonth, g.endMonth) + 1;
		if (months <= 0) return `기한(${g.endMonth})이 지났어요 · ${num(left)}원 남음`;
		return `${g.endMonth}까지 매달 약 ${num(Math.ceil(left / months))}원`;
	};

	const saveGoalMsg = $derived(
		form?.where === 'setSaveGoal' && 'message' in form && typeof form.message === 'string'
			? form.message
			: null
	);
	let editGoal = $state(false);
</script>

<svelte:head>
	<title>분석 — {data.monthLabel}</title>
</svelte:head>

<div class="space-y-4 pt-1">
	<!-- 핵심 지표 -->
	<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="핵심 지표">
		<div class="card p-4">
			<h2 class="eyebrow">하루 평균 지출</h2>
			<p class="mt-2 font-num text-[22px] leading-none font-semibold tabular-nums">
				{dailyAvg === null ? '—' : `${num(dailyAvg)}원`}
			</p>
			<p class="mt-1.5 text-[11.5px] text-mute">고정지출 제외</p>
		</div>
		<div class="card p-4">
			<h2 class="eyebrow">{isPast ? '월말 잔액' : '월말 예상 잔액'}</h2>
			<p
				class="mt-2 font-num text-[22px] leading-none font-semibold tabular-nums {endValue !==
					null && endValue < 0
					? 'text-danger'
					: ''}"
			>
				{endValue === null ? '—' : `${num(endValue)}원`}
			</p>
			<p class="mt-1.5 text-[11.5px] text-mute">
				{isPast ? '그 달의 마지막 잔액' : '지금 속도로 쓰고 남은 고정지출이 나가면'}
			</p>
		</div>
		<div class="card p-4">
			<h2 class="eyebrow">가장 많이 쓴 분류</h2>
			<p class="mt-2 flex items-center gap-2 text-[22px] leading-none font-semibold">
				{#if top}
					<span class="h-3 w-3 rounded-full" style="background: {top.color}"></span>
					{top.name}
				{:else}
					—
				{/if}
			</p>
			<p class="tnum mt-1.5 text-[11.5px] text-mute">
				{top
					? `${num(top.amount)}원 · 전체의 ${Math.round((top.amount / data.spendTotal) * 100)}%`
					: '지출 기록 없음'}
			</p>
		</div>
		<div class="card p-4">
			<h2 class="eyebrow">고정지출 비중</h2>
			<p class="mt-2 font-num text-[22px] leading-none font-semibold tabular-nums">
				{data.spendTotal > 0 ? `${Math.round((data.fixedTotal / data.spendTotal) * 100)}%` : '—'}
			</p>
			<p class="tnum mt-1.5 text-[11.5px] text-mute">{num(data.fixedTotal)}원</p>
		</div>
	</section>

	<!-- 남은 돈 변화 -->
	<section class="card p-4 sm:p-5" aria-label="남은 돈 변화">
		<header class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="card-title">남은 돈 변화</h2>
			<p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-mute">
				<span class="flex items-center gap-1.5">
					<span class="h-0.5 w-4 rounded bg-brand"></span> 지나온 날
				</span>
				<span class="flex items-center gap-1.5">
					<span class="h-2 w-2 rounded-full border-[1.5px] border-ink bg-surface"></span>
					고정지출이 나간 날
				</span>
				<span class="flex items-center gap-1.5">
					<span class="h-0 w-4 border-t-2 border-dotted border-faint"></span> 오늘 잔액 유지
				</span>
			</p>
		</header>
		{#if isFuture}
			<p class="py-10 text-center text-[13px] text-mute">아직 오지 않은 달이에요.</p>
		{:else}
			<div class="mt-3">
				<BalanceChart
					route={data.route}
					startAmount={data.startAmount}
					today={data.today}
					daysInMonth={data.daysInMonth}
				/>
			</div>
			{#if data.startAmount === null}
				<p class="mt-2 text-[12px] text-mute">
					가계부 화면에서 시작금액을 정하면 이 그래프의 기준선이 생겨요.
				</p>
			{/if}
		{/if}
	</section>

	<div class="grid items-start gap-4 lg:grid-cols-2">
		<!-- 분류별 지출 -->
		<section class="card p-4 sm:p-5" aria-label="분류별 지출">
			<header class="flex items-baseline justify-between">
				<h2 class="card-title">분류별 지출</h2>
				<span class="font-num text-[13px] text-mute tabular-nums">{num(data.spendTotal)}원</span>
			</header>
			{#if data.byCategory.length === 0}
				<p class="py-8 text-center text-[13px] text-mute">이 달에 기록된 지출이 없어요.</p>
			{:else}
				<div class="mt-4 flex flex-col items-center gap-5 sm:flex-row">
					<svg
						viewBox="0 0 140 140"
						class="h-36 w-36 shrink-0 -rotate-90"
						role="img"
						aria-label="분류별 지출 비율"
					>
						<circle
							cx="70"
							cy="70"
							r={R}
							fill="none"
							stroke="var(--color-surface-2)"
							stroke-width="16"
						/>
						{#each slices as s (s.name)}
							<circle
								cx="70"
								cy="70"
								r={R}
								fill="none"
								stroke={s.color}
								stroke-width="16"
								stroke-dasharray="{Math.max(s.dash - 1.5, 0)} {C}"
								stroke-dashoffset={-s.offset}
							/>
						{/each}
					</svg>
					<ul class="w-full min-w-0 flex-1 space-y-2.5">
						{#each data.byCategory as c (c.name)}
							<li class="flex items-center gap-2.5 text-[13px]">
								<span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background: {c.color}"
								></span>
								<span class="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
								<span class="font-num text-mute tabular-nums">
									{Math.round((c.amount / data.spendTotal) * 100)}%
								</span>
								<span class="w-[84px] text-right font-num font-semibold tabular-nums"
									>{num(c.amount)}</span
								>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</section>

		<!-- 결제수단별 지출 -->
		<section class="card p-4 sm:p-5" aria-label="결제수단별 지출">
			<header class="flex items-baseline justify-between">
				<h2 class="card-title">결제수단별 지출</h2>
				<span class="font-num text-[13px] text-mute tabular-nums">{num(methodTotal)}원</span>
			</header>
			{#if data.byMethod.length === 0}
				<p class="py-8 text-center text-[13px] text-mute">결제수단이 지정된 지출이 없어요.</p>
			{:else}
				<ul class="mt-4 space-y-4">
					{#each data.byMethod as m (m.id)}
						<li>
							<div class="flex items-baseline justify-between gap-2 text-[13px]">
								<span class="flex items-center gap-2 font-semibold">
									{m.name}
									<span class="pill bg-surface-2 text-mute"
										>{m.kind === 'card' ? '카드' : '통장'}</span
									>
								</span>
								<span class="font-num font-semibold tabular-nums">{num(m.amount)}원</span>
							</div>
							<div class="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
								<div
									class="h-full rounded-full {m.kind === 'card' ? 'bg-brand' : 'bg-ink/70'}"
									style="width: {(m.amount / methodMax) * 100}%"
								></div>
							</div>
						</li>
					{/each}
				</ul>
				{#if unassigned > 0}
					<p class="tnum mt-4 text-[12px] text-mute">
						결제수단을 지정하지 않은 지출 {num(unassigned)}원
					</p>
				{/if}
			{/if}
		</section>
	</div>

	<!-- 저축 -->
	<section class="card p-4 sm:p-5" aria-label="저축">
		<header class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="card-title">저축</h2>
			<div class="flex items-center gap-2 text-[13px]">
				{#if editGoal}
					<form
						method="POST"
						action="?/setSaveGoal&m={data.month}"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update({ reset: false });
								if (result.type === 'success') editGoal = false;
							};
						}}
						class="flex items-center gap-2"
					>
						<input type="hidden" name="month" value={data.month} />
						<input
							name="amount"
							value={data.monthSaveGoal ?? ''}
							inputmode="numeric"
							placeholder="비우면 해제"
							class="input w-40 font-num tabular-nums"
							aria-label="이번 달 저축 목표"
						/>
						<button class="btn btn-sm">저장</button>
						<button type="button" class="btn-ghost" onclick={() => (editGoal = false)}>취소</button>
					</form>
				{:else}
					<span class="tnum text-mute">
						{data.monthLabel} 저축 {num(data.saveTotal)}원{data.monthSaveGoal !== null
							? ` / 목표 ${num(data.monthSaveGoal)}원`
							: ''}
					</span>
					<button class="btn-ghost" onclick={() => (editGoal = true)}>
						<Icon name="edit" size={12} /> 월 목표
					</button>
				{/if}
			</div>
		</header>
		{#if saveGoalMsg}<p class="msg-error mt-2">{saveGoalMsg}</p>{/if}

		{#if data.savingsGoals.length === 0}
			<p class="py-8 text-center text-[13px] text-mute">
				저축 목표가 없어요. 관리 화면에서 만들 수 있어요.
			</p>
		{:else}
			<ul class="mt-4 grid gap-3 md:grid-cols-2">
				{#each data.savingsGoals as g (g.id)}
					<li class="rounded-xl border border-line p-4">
						<div class="flex items-baseline justify-between gap-2">
							<span class="text-[14px] font-bold">{g.name}</span>
							<span class="font-num text-[13px] font-semibold text-save tabular-nums">
								{g.progress}%
							</span>
						</div>
						<div class="mt-2 h-2 overflow-hidden rounded-full bg-save-soft">
							<div class="h-full rounded-full bg-save" style="width: {g.progress}%"></div>
						</div>
						<p class="tnum mt-2 flex justify-between gap-2 text-[12px] text-mute">
							<span>{num(g.saved)} / {num(g.targetAmount)}원</span>
							<span class="text-right">{goalHint(g)}</span>
						</p>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
