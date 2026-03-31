<template>
  <Card class="min-h-[17rem]">
    <template v-if="title || $slots.headerRight" #header>
      <div
        class="flex items-center justify-between pl-2 py-2.5 border-b border-surface-200n w-full"
      >
        <div v-if="title" class="flex-1 items-center gap-2">
          <i v-if="icon" :class="icon" class="text-sm text-surface-500" />
          <span class="text-sm font-semibold text-surface-700">{{
            title
          }}</span>
        </div>
        <div class="flex items-center gap-2">
          <slot name="headerRight" />
        </div>
      </div>
    </template>
    <template #content>
      <scroll-panel class="w-full p-0 h-full" :class="contentClass">
        <slot />
      </scroll-panel>
    </template>
    <template v-if="$slots.footer" #footer>
      <div
        class="flex justify-end gap-2 px-4 py-2.5 border-t border-surface-200"
      >
        <slot name="footer" />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { Card, ScrollPanel } from 'primevue';

export interface ACardProps {
  /** 카드 제목 */
  title?: string;
  /** 제목 앞 아이콘 (PrimeIcons 클래스) */
  icon?: string;
  /** content slot의 클래스 */
  contentClass?: string;
}

defineProps<ACardProps>();
</script>
