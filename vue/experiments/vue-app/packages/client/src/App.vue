<template>
  <div>
    <component :is="layoutComponent">
      <router-view />
    </component>
    <Toast />
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import EmptyLayout from '@shared/layouts/empty-layout.vue';
import DefaultLayout from '@/layouts/layout.vue';
import Toast from 'primevue/toast';

const route = useRoute();
const layoutComponent = computed(() => {
  return route.meta.layout ?? DefaultLayout;
});
</script>
