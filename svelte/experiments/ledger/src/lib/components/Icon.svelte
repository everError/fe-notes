<script lang="ts">
	type Icon =
		| 'plus'
		| 'chevronLeft'
		| 'chevronRight'
		| 'edit'
		| 'trash'
		| 'check'
		| 'refresh'
		| 'close'
		| 'spend'
		| 'income'
		| 'calendar'
		| 'chart'
		| 'settings'
		| 'wallet'
		| 'target'
		| 'repeat'
		| 'search'
		| 'list';

	let { name, size = 16 }: { name: Icon; size?: number } = $props();

	const paths: Record<Icon, string> = {
		plus: 'M10 4v12M4 10h12',
		chevronLeft: 'M13 5l-6 5 6 5',
		chevronRight: 'M7 5l6 5-6 5',
		edit: 'M4 13.5L12.8 4.7a1.6 1.6 0 0 1 2.3 0l.2.2a1.6 1.6 0 0 1 0 2.3L6.5 16H4v-2.5z',
		trash:
			'M5 6.5h10M8 6V4.8c0-.4.4-.8.8-.8h2.4c.4 0 .8.4.8.8V6M6.5 6.5l.6 8c0 .6.5 1 1 1h3.8c.5 0 1-.4 1-1l.6-8',
		check: 'M4.5 10.5l3.5 3.5 7.5-8',
		refresh: 'M15.5 10a5.5 5.5 0 1 1-1.6-3.9M15.5 3.5v3h-3',
		close: 'M5.5 5.5l9 9M14.5 5.5l-9 9',
		spend: 'M10 3v14M5.5 8.5L10 4l4.5 4.5',
		income: 'M10 17V3M5.5 11.5L10 16l4.5-4.5',
		calendar:
			'M4 6.5A1.5 1.5 0 0 1 5.5 5h9A1.5 1.5 0 0 1 16 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 14.5v-8zM4 8.5h12M7 3.5v3M13 3.5v3',
		chart: 'M4 16V9M8.5 16V4M13 16v-5M17 16H3',
		settings:
			'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM10 3v1.8M10 15.2V17M3 10h1.8M15.2 10H17M5.1 5.1l1.3 1.3M13.6 13.6l1.3 1.3M5.1 14.9l1.3-1.3M13.6 6.4l1.3-1.3',
		wallet:
			'M4 6.5A1.5 1.5 0 0 1 5.5 5H15a1 1 0 0 1 1 1v1.5M4 6.5v7A1.5 1.5 0 0 0 5.5 15H15a1 1 0 0 0 1-1v-2M4 6.5h10.5a1.5 1.5 0 0 1 1.5 1.5v4M13 10.5h3v0',
		target: 'M10 16a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
		search: 'M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM13.5 13.5L17 17',
		list: 'M7 5h10M7 10h10M7 15h10M3.5 5h.01M3.5 10h.01M3.5 15h.01',
		repeat:
			'M5 8V7a2 2 0 0 1 2-2h8M12.5 2.5L15 5l-2.5 2.5M15 12v1a2 2 0 0 1-2 2H5M7.5 17.5L5 15l2.5-2.5'
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 20 20"
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={paths[name]} />
</svg>
