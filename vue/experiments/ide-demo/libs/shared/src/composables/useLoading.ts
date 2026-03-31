import { ref, computed, readonly } from 'vue';

/**
 * 현재 진행 중인 API 요청 수.
 * 모듈 레벨 싱글턴으로 모든 useLoading 인스턴스가 공유합니다.
 */
const activeCount = ref(0);

/**
 * 글로벌 로딩 상태.
 * 하나라도 API 요청이 진행 중이면 true.
 * App.vue 등에서 로딩 오버레이 표시용으로 사용합니다.
 *
 * @example
 * ```vue
 * <script setup>
 * </script>
 * <template>
 *   <div v-if="globalLoading" class="loading-overlay">로딩 중...</div>
 * </template>
 * ```
 */
export const globalLoading = readonly(computed(() => activeCount.value > 0));

/**
 * 개별 API 인스턴스용 로딩 상태 관리.
 * start()/end()를 호출하면 인스턴스 로딩 + 글로벌 카운터가 동시에 변경됩니다.
 *
 * @returns loading — 이 인스턴스의 로딩 상태 (readonly)
 * @returns start — 로딩 시작 (인스턴스 true + 글로벌 카운터 +1)
 * @returns end — 로딩 종료 (인스턴스 false + 글로벌 카운터 -1)
 */
export function useLoading() {
  /** 이 인스턴스의 로딩 상태 */
  const loading = ref(false);

  const start = () => {
    loading.value = true;
    activeCount.value++;
  };

  const end = () => {
    loading.value = false;
    activeCount.value = Math.max(0, activeCount.value - 1);
  };

  return { loading: readonly(loading), start, end };
}
