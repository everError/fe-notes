<template>
  <DefaultLayout>
    <template #main>
      <div class="h-full bg-zinc-50 max-h-full">
        <RouterView />
      </div>
    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import DefaultLayout from './layouts/DefaultLayout.vue'
import { RouterView } from 'vue-router'
import { useChatStore } from './stores/chat'

const chatStore = useChatStore()
// TODO: 채팅 목록 받아오기, 최신 날짜가 먼저 오도록
onMounted(() => {
  for (let i = 1; i < 10; i++) {
    chatStore.chatList.push({
      id: `sample-${i}`,
      title: `Sample Chat ${i}: Test`,
      createdAt: `2025-10-0${i}`,
      messages: []
    })
  }
})
</script>
