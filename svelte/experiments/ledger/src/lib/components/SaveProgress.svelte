<script lang="ts">
	import { num } from '#lib/format';

	let {
		saved,
		plan
	}: {
		saved: number;
		plan: number; // 이번 달 필요 저축액(0 이면 진행 중인 목표 없음)
	} = $props();

	const done = $derived(plan > 0 && saved >= plan);
	const pct = $derived(plan > 0 ? Math.round((saved / plan) * 100) : 0);
	const gap = $derived(Math.abs(plan - saved));

	// 막대 길이의 기준 — 목표를 넘기면 넘긴 만큼을 다른 색으로 이어 붙인다
	const scale = $derived(Math.max(plan, saved, 1));
	const basePct = $derived((Math.min(saved, plan) / scale) * 100);
	const extraPct = $derived((Math.max(saved - plan, 0) / scale) * 100);
	const markPct = $derived((plan / scale) * 100);
</script>

<div>
	<div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
		<span class="eyebrow">이번 달 저축</span>
		{#if plan === 0}
			<span class="pill bg-surface-2 text-mute">진행 중인 목표 없음</span>
		{:else if done}
			<span class="pill bg-income-soft text-income">
				{saved > plan ? '목표 초과 달성' : '목표 달성'}
			</span>
		{:else if saved === 0}
			<span class="pill bg-surface-2 text-mute">아직 시작 전</span>
		{:else}
			<span class="pill bg-save-soft text-save">{pct}% 진행 중</span>
		{/if}
	</div>

	<div class="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
		<p class="flex items-baseline gap-1">
			<span
				class="font-num text-[20px] leading-none font-semibold tracking-tight text-save tabular-nums"
			>
				{num(saved)}
			</span>
			<span class="text-[13px] text-mute">원 저축</span>
		</p>
		{#if plan > 0}
			<p class="tnum text-[12px] text-mute">
				이번 달 필요 <span class="font-num text-[13px] font-bold text-ink">{num(plan)}원</span>
			</p>
		{/if}
	</div>

	{#if plan > 0}
		<div
			class="relative mt-2.5 flex h-2 w-full rounded-full bg-save-soft"
			role="img"
			aria-label="이번 달 필요 저축액의 {pct}%"
		>
			<span
				class="h-full rounded-l-full bg-save transition-[width] duration-500 {extraPct === 0
					? 'rounded-r-full'
					: ''}"
				style="width: {basePct}%"
			></span>
			{#if extraPct > 0}
				<span
					class="h-full rounded-r-full bg-income transition-[width] duration-500"
					style="width: {extraPct}%"
				></span>
			{/if}
			<!-- 필요 금액 위치 -->
			<span
				class="absolute -top-[3px] h-3.5 w-0.5 rounded bg-ink/70"
				style="left: calc({markPct}% - 1px)"
				aria-hidden="true"
			></span>
		</div>
		<p class="tnum mt-1.5 text-[11.5px] text-mute">
			{#if saved > plan}
				필요한 금액보다 <span class="font-semibold text-income">{num(gap)}원 더</span> 모았어요
			{:else if done}
				필요한 금액을 모두 모았어요
			{:else}
				<span class="font-semibold text-ink">{num(gap)}원</span> 더 모으면 이번 달 목표 달성
			{/if}
		</p>
	{:else}
		<p class="mt-2 text-[12px] text-mute">
			관리 화면에서 저축 목표를 만들면 이번 달 필요한 금액을 계산해 드려요.
		</p>
	{/if}
</div>
