<template>
  <div class="flex flex-col items-center h-full w-full">
    <ChatScrollPanel
      class="h-full w-full"
      v-model:messages="chatStore.currentChat.messages"
      v-model:is-at-bottom="isAtBottom"
      ref="scrollRef"
    >
      <div class="flex flex-col">
        <div
          v-for="(message, index) in chatStore.currentChat.messages"
          :key="index"
          class="flex mb-4"
          :class="{ 'justify-end': message.role === 'user' }"
        >
          <div
            class="transition-all duration-300"
            :class="{ 'w-full': message.role === 'assistant' }"
          >
            <ChatMessage
              :message="message"
              :index="index"
              :loading="chatStore.loading"
              :max-length="chatStore.currentChat.messages.length"
            />
          </div>
        </div>
      </div>
    </ChatScrollPanel>
    <div class="px-4 w-full max-w-3xl flex flex-row-reverse absolute bottom-36">
      <i
        v-if="!isAtBottom"
        @click="scrollRef.scrollToBottom"
        class="pi pi-angle-down p-2 bg-zinc-300/80 text-white rounded-full cursor-pointer"
      />
    </div>
    <div class="px-4 w-full max-w-3xl sticky bottom-0 z-10">
      <div class="bg-zinc-50/90 pb-2 flex flex-col gap-2 rounded-2xl">
        <InputQuery
          v-model="input"
          v-model:loading="chatStore.loading"
          placeholder="무엇을 도와드릴까요?"
          class="w-full"
          @on-send="sendMessage"
          @on-abort="handleAbort"
        />
        <p class="text-xs text-gray-500 text-center">
          AI 모델은 실수를 할 수 있습니다. 중요한 정보는 재차 확인하세요.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import InputQuery from '@/components/inputs/InputQuery.vue'
import ChatScrollPanel from '@/components/panels/ChatScrollPanel.vue'
import ChatMessage from '@/components/messages/ChatMessage.vue'

const route = useRoute()
const id = route.params.id as string
const chatStore = useChatStore()
const scrollRef = ref()
const isAtBottom = ref(false)

const input = ref('')

onMounted(async () => {
  // TODO: => 채팅 내역 조회
  // 새로운 채팅일 경우. (index.vue -> [id].vue)
  if (id === 'sample') {
    await chatStore.askAsync()
  }
  // 기존 채팅일 경우
  else {
    // TODO: 기존 채팅 내역 바인딩
    scrollRef.value.scrollToBottom()
  }
})

onUnmounted(() => {})

const sendMessage = async (input: string) => {
  if (input) {
    chatStore.addUserMessage(input)
    await chatStore.askAsync(scrollRef.value.scrollToBottom)
  }
}

const handleAbort = async () => {
  chatStore.abortRequest()
}
</script>

<style scoped>
/* 로딩 스피너 애니메이션 */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 패널 전환 애니메이션 */
:deep(.p-panel) {
  transition: all 0.3s ease;
}

/* 커스텀 아이콘 스타일 */
:deep(.p-panel .p-panel-header) .pi {
  font-size: 1rem;
  transition: transform 0.3s ease;
}
</style>
