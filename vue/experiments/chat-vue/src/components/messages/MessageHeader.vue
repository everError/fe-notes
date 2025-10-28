<template>
  <div v-if="message.role === Role.ASSISTANT">
    <ProgressSpinner
      style="width: 20px; height: 20px"
      v-if="isLastMessage && loading && !message.content && !message.thinking"
    />
    <ThinkingPanel
      v-if="message.thinking"
      v-model="message.thinking"
      v-model:done="message.done"
      v-model:content="message.content"
    />
  </div>
</template>

<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner'
import ThinkingPanel from '@/components/panels/ThinkingPanel.vue'
import { Role, type ChatMessage } from '@/stores/chat'

defineProps<{
  message: ChatMessage
  isLastMessage: boolean
  loading: boolean
}>()
</script>
