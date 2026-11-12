<script lang="ts">
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import WalletPanels from '#lib/components/WalletPanels.svelte';

	let { data, form }: PageProps = $props();

	/** 폼 액션 주소 — JS 없이 제출돼도 보던 달이 유지되도록 쿼리를 함께 둔다 */
	const act = (name: string) => `?/${name}&m=${data.month}`;
</script>

<svelte:head>
	<title>통장·카드 — 달통장</title>
</svelte:head>

<div class="pt-1 pb-4">
	<WalletPanels {data} {form} {act} startEditing={page.url.searchParams.get('edit') === '1'} />
</div>
