<template>
  <div class="flex items-center w-full">
    <Panel
      :pt="{
        root: {
          class: 'border-none bg-transparent shadow-none w-full'
        }
      }"
      :toggleable="false"
    >
      <template #header>
        <button
          @click="toggle"
          class="text-gray-600 focus:outline-none flex items-center cursor-pointer"
        >
          <i
            class="pi"
            :class="{ 'pi-angle-down': collapsed, 'pi-angle-up': !collapsed }"
          />
          <span class="ml-2 text-xs" v-if="!done">Generating response..</span>
        </button>
      </template>
      <MarkdownViewer
        v-if="!collapsed"
        class="text-sm text-gray-700 bg-white rounded-4xl p-4 border border-zinc-200"
        :content="model!"
      />
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Panel from 'primevue/panel'
import MarkdownViewer from '../viewers/MarkdownViewer.vue'

const model = defineModel<string>()
const done = defineModel<boolean>('done')
const content = defineModel<string>('content')

const collapsed = ref(false)
const hasToggled = ref(false) // 플래그: 한 번 toggle 호출 후 true로 설정

const toggle = () => {
  collapsed.value = !collapsed.value
}

// content가 빈 값에서 비어있지 않은 값으로 변경되는 순간, collapsed가 false이고 hasToggled가 false이면 toggle 호출 후 플래그 설정
watch(
  () => content.value,
  (newVal, oldVal) => {
    if (
      newVal &&
      newVal.trim() !== '' &&
      (!oldVal || oldVal.trim() === '') &&
      !collapsed.value &&
      !hasToggled.value
    ) {
      toggle()
      hasToggled.value = true // 한 번 호출 후 플래그 설정으로 이후 검사 방지
    }
  },
  { immediate: false }
)
</script>

<style scoped>
/* Panel 기본 스타일 오버라이드 */
:deep(.p-panel) {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* 헤더 및 콘텐츠 스타일 */
:deep(.p-panel-header) {
  padding: 0.25rem !important;
  background: transparent !important;
}
</style>
