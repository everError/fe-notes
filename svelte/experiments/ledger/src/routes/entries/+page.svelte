<script lang="ts">
	import { onMount } from 'svelte';
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

	const billCats = $derived(
		new Set(data.categories.filter((c) => c.kind === 'spend' && c.nature === 'bill').map((c) => c.name))
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
			f.categories.length > 0 ||
				f.methodKind ||
			f.methodId ||
			f.min !== undefined ||
			f.max !== undefined ||
			f.source ||
				f.nature ||
				data.pay ||
				data.transferOnly
		) || !data.isDefaultRange
	);

	/** 기간은 그대로 두고 나머지 조건만 바꾼 주소 */
	function viewHref(params: Record<string, string>): string {
		const q = new SvelteURLSearchParams();
		q.set('m', data.month);
		for (const k of ['from', 'to', 'range']) {
			const v = page.url.searchParams.get(k);
			if (v) q.set(k, v);
		}
		for (const [k, v] of Object.entries(params)) q.set(k, v);
		return `/entries?${q.toString()}`;
	}

	/** 빠른 보기 — 자주 보는 조건을 한 번에 */
	const views = $derived<{ key: string; label: string; params: Record<string, string>; on: boolean }[]>([
		{ key: 'all', label: '전체', params: {}, on: !hasFilter },
		{ key: 'bill', label: '공과금', params: { kind: 'spend', nature: 'bill' }, on: f.nature === 'bill' },
		{ key: 'consume', label: '소비', params: { kind: 'spend', nature: 'consume' }, on: f.nature === 'consume' },
		{ key: 'fixed', label: '고정지출', params: { source: 'fixed' }, on: f.source === 'fixed' },
		{ key: 'card', label: '카드 지출', params: { kind: 'spend', mkind: 'card' }, on: f.methodKind === 'card' },
		{ key: 'account', label: '통장 지출', params: { kind: 'spend', mkind: 'account' }, on: f.methodKind === 'account' },
		{ key: 'inst', label: '할부', params: { source: 'installment' }, on: f.source === 'installment' },
		{
			key: 'big',
			label: '큰 지출 5만↑',
			params: { kind: 'spend', min: '50000', sort: 'amount_desc' },
			on: f.min === 50000 && f.sort === 'amount_desc'
		},
		{ key: 'pay', label: '카드대금 결제', params: { kind: 'pay' }, on: data.pay },
		{ key: 'transfer', label: '송금', params: { kind: 'transfer' }, on: data.transferOnly }
	]);

	/** 지금 조건에서 분류 하나를 넣거나 뺀 주소 */
	function catHref(name: string): string {
		const q = new SvelteURLSearchParams(page.url.search);
		const cur = q.getAll('category');
		q.delete('category');
		for (const c of cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]) q.append('category', c);
		return `/entries?${q.toString()}`;
	}

	/* 내가 저장해 둔 보기 — 이 브라우저에만 저장한다(서버·DB에는 저장하지 않는다) */
	type SavedView = { name: string; query: string };
	let saved = $state<SavedView[]>([]);
	let viewName = $state('');
	onMount(() => {
		try {
			saved = JSON.parse(localStorage.getItem('ledger.views') ?? '[]');
		} catch {
			saved = [];
		}
	});
	function persistViews() {
		try {
			localStorage.setItem('ledger.views', JSON.stringify(saved));
		} catch {
			/* 저장이 막힌 브라우저면 이번 방문 동안만 쓴다 */
		}
	}
	function saveView() {
		const name = viewName.trim();
		if (!name) return;
		const q = new SvelteURLSearchParams(page.url.search);
		q.delete('m');
		saved = [...saved.filter((v) => v.name !== name), { name, query: q.toString() }];
		viewName = '';
		persistViews();
	}
	function removeView(name: string) {
		saved = saved.filter((v) => v.name !== name);
		persistViews();
	}

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
	<!-- 빠른 보기 -->
	<section class="card space-y-3 p-4 sm:p-5" aria-label="빠른 보기">
		<div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="빠른 보기">
			<span class="eyebrow mr-1">빠른 보기</span>
			{#each views as v (v.key)}
				<a
					class="chip"
					href={resolve(viewHref(v.params) as `/entries?${string}`)}
					aria-current={v.on ? 'true' : undefined}>{v.label}</a
				>
			{/each}
		</div>
		<div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="저장한 보기">
			<span class="eyebrow mr-1">내 보기</span>
			{#each saved as v (v.name)}
				<span class="inline-flex items-center overflow-hidden rounded-full border border-line-strong bg-surface">
					<a
						class="px-3 py-1.5 text-[12.5px] font-semibold text-mute hover:text-ink"
						href={resolve(`/entries?m=${data.month}&${v.query}` as `/entries?${string}`)}>{v.name}</a
					>
					<button
						type="button"
						class="px-2 py-1.5 text-mute hover:bg-danger-soft hover:text-danger"
						aria-label="{v.name} 삭제"
						onclick={() => removeView(v.name)}
					>
						<Icon name="close" size={12} />
					</button>
				</span>
			{:else}
				<span class="text-[12px] text-mute">아래에서 조건을 고른 뒤 이름을 붙여 저장해 두면 여기서 바로 열어요.</span>
			{/each}
			{#if hasFilter}
				<form
					class="ml-auto flex items-center gap-1.5"
					onsubmit={(e) => {
						e.preventDefault();
						saveView();
					}}
				>
					<input
						bind:value={viewName}
						placeholder="지금 조건 저장 (이름)"
						class="input !w-44 !py-1.5 !text-[12.5px]"
						aria-label="저장할 보기 이름"
					/>
					<button class="btn btn-sm" disabled={!viewName.trim()}>저장</button>
				</form>
			{/if}
		</div>
	</section>

	<!-- 검색·필터 -->
	<form method="GET" action={resolve('/entries')} class="card space-y-3 p-4 sm:p-5" role="search">
		<input type="hidden" name="m" value={data.month} />
			{#if f.methodKind}<input type="hidden" name="mkind" value={f.methodKind} />{/if}
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
					<option value="" selected={!f.kind && !data.pay && !data.transferOnly}>전체</option>
					<option value="spend" selected={f.kind === 'spend'}>지출</option>
					<option value="income" selected={f.kind === 'income'}>입금</option>
					<option value="save" selected={f.kind === 'save'}>저축</option>
					<option value="pay" selected={data.pay}>카드대금 결제</option>
					<option value="transfer" selected={data.transferOnly}>송금</option>
				</select>
			</label>
			<label class="block">
				<span class="eyebrow mb-1 block">성격</span>
				<select name="nature" class="input">
					<option value="" selected={!f.nature}>전체</option>
					<option value="consume" selected={f.nature === 'consume'}>소비</option>
					<option value="bill" selected={f.nature === 'bill'}>공과금</option>
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
					<option value="installment" selected={f.source === 'installment'}>할부만</option>
				</select>
			</label>
		</div>

		<fieldset class="space-y-1.5">
			<legend class="eyebrow mb-1">분류 · 여러 개를 골라 함께 볼 수 있어요</legend>
			<div class="flex flex-wrap gap-1.5">
				{#each catOptions as c (c.id)}
					<label class="cursor-pointer">
						<input
							type="checkbox"
							name="category"
							value={c.name}
							checked={f.categories.includes(c.name)}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
							class="peer sr-only"
						/>
						<span
							class="chip peer-checked:!border-ink peer-checked:!bg-ink peer-checked:!text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand"
						>
							<span class="h-2 w-2 rounded-full" style="background: {c.color}"></span>
							{c.name}
						</span>
					</label>
				{/each}
			</div>
		</fieldset>

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
	<section class="grid grid-cols-2 gap-3 lg:grid-cols-6" aria-label="검색 결과 요약">
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
		<div class="card p-4">
			<h2 class="eyebrow">카드대금 결제</h2>
			<p class="mt-2 font-num text-[22px] leading-none font-semibold tabular-nums">
				{num(data.paidTotal)}
			</p>
			<p class="tnum mt-1.5 text-[11.5px] text-mute">{num(data.payments.length)}건</p>
		</div>
		<div class="card p-4">
			<h2 class="eyebrow">송금</h2>
			<p class="mt-2 font-num text-[22px] leading-none font-semibold tabular-nums">
				{num(data.transferTotal)}
			</p>
			<p class="tnum mt-1.5 text-[11.5px] text-mute">{num(data.transfers.length)}건</p>
		</div>
	</section>

	{#if r.byCategory.length > 1}
		<section class="card p-4" aria-label="분류별 합계">
			<h2 class="eyebrow mb-2">
				이 조건의 분류별 합계
				<span class="font-normal text-faint">· 누르면 그 분류만 보고, 다시 누르면 풀려요</span>
			</h2>
			<div class="flex flex-wrap gap-1.5">
				{#each r.byCategory as c (c.name + c.kind)}
					<a
						class="chip"
						href={resolve(catHref(c.name) as `/entries?${string}`)}
						aria-current={f.categories.includes(c.name) ? 'true' : undefined}
					>
						<span
							class="h-2 w-2 rounded-full"
							style="background: {c.kind === 'income' ? INCOME_COLOR : c.kind === 'save' ? SAVE_COLOR : (catColor[c.name] ?? '#6B7280')}"
						></span>
						{c.name}
						<span class="tnum font-num font-bold">{num(c.sum)}</span>
						<span class="text-[11px] font-normal opacity-70">{c.count}건</span>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- 목록 -->
	<section class="card overflow-hidden" aria-label="내역 목록">
		{#if r.rows.length === 0 && data.payments.length === 0 && data.transfers.length === 0}
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
										</span>{/if}{e.category}{e.installments > 1 ? ` · ${e.installments}개월 할부` : ''}{e.kind === 'spend' && billCats.has(e.category)
											? ' · 공과금'
											: ''}{e.source.startsWith('fixed:')
										? ' · 고정'
										: ''}{e.goalName
										? ` · ${e.goalName}${e.methodName ? ` ← ${e.methodName}` : ''}`
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
			{#if data.payments.length > 0}
				<p
					class="border-y border-line bg-surface-2/70 px-4 py-1.5 text-[12px] font-semibold text-mute"
				>
					카드대금 결제
				</p>
				<ul>
					{#each data.payments as p (p.id)}
						<li class="border-b border-line last:border-b-0">
							<a
								href={resolve(`/?m=${p.date.slice(0, 7)}&d=${Number(p.date.slice(8))}`)}
								class="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/70"
								title="이 날짜의 가계부 보기"
							>
								<span class="h-8 w-1 shrink-0 rounded-full bg-ink/60" aria-hidden="true"></span>
								<span class="w-[84px] shrink-0 font-num text-[12px] text-mute tabular-nums">{p.date}</span>
								<div class="min-w-0 flex-1">
									<p class="truncate text-[14px] leading-tight font-semibold">{p.cardName} 대금 결제</p>
									<p class="mt-0.5 truncate text-[11.5px] text-mute">{p.accountName}에서 결제</p>
								</div>
								<span class="font-num text-[14px] font-semibold tabular-nums">{num(p.amount)}</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
			{#if data.transfers.length > 0}
				<p
					class="border-y border-line bg-surface-2/70 px-4 py-1.5 text-[12px] font-semibold text-mute"
				>
					송금
				</p>
				<ul>
					{#each data.transfers as t (t.id)}
						<li class="border-b border-line last:border-b-0">
							<a
								href={resolve(`/?m=${t.date.slice(0, 7)}&d=${Number(t.date.slice(8))}`)}
								class="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/70"
								title="이 날짜의 가계부 보기"
							>
								<span class="h-8 w-1 shrink-0 rounded-full bg-ink/40" aria-hidden="true"></span>
								<span class="w-[84px] shrink-0 font-num text-[12px] text-mute tabular-nums">{t.date}</span>
								<div class="min-w-0 flex-1">
									<p class="truncate text-[14px] leading-tight font-semibold">
										{t.fromName} → {t.toName}
									</p>
									<p class="mt-0.5 text-[11.5px] text-mute">송금</p>
								</div>
								<span class="font-num text-[14px] font-semibold tabular-nums">{num(t.amount)}</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
			{#if r.count > r.rows.length}
				<p class="border-t border-line px-4 py-3 text-center text-[12px] text-mute">
					조건에 맞는 {num(r.count)}건 중 {num(r.rows.length)}건만 보여요. 조건을 좁혀 보세요.
				</p>
			{/if}
		{/if}
	</section>
</div>
