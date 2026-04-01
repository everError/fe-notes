<template>
  <Card :pt="{ body: { class: 'p-0' } }">
    <template #content>
      <div
        class="p-4 gap-x-4 gap-y-5"
        :style="{
          gridTemplateColumns: `repeat(var(--query-cols), minmax(0, 1fr))`,
        }"
        :class="gridClass"
      >
        <slot />
        <AButton
          :label="searchLabel"
          :icon="searchIcon"
          style="place-self: end"
          size="small"
          @click="emit('search')"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Card } from 'primevue';
import AButton from '../button/AButton.vue';

export interface AQueryCardProps {
  /** 그리드 컬럼 수 (PC 기준) */
  cols?: number;
  /** 검색 버튼 표시 */
  showSearchButton?: boolean;
  /** 검색 버튼 텍스트 */
  searchLabel?: string;
  /** 검색 버튼 아이콘 */
  searchIcon?: string;
}

const props = withDefaults(defineProps<AQueryCardProps>(), {
  cols: 4,
  showSearchButton: true,
  searchLabel: '검색',
  searchIcon: 'pi pi-search',
});

const emit = defineEmits<{
  search: [];
}>();

/**
 * Tailwind 반응형 그리드 클래스
 * CSS Grid + Tailwind breakpoint로 resize 리스너 불필요
 */
const gridClass = computed(() => {
  // cols 값에 따라 반응형 그리드 클래스 매핑
  const colMap: Record<number, string> = {
    1: 'grid grid-cols-1',
    2: 'grid grid-cols-1 sm:grid-cols-2',
    3: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
  };
  return colMap[props.cols] ?? colMap[4];
});

/** 검색 버튼을 마지막 열에 배치 */
const searchButtonColClass = computed(() => {
  const map: Record<number, string> = {
    1: '',
    2: 'sm:col-start-2',
    3: 'md:col-start-3',
    4: 'lg:col-start-4',
    5: 'lg:col-start-5',
    6: 'xl:col-start-6',
  };
  return map[props.cols] ?? '';
});
</script>
