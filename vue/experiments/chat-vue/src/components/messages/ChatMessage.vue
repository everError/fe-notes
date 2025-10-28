<!-- 메인 컴포넌트: ChatMessage.vue (세 부분 조합) -->
<template>
  <div
    class="w-full"
    :class="{
      'lg:min-h-[calc(100vh-10rem)] min-h-[calc(100vh-12rem)]': isLastMessage
    }"
  >
    <MessageHeader
      :message="message"
      :is-last-message="isLastMessage"
      :loading="loading"
    />
    <MessageContent :message="message" :index="index" :max-length="maxLength" />
    <MessageFooter :message="message" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MessageHeader from './MessageHeader.vue'
import MessageContent from './MessageContent.vue'
import MessageFooter from './MessageFooter.vue'
import type { ChatMessage } from '@/stores/chat'

const props = defineProps<{
  message: ChatMessage
  index: number
  loading: boolean
  maxLength: number
}>()

const isLastMessage = computed(() => {
  return props.index === props.maxLength - 1
})
</script>
