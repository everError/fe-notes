<template>
  <div class="h-full w-full max-w-full lg:pb-4 pb-16">
    <div
      ref="containerRef"
      class="flex flex-col items-center w-full max-h-full overflow-y-auto pb-28 p-4 scrollbar-thin"
    >
      <div class="w-full max-w-3xl pl-6 pr-3">
        <slot />
        <!-- 아래로 이동 버튼 -->
        <!-- <div class="w-full max-w-2xl flex flex-row-reverse absolute bottom-28">
          <i
            v-if="!isAtBottom"
            @click="scrollToBottom"
            class="pi pi-angle-down p-2 bg-gray-300/70 text-white rounded-full cursor-pointer"
          />
        </div> -->
      </div>
    </div>

    <!-- 스크롤 위치 버튼 -->
    <!-- <div
      class="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col space-y-1"
    >
      <button
        v-if="totalPages > 1"
        @click="prevPage"
        :disabled="currentPage === 1"
        class="p-1 bg-gray-200 text-xs rounded hover:bg-gray-300 focus:outline-none mt-2"
      >
        Prev
      </button>
      <button
        v-for="(message, index) in paginatedMessages"
        :key="message.id"
        @click="scrollToMessage(message.id)"
        :class="[
          'w-4 flex items-center justify-center rounded-none focus:outline-none hover:bg-gray-200',
          message.role === 'user'
            ? 'h-2 border-b border-gray-500'
            : 'h-3 border-b-2 border-gray-700',
          activeId === message.id ? 'bg-yellow-300' : ''
        ]"
        :title="message.content || 'No content'"
      >
      </button> -->
    <!-- 페이지네이션 버튼 -->

    <!-- <button
        v-if="totalPages > 1"
        @click="nextPage"
        :disabled="currentPage === totalPages"
        class="p-1 bg-gray-200 text-xs rounded hover:bg-gray-300 focus:outline-none"
      >
        Next
      </button>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { type ChatMessage } from '@/stores/chat'

const messages = defineModel<ChatMessage[]>('messages')
const containerRef = ref<HTMLDivElement | null>(null)
const isAtBottom = defineModel<boolean>('isAtBottom')
const activeId = ref<string | null>(null) // 현재 스크롤 위치에 해당하는 메시지 ID
const currentPage = ref(1)
const itemsPerPage = 5 // 한 페이지에 표시할 버튼 수

// TODO: 메시지 위치로 스크롤 및 관리(미정)
// 페이지네이션된 메시지
// const paginatedMessages = computed(() => {
//   const start = (currentPage.value - 1) * itemsPerPage
//   const end = start + itemsPerPage
//   return messages.value?.slice(start, end) || []
// })

const totalPages = computed(() => {
  return Math.ceil((messages.value?.length || 0) / itemsPerPage)
})

// const scrollToMessage = (id: string) => {
//   if (containerRef.value) {
//     const messageElement = containerRef.value.querySelector(`[data-id="${id}"]`)
//     if (messageElement) {
//       messageElement.scrollIntoView({ behavior: 'smooth' })
//       activeId.value = id // 스크롤 후 활성 ID 설정
//     }
//   }
// }

const scrollToBottom = () => {
  if (containerRef.value) {
    containerRef.value.scrollTo({
      top: containerRef.value.scrollHeight,
      behavior: 'smooth'
    })
    activeId.value = messages.value?.[messages.value.length - 1]?.id || null // 맨 아래로 스크롤 시 마지막 ID 활성화
  }
}

const checkScrollPosition = () => {
  if (containerRef.value) {
    const { scrollTop, scrollHeight, clientHeight } = containerRef.value
    isAtBottom.value = scrollTop + clientHeight >= scrollHeight - 10 // 10px 오차 허용
    // 현재 스크롤 위치에 맞는 메시지 ID 계산
    const messageElements = containerRef.value.querySelectorAll('[data-id]')
    messageElements.forEach((el) => {
      const rect = el.getBoundingClientRect()
      const containerRect = containerRef.value!.getBoundingClientRect()
      if (rect.top >= containerRect.top && rect.bottom <= containerRect.bottom) {
        activeId.value = el.getAttribute('data-id')
      }
    })
  }
}

// const prevPage = () => {
//   if (currentPage.value > 1) currentPage.value--
// }

// const nextPage = () => {
//   if (currentPage.value < totalPages.value) currentPage.value++
// }

onMounted(() => {
  if (containerRef.value) {
    containerRef.value.addEventListener('scroll', checkScrollPosition)
    checkScrollPosition() // 초기 상태 체크
  }
})

onUnmounted(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('scroll', checkScrollPosition)
  }
})

defineExpose({
  scrollToBottom
})

// watch(
//   () => messages.value?.length,
//   () => {
//     if (containerRef.value && isAtBottom.value) {
//       scrollToBottom()
//     }
//     if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
//   }
// )
</script>
<style>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: gray;
  scrollbar-highlight-color: darkgrey;
}
</style>
