<template></template>
<script setup lang="ts">
import EmptyLayout from '@shared/layouts/empty-layout.vue';
import { definePage } from 'unplugin-vue-router/runtime';
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';

definePage({
  meta: {
    layout: EmptyLayout,
  },
});
const router = useRouter();
onMounted(() => {
  router.replace('/home');
});
</script>
