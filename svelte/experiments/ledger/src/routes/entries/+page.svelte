<script lang="ts">
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import Icon from '#lib/components/Icon.svelte';
	import { SAVE_COLOR, INCOME_COLOR } from '#lib/categories';
	import { dateKey, dayLabel, num, signed, weekdayOf } from '#lib/format';
	import type { Entry } from '#lib/types';

	let { data }: PageProps = $props();

	const f = $derived(data.filter);
	const r = $derived(data.result);
	const today = $derived(`${data.todayMonth}-${String(data.todayDay).padStart(2, '0')}`);
	const catColor = $derived(Object.fromEntries(data.categories.map((c) => [c.name, c.color])));

	/** 종류에 맞는 분류만 고르게 한다 */
	const catOptions = $derived(
		data.categories.filter((c) => (f.kind ? c.kind === f.kind : true) && f.kind !== 'save')
	);

	const colorOf = (e: Entry) =>
		e.kind === 'income'
			? INCOME_COLOR
			: e.kind === 'save'
				? SAVE_COLOR
				: (catColor[e.category] ?? '#6B7280');

	/** 지금 조건에서 기간만 바꾼 주소 */
	function rangeQuery(range: 'month' | 'week' | 'month30' | 'all'): string {
		const q = new SvelteURLSearchParams(page.url.search);
		for (const k of ['from', 'to', 'range']) q.delete(k);
		if (range === 'all') q.set('range', 'all');
		if (range === 'week' || range === 'month30') {
			const back = range === 'week' ? 6 : 29;
			const [y, m, d] = today.split('-').map(Number);
			q.set('from', dateKey(new Date(y, m - 1, d - back)));
			q.set('to', today);
		}
		return q.toString();
	}

	const activeRange = $derived(
		data.isDefaultRange
			? 'month'
			: page.url.searchParams.get('range') === 'all'
				? 'all'
				: f.to === today && f.from
					? f.from ===
						dateKey(
							new Date(
								Number(today.slice(0, 4)),
								Number(today.slice(5, 7)) - 1,
								Number(today.slice(8)) - 6
							)
						)
						? 'week'
						: 'month30'
					: 'custom'
	);

	/** 날짜순 정렬일 때만 날짜 머리글로 묶는다 */
	const grouped = $derived(f.sort === 'date_desc' || f.sort === 'date_asc');

	const hasFilter = $derived(
		Boolean(
			f.q ||
			f.kind ||
			f.category ||
			f.methodId ||
			f.min !== undefined ||
			f.max !== undefined ||
			f.source
		) || !data.isDefaultRange
	);

	const money = (e: Event & { currentTarget: HTMLInputElement }) => {
		const digits = e.currentTarget.value.replace(/[^\d]/g, '');
		e.currentTarget.value = digits ? num(Number(digits)) : '';
	};

	const RANGES = $derived([
		['month', data.monthLabel],
		['week', '최근 7일'],
		['month30', '최근 30일'],
		['all', '전체']
	] as const);
</script>

<svelte:head>
	<title>내역 — 달통장</title>
</svelte:head>

<div class="space-y-4 pt-1">
	<!-- 검색·필터 -->
	<form method="GET" action={resolve('/entries')} class="card space-y-3 p-4 sm:p-5" role="search">
		<input type="hidden" name="m" value={data.month} />
		{#if !data.isDefaultRange}
			{#if f.from}<input type="hidden" name="from" value={f.from} />{/if}
			{#if f.to}<input type="hidden" name="to" value={f.to} />{/if}
			{#if page.url.searchParams.get('range') === 'all'}<input
					type="hidden"
					name="range"
					value="all"
				/>{/if}
		{/if}

		<label
			class="flex items-center gap-2 rounded-xl border border-line-strong px-3 transition focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15"
		>
			<Icon name="search" size={16} />
			<input
				name="q"
				value={f.q ?? ''}
				placeholder="메모나 분류로 찾기 (예: 점심, 카페)"
				autocomplete="off"
				class="min-w-0 flex-1 bg-transparent py-2.5 text-[14px] outline-none placeholder:text-faint"
				aria-label="검색어"
			/>
		</label>

		<div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="기간">
			<span class="eyebrow mr-1">기간</span>
			{#each RANGES as [key, label] (key)}
				<a
					class="chip"
					href={resolve(`/entries?${rangeQuery(key)}`)}
					aria-current={activeRange === key ? 'true' : undefined}>{label}</a
				>
			{/each}
			{#if activeRange === 'custom'}<span class="chip" aria-pressed="true">직접 지정</span>{/if}
		</div>

		<div class="grid grid-cols-2 gap-2 md:grid-cols-4">
			<label class="block">
				<span class="eyebrow mb-1 block">종류</span>
				<select name="kind" class="input">
					<option value="" selected={!f.kind}>전체</option>
					<option value="spend" selected={f.kind === 'spend'}>지출</option>
					<option value="income" selected={f.kind === 'income'}>입금</option>
					<option value="save" selected={f.kind === 'save'}>저축</option>
				</select>
			</label>
			<label class="block">
				<span class="eyebrow mb-1 block">분류</span>
				<select name="category" class="input">
					<option value="">전체</option>
					{#each catOptions as c (c.id)}
						<option value={c.name} selected={f.category === c.name}>{c.name}</option>
					{/each}
				</select>
			</label>
			<label class="block">
				<span class="eyebrow mb-1 block">결제수단</span>
				<select name="method" class="input">
					<option value="">전체</option>
					{#each data.paymentMethods as m (m.id)}
						<option value={m.id} selected={f.methodId === m.id}>{m.name}</option>
					{/each}
				</select>
			</label>
			<label class="block">
				<span class="eyebrow mb-1 block">구분</span>
				<select name="source" class="input">
					<option value="" selected={!f.source}>전체</option>
					<option value="fixed" selected={f.source === 'fixed'}>고정지출만</option>
					<option value="manual" selected={f.source === 'manual'}>직접 기록만</option>
				</select>
			</label>
		</div>

		<div class="grid grid-cols-2 gap-2 md:grid-cols-4">
			<label class="block">
				<span class="eyebrow mb-1 block">시작일</span>
				<input
					type="date"
					name="from"
					value={data.isDefaultRange ? '' : (f.from ?? '')}
					class="input font-num"
					disabled={!data.isDefaultRange}
				/>
			</label>
			<label class="block">
				<span class="eyebrow mb-1 block">종료일</span>
				<input
					type="date"
					name="to"
					value={data.isDefaultRange ? '' : (f.to ?? '')}
					class="input font-num"
					disabled={!data.isDefaultRange}
				/>
			</label>
			<label class="block">
				<span class="eyebrow mb-1 block">최소 금액</span>
				<input
					name="min"
					value={f.min === undefined ? '' : num(f.min)}
					oninput={money}
					inputmode="numeric"
					placeholder="0"
					class="input font-num tabular-nums"
				/>
			</label>
			<label class="block">
				<span class="eyebrow mb-1 block">최대 금액</span>
				<input
					name="max"
					value={f.max === undefined ? '' : num(f.max)}
					oninput={money}
					inputmode="numeric"
					placeholder="제한 없음"
					class="input font-num tabular-nums"
				/>
			</label>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-2">
			<label class="flex items-center gap-2 text-[12.5px] text-mute">
				정렬
				<select name="sort" class="input !w-auto !py-1.5 !text-[13px]">
					<option value="date_desc" selected={f.sort === 'date_desc'}>최신순</option>
					<option value="date_asc" selected={f.sort === 'date_asc'}>오래된순</option>
					<option value="amount_desc" selected={f.sort === 'amount_desc'}>금액 큰 순</option>
					<option value="amount_asc" selected={f.sort === 'amount_asc'}>금액 작은 순</option>
				</select>
			</label>
			<div class="flex items-center gap-2">
				{#if hasFilter}<a class="btn-ghost" href={resolve(`/entries?m=${data.month}`)}
						>조건 지우기</a
					>{/if}
				<button class="btn btn-sm"><Icon name="search" size={14} /> 검색</button>
			</div>
		</div>
	</form>

	<!-- 결과 요약 -->
	<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="검색 결과 요약">
		<div class="card p-4">
			<h2 class="eyebrow">찾은 내역</h2>
			<p class="mt-2 font-num text-[22px] leading-none font-semibold tabular-nums">
				{num(r.count)}건
			</p>
		</div>
		<div class="card p-4">
			<h2 class="eyebrow">입금</h2>
			<p class="mt-2 font-num text-[22px] leading-none font-semibold text-income tabular-nums">
				+{num(r.income)}
			</p>
		</div>
		<div class="card p-4">
			<h2 class="eyebrow">지출</h2>
			<p class="mt-2 font-num text-[22px] leading-none font-semibold tabular-nums">
				-{num(r.spend)}
			</p>
		</div>
		<div class="card p-4">
			<h2 class="eyebrow">저축</h2>
			<p class="mt-2 font-num text-[22px] leading-none font-semibold text-save tabular-nums">
				{num(r.save)}
			</p>
		</div>
	</section>

	<!-- 목록 -->
	<section class="card overflow-hidden" aria-label="내역 목록">
		{#if r.rows.length === 0}
			<p class="px-4 py-12 text-center text-[13px] leading-relaxed text-mute">
				조건에 맞는 내역이 없어요.<br />기간을 넓히거나 조건을 지워 보세요.
			</p>
		{:else}
			<ul>
				{#each r.rows as e, i (e.id)}
					{#if grouped && (i === 0 || r.rows[i - 1].date !== e.date)}
						<li
							class="border-y border-line bg-surface-2/70 px-4 py-1.5 text-[12px] font-semibold text-mute first:border-t-0"
						>
							{e.date.slice(0, 4)}년 {dayLabel(e.date)}
							{weekdayOf(e.date)}요일
						</li>
					{/if}
					<li class="border-b border-line last:border-b-0">
						<a
							href={resolve(`/?m=${e.date.slice(0, 7)}&d=${Number(e.date.slice(8))}`)}
							class="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/70"
							title="이 날짜의 가계부 보기"
						>
							<span
								class="h-8 w-1 shrink-0 rounded-full"
								style="background: {colorOf(e)}"
								aria-hidden="true"
							></span>
							{#if !grouped}
								<span
									class="hidden w-[84px] shrink-0 font-num text-[12px] text-mute tabular-nums sm:block"
									>{e.date}</span
								>
							{/if}
							<div class="min-w-0 flex-1">
								<p class="truncate text-[14px] leading-tight font-semibold">
									{e.memo || e.category}
								</p>
								<p class="mt-0.5 truncate text-[11.5px] text-mute">
									{#if !grouped}<span class="sm:hidden"
											>{e.date} ·
										</span>{/if}{e.category}{e.source.startsWith('fixed:')
										? ' · 고정'
										: ''}{e.goalName
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
						</a>
					</li>
				{/each}
			</ul>
			{#if r.count > r.rows.length}
				<p class="border-t border-line px-4 py-3 text-center text-[12px] text-mute">
					조건에 맞는 {num(r.count)}건 중 {num(r.rows.length)}건만 보여요. 조건을 좁혀 보세요.
				</p>
			{/if}
		{/if}
	</section>
</div>
