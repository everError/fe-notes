<template>
  <div class="h-full flex flex-col p-6">
    <!-- 본문 (UDashboardPanel.body 대체) -->
    <div class="flex-1 flex flex-col justify-center gap-6 py-8">
      <h1
        class="text-2xl font-bold text-center mb-12 bg-gradient-to-r from-emerald-600 to-sky-300 text-transparent bg-clip-text animate-pulse"
      >
        안녕하세요.
      </h1>

      <InputQuery
        v-model="input"
        v-model:loading="chatStore.loading"
        placeholder="무엇을 도와드릴까요?"
        class="max-w-3xl"
        @on-send="createChat"
      />

      <!-- 빠른 질문 버튼 -->
      <!-- <div class="flex flex-wrap gap-2 justify-center">
        <Button
          v-for="quickChat in quickChats"
          :key="quickChat.label"
          :label="quickChat.label"
          class="text-xs p-button-outlined p-button-neutral rounded-full cursor-pointer"
          @click="createChat(quickChat.label)"
        />
      </div> -->
      <!-- 빠른 질문 버튼 -->
      <div class="flex gap-4 justify-center max-w-2xl mx-auto w-full">
        <div
          v-for="quickChat in quickChats"
          :key="quickChat.label"
          class="bg-white flex-1 p-2 rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer"
          @click="createChat(quickChat.label)"
        >
          <div class="flex items-start gap-2 pl-2">
            <i class="pi pi-sparkles text-primary-400 text-md mt-1"></i>
            <p class="text-sm text-gray-600 leading-relaxed">
              {{ quickChat.label }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputQuery from '@/components/inputs/InputQuery.vue'
import { useChatStore } from '@/stores/chat'

// 상태
const input = ref('')
const router = useRouter()
const chatStore = useChatStore()

// 현재 채팅 정보 초기화
onMounted(() => chatStore.initCurrentChat())

// 채팅 생성 함수
async function createChat(input: string) {
  // TODO: Chat Id 설정, 채팅 추가
  chatStore.addUserMessage(input)
  await router.push('/chat/sample')
}

// 샘플 질문
const quickChats = [
  {
    label: '오늘 총 생산 실적수량을 알려주세요.'
  },
  {
    label: '월별 생산실적을 알려주세요.'
  }
]
</script>
