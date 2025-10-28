<template>
  <div
    v-if="message.content"
    :class="[
      'pl-3 pr-3 pb-2 rounded-xl',
      message.role === Role.USER
        ? 'text-base lg:max-w-md max-w-xs shadow-xs bg-white border-zinc-100 border-1 pt-2'
        : 'text-base prose prose-sm max-w-3xl'
    ]"
  >
    <div v-if="message.role === Role.USER">
      {{ message.content }}
    </div>
    <MarkdownViewer v-else :content="message.content" />
  </div>
</template>

<script setup lang="ts">
import { Role } from '@/stores/chat'
import type { ChatMessage } from '@/stores/chat'
import MarkdownViewer from '../viewers/MarkdownViewer.vue'

const props = defineProps<{
  message: ChatMessage
}>()
</script>
