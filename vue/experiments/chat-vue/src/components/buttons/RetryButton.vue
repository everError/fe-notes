<template>
  <i
    class="pi pi-refresh cursor-pointer inline-block text-gray-500 hover:text-primary"
    title="재시도"
    @click="retry"
  />
</template>

<script setup lang="ts">
import { Role, useChatStore } from '@/stores/chat'
import type { ChatMessage } from '@/stores/chat'

const props = defineProps<{
  message: ChatMessage
}>()

const retry = async () => {
  if (props.message.role === Role.ASSISTANT) {
    const chatStore = useChatStore()
    await chatStore.retryAskAsync(props.message.id)
  }
}
</script>
