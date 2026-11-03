<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import Icon from '#lib/components/Icon.svelte';
	import { addMonths } from '#lib/format';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const nav = [
		{ path: '/', label: '가계부', icon: 'calendar' },
		{ path: '/entries', label: '내역', icon: 'list' },
		{ path: '/insights', label: '분석', icon: 'chart' },
		{ path: '/manage', label: '관리', icon: 'settings' }
	] as const;

	const pathname = $derived(page.url.pathname);
	const isActive = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path));
	const showMonth = $derived(!pathname.startsWith('/manage'));

	/** 지금 보는 화면의 경로 — 달만 바꾸는 링크에 쓴다 */
	const basePath = $derived(nav.find((n) => isActive(n.path))?.path ?? '/');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen lg:grid lg:grid-cols-[216px_minmax(0,1fr)]">
	<!-- 데스크톱 사이드바 -->
	<aside
		class="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-3 py-5 lg:flex"
	>
		<a href={resolve('/')} class="mb-6 flex items-center gap-2.5 px-3">
			<span class="grid h-8 w-8 place-items-center rounded-xl bg-ink text-white">
				<Icon name="wallet" size={17} />
			</span>
			<span class="text-[17px] font-extrabold tracking-tight">달통장</span>
		</a>
		<nav class="flex flex-col gap-1" aria-label="주 메뉴">
			{#each nav as item (item.path)}
				<a
					href={resolve(`${item.path}?m=${data.month}`)}
					aria-current={isActive(item.path) ? 'page' : undefined}
					class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors {isActive(
						item.path
					)
						? 'bg-brand-soft text-brand'
						: 'text-mute hover:bg-surface-2 hover:text-ink'}"
				>
					<Icon name={item.icon} size={18} />
					{item.label}
				</a>
			{/each}
		</nav>
		<p class="mt-auto px-3 text-[11.5px] leading-relaxed text-faint">
			한 달 동안 쓸 돈을 정해 두고<br />쓴 만큼 줄여 가는 가계부
		</p>
	</aside>

	<div class="min-w-0 pb-24 lg:pb-10">
		<!-- 상단 바 -->
		<header
			class="sticky top-0 z-20 flex items-center gap-2 bg-canvas/85 px-4 py-3 backdrop-blur-md lg:px-8"
		>
			<a href={resolve('/')} class="mr-1 flex items-center gap-2 lg:hidden">
				<span class="grid h-8 w-8 place-items-center rounded-xl bg-ink text-white">
					<Icon name="wallet" size={16} />
				</span>
			</a>

			{#if showMonth}
				<div class="flex items-center gap-1">
					<a
						class="iconbtn border border-line bg-surface"
						href={resolve(`${basePath}?m=${addMonths(data.month, -1)}`)}
						aria-label="이전 달"
					>
						<Icon name="chevronLeft" size={16} />
					</a>
					<h1 class="min-w-[112px] text-center font-num text-[18px] font-bold tracking-tight">
						{data.monthLabel}
					</h1>
					<a
						class="iconbtn border border-line bg-surface"
						href={resolve(`${basePath}?m=${addMonths(data.month, 1)}`)}
						aria-label="다음 달"
					>
						<Icon name="chevronRight" size={16} />
					</a>
				</div>
				{#if data.month !== data.todayMonth}
					<a class="btn-ghost" href={resolve(`${basePath}?m=${data.todayMonth}`)}>이번 달</a>
				{/if}
			{:else}
				<h1 class="text-[18px] font-bold tracking-tight">관리</h1>
			{/if}
		</header>

		<main class="mx-auto w-full max-w-[1320px] px-4 lg:px-8">
			{@render children()}
		</main>
	</div>

	<!-- 모바일 하단 탭 -->
	<nav
		class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
		aria-label="주 메뉴"
	>
		{#each nav as item (item.path)}
			<a
				href={resolve(`${item.path}?m=${data.month}`)}
				aria-current={isActive(item.path) ? 'page' : undefined}
				class="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold {isActive(
					item.path
				)
					? 'text-brand'
					: 'text-mute'}"
			>
				<Icon name={item.icon} size={20} />
				{item.label}
			</a>
		{/each}
	</nav>
</div>
