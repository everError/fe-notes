<template>
  <div class="flex flex-col h-full">
    <header></header>
    <div class="h-full flex flex-1 overflow-hidden">
      <aside class="flex-shrink-0 bg-zinc-50">
        <DesktopMenu class="hidden lg:block" v-model:visible="showDesktopSidebar" />
        <MobileMenu class="lg:hidden" v-model:visible="showMobileSidebar" />
      </aside>
      <main class="max-h-full flex-1 flex-col overflow-hidden">
        <Header
          @toggle-mobile-menu="() => (showMobileSidebar = !showMobileSidebar)"
        />
        <slot name="main" />
      </main>
    </div>
  </div>
  <Toast group="basic">
    <template #message="slotProps">
      <div class="flex flex-col items-start flex-auto">
        <span class="text-sm">{{ slotProps.message.detail }}</span>
      </div>
    </template>
  </Toast>
  <ConfirmDialog group="basic">
    <template #container="{ message, acceptCallback, rejectCallback }">
      <div
        class="flex flex-col items-center p-5 bg-white dark:bg-surface-900 rounded-lg max-w-sm"
      >
        <div
          class="rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 inline-flex justify-center items-center h-12 w-12"
        >
          <i class="pi pi-exclamation-triangle text-lg"></i>
        </div>
        <span class="font-semibold text-sm block mt-3 mb-1.5">{{
          message.header
        }}</span>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-0 text-center px-2">
          {{ message.message }}
        </p>
        <div class="flex items-center gap-2 mt-4 w-full">
          <Button
            :label="message.rejectLabel || '취소'"
            @click="rejectCallback"
            severity="secondary"
            outlined
            class="flex-1 text-sm h-9"
          />
          <Button
            :label="message.acceptLabel || '확인'"
            @click="acceptCallback"
            severity="danger"
            class="flex-1 text-sm h-9"
          />
        </div>
      </div>
    </template>
  </ConfirmDialog>
</template>

<script setup lang="ts">
import Header from '@/components/Header.vue'
import DesktopMenu from '@/components/menus/DesktopMenu.vue'
import MobileMenu from '@/components/menus/MobileMenu.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'

const showMobileSidebar = ref(false)
const showDesktopSidebar = ref(true)

// 화면 크기 변경 감지
const handleResize = () => {
  // lg 브레이크포인트 (1024px) 이상이면 모바일 메뉴 닫기
  if (window.innerWidth >= 1024) {
    showMobileSidebar.value = false
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>
