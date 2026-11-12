<script lang="ts">
	import './layout.css';
	import type { ComponentProps } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import Icon from '#lib/components/Icon.svelte';
	import { addMonths } from '#lib/format';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	type IconName = ComponentProps<typeof Icon>['name'];
	type NavItem = {
		path: '/' | '/entries' | '/wallet' | '/assets' | '/insights' | '/manage';
		tab?: 'fixed' | 'categories' | 'methods' | 'goals' | 'data';
		label: string;
		icon: IconName;
		hint: string;
		monthly: boolean; // 달을 바꿔 가며 보는 화면
	};

	/** 좌측 메뉴 — 하는 일별로 묶는다 */
	const groups: { title: string; items: NavItem[] }[] = [
		{
			title: '가계부',
			items: [
				{ path: '/', label: '달력', icon: 'calendar', hint: '날짜별 기록과 남은 돈', monthly: true },
				{ path: '/entries', label: '내역', icon: 'list', hint: '검색 · 필터 · 빠른 보기', monthly: true }
			]
		},
		{
			title: '내 돈',
			items: [
				{ path: '/wallet', label: '통장·카드', icon: 'card', hint: '잔액 · 카드대금 결제 · 명세서 맞추기', monthly: true },
				{ path: '/assets', label: '자산·결제 일정', icon: 'layers', hint: '순자산 · 앞으로 낼 카드대금 · 할부', monthly: false }
			]
		},
		{
			title: '분석',
			items: [
				{ path: '/insights', label: '월간 분석', icon: 'chart', hint: '예산 · 분류 · 월별 추이', monthly: true }
			]
		},
		{
			title: '설정',
			items: [
				{ path: '/manage', tab: 'fixed', label: '고정지출', icon: 'repeat', hint: '매달 나가는 돈', monthly: false },
				{ path: '/manage', tab: 'categories', label: '분류·예산', icon: 'tag', hint: '분류 · 소비/공과금 · 월 예산', monthly: false },
				{ path: '/manage', tab: 'methods', label: '카드·통장 등록', icon: 'wallet', hint: '이용기간 · 결제일', monthly: false },
				{ path: '/manage', tab: 'goals', label: '저축 목표', icon: 'target', hint: '목표 금액 · 기존 저축금액', monthly: false },
				{ path: '/manage', tab: 'data', label: '데이터', icon: 'download', hint: '내보내기 · 초기화', monthly: false }
			]
		}
	];
	const allItems = groups.flatMap((g) => g.items);

	/** 모바일 하단 탭 — 자주 쓰는 다섯 곳 */
	const mobileTabs: NavItem[] = [
		allItems[0],
		allItems[1],
		allItems[2],
		allItems[4],
		{ ...allItems[5], label: '설정', icon: 'settings' }
	];

	const pathname = $derived(page.url.pathname);
	const tab = $derived(page.url.searchParams.get('tab') ?? 'fixed');
	const isActive = (it: NavItem) =>
		it.path === '/'
			? pathname === '/'
			: pathname.startsWith(it.path) && (!it.tab || it.tab === tab || it === mobileTabs[4]);
	const current = $derived(
		allItems.find((it) => (it.path === '/' ? pathname === '/' : pathname.startsWith(it.path) && (!it.tab || it.tab === tab))) ??
			allItems[0]
	);

	const href = (it: NavItem) =>
		it.tab ? resolve(`/manage?tab=${it.tab}`) : resolve(`${it.path}?m=${data.month}`);
	/** 지금 화면에서 달만 바꾸는 주소 */
	const monthHref = (m: string) => resolve(`${current.path}?m=${m}`);

	const today = new Date();
	const todayText = `${today.getMonth() + 1}월 ${today.getDate()}일 ${'일월화수목금토'[today.getDay()]}요일`;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
	<!-- 데스크톱 사이드바 -->
	<aside
		class="sticky top-0 hidden h-screen flex-col overflow-y-auto border-r border-line bg-surface px-3 pt-5 pb-4 lg:flex"
	>
		<a href={resolve('/')} class="mb-5 flex items-center gap-2.5 px-2.5">
			<span class="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white shadow-card">
				<Icon name="wallet" size={18} />
			</span>
			<span>
				<span class="block text-[17px] leading-tight font-extrabold tracking-tight">달통장</span>
				<span class="block text-[11px] text-faint">{todayText}</span>
			</span>
		</a>

		<nav class="flex flex-col gap-4" aria-label="주 메뉴">
			{#each groups as g (g.title)}
				<div>
					<p class="mb-1 px-2.5 text-[11px] font-bold tracking-wide text-faint">{g.title}</p>
					<ul class="flex flex-col gap-0.5">
						{#each g.items as it (it.label)}
							{@const on = current === it}
							<li>
								<a
									href={href(it)}
									aria-current={on ? 'page' : undefined}
									class="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-semibold transition-colors {on
										? 'bg-brand-soft text-brand'
										: 'text-mute hover:bg-surface-2 hover:text-ink'}"
								>
									<span
										class="grid h-7 w-7 shrink-0 place-items-center rounded-lg {on
											? 'bg-surface text-brand shadow-sm'
											: 'bg-surface-2 text-mute group-hover:text-ink'}"
									>
										<Icon name={it.icon} size={15} />
									</span>
									{it.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</nav>

		<p class="mt-auto px-2.5 pt-6 text-[11px] leading-relaxed text-faint">
			입력한 데이터는 이 컴퓨터에만 저장돼요.
		</p>
	</aside>

	<div class="min-w-0 pb-24 lg:pb-10">
		<!-- 상단 바: 화면 이름 + 달 바꾸기 -->
		<header
			class="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 px-4 py-3 backdrop-blur-md lg:px-8"
		>
			<div class="mx-auto flex w-full max-w-[1320px] flex-wrap items-center gap-x-4 gap-y-2">
				<a href={resolve('/')} class="flex items-center lg:hidden" aria-label="달력으로">
					<span class="grid h-8 w-8 place-items-center rounded-xl bg-ink text-white">
						<Icon name="wallet" size={16} />
					</span>
				</a>
				<div class="min-w-0 flex-1">
					<h1 class="truncate text-[19px] leading-tight font-extrabold tracking-tight">
						{current.label}
					</h1>
					<p class="hidden truncate text-[12px] text-mute sm:block">{current.hint}</p>
				</div>

				{#if current.monthly}
					<div class="flex items-center gap-1.5">
						{#if data.month !== data.todayMonth}
							<a class="btn-ghost" href={monthHref(data.todayMonth)}>이번 달</a>
						{/if}
						<div class="flex items-center rounded-xl border border-line bg-surface p-0.5 shadow-sm">
							<a
								class="iconbtn !h-8 !w-8"
								href={monthHref(addMonths(data.month, -1))}
								aria-label="이전 달"
							>
								<Icon name="chevronLeft" size={16} />
							</a>
							<span class="min-w-[108px] text-center font-num text-[15px] font-bold tracking-tight">
								{data.monthLabel}
							</span>
							<a
								class="iconbtn !h-8 !w-8"
								href={monthHref(addMonths(data.month, 1))}
								aria-label="다음 달"
							>
								<Icon name="chevronRight" size={16} />
							</a>
						</div>
					</div>
				{/if}
			</div>
		</header>

		<main class="mx-auto w-full max-w-[1320px] px-4 pt-4 lg:px-8">
			{@render children()}
		</main>
	</div>

	<!-- 모바일 하단 탭 -->
	<nav
		class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
		aria-label="주 메뉴"
	>
		{#each mobileTabs as it (it.label)}
			{@const on = it.path === '/manage' ? pathname.startsWith('/manage') : isActive(it)}
			<a
				href={href(it)}
				aria-current={on ? 'page' : undefined}
				class="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold {on
					? 'text-brand'
					: 'text-mute'}"
			>
				<Icon name={it.icon} size={20} />
				{it.label}
			</a>
		{/each}
	</nav>
</div>
