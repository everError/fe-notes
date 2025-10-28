<!-- MessageFooter.vue (변경 없음) -->
<template>
  <div
    v-if="message.role === Role.ASSISTANT && message.done && message.content"
    class="ml-2 flex items-start space-x-2"
  >
    <!-- 또는 inline-block으로 배치 -->
    <CopyButton :text="message.content" />
    <RetryButton :message="message" />
  </div>
</template>

<script setup lang="ts">
import CopyButton from '@/components/buttons/CopyButton.vue'
import { Role, type ChatMessage } from '@/stores/chat'
import RetryButton from '@/components/buttons/RetryButton.vue'

defineProps<{
  message: ChatMessage
}>()
</script>
