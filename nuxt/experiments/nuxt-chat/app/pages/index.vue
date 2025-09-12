<script setup lang="ts">
const input = ref('');
const loading = ref(false);

async function createChat(prompt: string) {
  if (loading.value) return;
  loading.value = true;

  const chat = {
    id: 'sample',
  };
  refreshNuxtData('chats');
  navigateTo(`/chat/${chat?.id}`);
}
function onSubmit() {
  createChat(input.value);
}

// 샘플 질문
const quickChats = [
  {
    label: '오늘 날씨가 어떤가요?',
    icon: 'i-lucide-sun',
  },
  {
    label: '사용 팁을 알려주세요',
    icon: 'i-lucide-lightbulb',
  },
];
</script>

<template>
  <UDashboardPanel id="home" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <DashboardNavbar />
    </template>
    <template #body>
      <UContainer class="flex-1 flex flex-col justify-center gap-6 py-8">
        <h1
          class="text-2xl font-bold text-center mb-30 bg-gradient-to-r from-emerald-600 to-sky-300 text-transparent bg-clip-text animate-pulse"
        >
          안녕하세요.
        </h1>

        <UChatPrompt
          v-model="input"
          :status="loading ? 'streaming' : 'ready'"
          class="[view-transition-name:chat-prompt]"
          variant="subtle"
          placeholder="무엇을 도와드릴까요?"
          @submit="onSubmit"
        >
          <UChatPromptSubmit class="rounded-full cursor-pointer" />
        </UChatPrompt>

        <div class="flex flex-wrap gap-2 justify-center">
          <UButton
            v-for="quickChat in quickChats"
            :key="quickChat.label"
            :icon="quickChat.icon"
            :label="quickChat.label"
            size="sm"
            color="neutral"
            variant="outline"
            class="rounded-full cursor-pointer"
            @click="createChat(quickChat.label)"
          />
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
