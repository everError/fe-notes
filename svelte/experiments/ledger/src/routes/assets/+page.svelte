<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import Icon from '#lib/components/Icon.svelte';
	import { cycleText, md, num, signed } from '#lib/format';

	let { data }: PageProps = $props();

	const thisYear = $derived(data.today.slice(0, 4));
	/** 2027년 1월처럼 해가 다르면 연도를 붙인다 */
	const monthName = (m: string) =>
		`${m.slice(0, 4) === thisYear ? '' : `${m.slice(2, 4)}년 `}${Number(m.slice(5))}월`;

	const nextBill = $derived(data.timeline[0] ?? null);
	const maxBill = (c: (typeof data.cards)[number]) => Math.max(1, ...c.schedule.map((s) => Math.abs(s.amount)));
</script>

<svelte:head>
	<title>자산 — 달통장</title>
</svelte:head>

<div class="space-y-4 pt-1 pb-4">
	<!-- 요약 -->
	<section class="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="자산 요약">
		<div class="card p-5 sm:col-span-1">
			<h2 class="eyebrow">순자산 (통장 − 카드 미결제)</h2>
			<p
				class="tnum mt-1.5 font-num text-[32px] leading-none font-semibold {data.net < 0
					? 'text-danger'
					: ''}"
			>
				{num(data.net)}<span class="ml-1 text-[14px] font-normal text-mute">원</span>
			</p>
			<p class="mt-2 text-[12px] leading-relaxed text-mute">
				카드 할부로 앞으로 낼 금액까지 모두 뺀 값이에요.
			</p>
		</div>
		<div class="card p-5">
			<h2 class="eyebrow flex items-center gap-1.5">
				<span class="h-2 w-2 rounded-full bg-income"></span> 통장 합계
			</h2>
			<p class="tnum mt-1.5 font-num text-[26px] leading-none font-semibold">
				{num(data.accountTotal)}<span class="ml-1 text-[13px] font-normal text-mute">원</span>
			</p>
			<p class="mt-2 text-[12px] text-mute">통장 {data.accounts.length}개</p>
		</div>
		<div class="card p-5">
			<h2 class="eyebrow flex items-center gap-1.5">
				<span class="h-2 w-2 rounded-full bg-brand"></span> 카드 미결제 전체
			</h2>
			<p class="tnum mt-1.5 font-num text-[26px] leading-none font-semibold">
				{num(data.cardOwedTotal)}<span class="ml-1 text-[13px] font-normal text-mute">원</span>
			</p>
			<p class="mt-2 text-[12px] text-mute">
				{#if nextBill}다음 결제 {monthName(nextBill.month)} {num(nextBill.total)}원{:else}낼 금액이 없어요{/if}
			</p>
		</div>
	</section>

	<!-- 결제 일정 -->
	<section class="card p-4 sm:p-5" aria-label="카드대금 결제 일정">
		<header class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="card-title">카드대금 결제 일정</h2>
			<p class="text-[11.5px] text-mute">
				앞으로 들어올 돈은 넣지 않고, 지금 통장 합계에서 카드대금만 차례로 뺀 값이에요.
			</p>
		</header>
		{#if data.timeline.length === 0}
			<p class="py-8 text-center text-[13px] text-mute">앞으로 낼 카드대금이 없어요.</p>
		{:else}
			<ol class="mt-3 space-y-3">
				{#each data.timeline as t, i (t.month)}
					<li class="overflow-hidden rounded-xl border border-line">
						<div
							class="flex items-center justify-between gap-2 px-4 py-2.5 {i === 0
								? 'bg-brand-soft'
								: 'bg-surface-2'}"
						>
							<p class="text-[13.5px] font-bold {i === 0 ? 'text-brand' : ''}">
								{monthName(t.month)} 결제{i === 0 ? ' · 다음 결제' : ''}
							</p>
							<p class="tnum font-num text-[16px] font-semibold">{num(t.total)}원</p>
						</div>
						<ul class="divide-y divide-line px-4">
							{#each t.items as it (it.cardId)}
								<li class="flex items-center justify-between gap-3 py-2 text-[13px]">
									<span class="min-w-0 truncate">
										<span class="font-semibold">{it.name}</span>
										<span class="text-mute">{it.payDay ? ` · ${it.payDay}일` : ''}</span>
									</span>
									<span class="tnum font-num font-semibold">{num(it.amount)}원</span>
								</li>
							{/each}
						</ul>
						<div
							class="tnum flex items-center justify-between gap-2 border-t border-line px-4 py-2 text-[12.5px] {t.after <
							0
								? 'bg-danger-soft text-danger'
								: 'bg-surface-2/60 text-mute'}"
						>
							<span>
								{#if t.after < 0}
									통장이 {num(-t.after)}원 모자라요
								{:else}
									여기까지 내고 나면 통장
								{/if}
							</span>
							<span class="font-num font-semibold {t.after < 0 ? '' : 'text-ink'}">{num(t.after)}원</span>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<!-- 카드별 -->
	<section class="space-y-3" aria-label="카드별 현황">
		<h2 class="card-title px-1">카드별 현황</h2>
		{#if data.cards.length === 0}
			<p class="card p-6 text-center text-[13px] text-mute">
				관리 화면에서 카드를 등록하면 여기서 볼 수 있어요.
			</p>
		{:else}
			<div class="grid gap-3 lg:grid-cols-2">
				{#each data.cards as c (c.id)}
					<div class="card overflow-hidden">
						<header class="flex items-start justify-between gap-3 border-b border-line bg-brand-soft/50 px-4 py-3">
							<div class="min-w-0">
								<p class="truncate text-[15px] font-bold">{c.name}</p>
								<p class="mt-0.5 text-[11.5px] leading-snug text-mute">
									{cycleText(c.cycleStart, c.payDay)}
								</p>
							</div>
							<div class="shrink-0 text-right">
								<p class="eyebrow">전체 미결제</p>
								<p class="tnum font-num text-[17px] leading-tight font-semibold">{num(c.owed)}원</p>
							</div>
						</header>
						{#if c.schedule.length === 0}
							<p class="px-4 py-5 text-center text-[12.5px] text-mute">앞으로 낼 금액이 없어요.</p>
						{:else}
							<ul class="space-y-2.5 px-4 py-3">
								{#each c.schedule as s, i (s.month)}
									<li>
										<div class="flex items-baseline justify-between gap-2 text-[12.5px]">
											<span class="font-semibold {i === 0 ? 'text-brand' : ''}">
												{monthName(s.month)}{c.payDay ? ` ${c.payDay}일` : ''}
											</span>
											<span class="tnum font-num font-semibold">{num(s.amount)}원</span>
										</div>
										<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
											<div
												class="h-full rounded-full {i === 0 ? 'bg-brand' : 'bg-ink/35'}"
												style="width: {(Math.abs(s.amount) / maxBill(c)) * 100}%"
											></div>
										</div>
										<p class="tnum mt-0.5 text-[11px] text-mute">{md(s.from)} ~ {md(s.to)} 사용분</p>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- 할부 -->
	<section class="card p-4 sm:p-5" aria-label="진행 중인 할부">
		<header class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="card-title">진행 중인 할부</h2>
			<p class="tnum text-[12px] text-mute">
				남은 할부 합계
				<b class="font-num text-[14px] font-semibold text-ink">
					{num(data.installments.reduce((s, x) => s + x.remainingAmount, 0))}원
				</b>
			</p>
		</header>
		{#if data.installments.length === 0}
			<p class="py-8 text-center text-[13px] text-mute">
				진행 중인 할부가 없어요. 카드로 지출을 기록할 때 할부를 고를 수 있어요.
			</p>
		{:else}
			<ul class="mt-3 grid gap-3 md:grid-cols-2">
				{#each data.installments as x (x.id)}
					<li class="rounded-xl border border-line px-3.5 py-3">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<p class="truncate text-[14px] font-bold">{x.memo || x.category}</p>
								<p class="tnum text-[11.5px] text-mute">
									{x.cardName} · {md(x.date)} 구매 · 총 {num(x.total)}원
								</p>
							</div>
							<span class="pill shrink-0 bg-save-soft text-save">
								{x.billedCount}/{x.months}회
							</span>
						</div>
						<div class="mt-2 h-2 overflow-hidden rounded-full bg-save-soft">
							<div class="h-full rounded-full bg-save" style="width: {(x.billedCount / x.months) * 100}%"></div>
						</div>
						<p class="tnum mt-1.5 flex flex-wrap justify-between gap-x-3 text-[12px] text-mute">
							<span>월 {num(x.monthly)}원</span>
							<span>남은 {num(x.remainingAmount)}원 · {monthName(x.lastMonth)}까지</span>
						</p>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- 통장 -->
	<section class="card p-4 sm:p-5" aria-label="통장">
		<header class="flex items-center justify-between gap-2">
			<h2 class="card-title">통장</h2>
			<a class="btn-ghost" href={resolve('/')}>
				<Icon name="edit" size={12} /> 잔액 기록
			</a>
		</header>
		{#if data.accounts.length === 0}
			<p class="py-6 text-center text-[13px] text-mute">등록된 통장이 없어요.</p>
		{:else}
			<ul class="mt-2 divide-y divide-line">
				{#each data.accounts as a (a.id)}
					<li class="flex items-center justify-between gap-3 py-3">
						<span class="flex min-w-0 items-center gap-2 text-[14px] font-semibold">
							<Icon name="wallet" size={15} />
							<span class="truncate">{a.name}</span>
						</span>
						<span
							class="tnum font-num text-[16px] font-semibold {a.current < 0 ? 'text-danger' : ''}"
						>
							{signed(a.current).replace('+', '')}원
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
