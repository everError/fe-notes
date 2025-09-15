<script setup lang="ts">
import { DefaultChatTransport, type UIMessage } from 'ai';
import { getTextFromMessage } from '@nuxt/ui/utils/ai';
import { useClipboard } from '@vueuse/core';
import type { DefineComponent } from 'vue';
import ProseStreamPre from '../../components/prose/PreStream.vue';
import { Chat } from '@ai-sdk/vue';
import { useTable } from '~/composables/useTable';

const components = {
  pre: ProseStreamPre as unknown as DefineComponent,
};
const input = ref('');
const toast = useToast();
function handleSubmit(e: Event) {
  e.preventDefault();
  if (input.value.trim()) {
    chat.sendMessage({
      text: input.value,
    });
    input.value = '';
  }
}
// 샘플
const data = ref({
  id: 'chat_abc123xyz', // 채팅방의 고유 ID (문자열 또는 숫자)
  messages: [
    {
      id: '6045235a-a435-46b8-989d-2df38ca2eb47',
      role: 'user',
      parts: [
        {
          type: 'text',
          text: 'Hello, how are you?',
        },
      ],
    },
    {
      id: '7a92b3c1-d5f8-4e76-b8a9-3c1e5fb2e0d8',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: 'I am doing well, thank you for asking! How can I assist you today?',
        },
      ],
    },
    {
      id: '9c84d6a7-8b23-4f12-a1d5-e7f3b9c05e2a',
      role: 'user',
      parts: [
        {
          type: 'text',
          text: 'What is the current weather in Tokyo?',
        },
      ],
    },
    {
      id: 'b2e5f8c3-a1d9-4e67-b3f2-c9d8e7a6b5f4',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: "Based on the latest data, Tokyo is currently experiencing sunny weather with temperatures around 24°C (75°F). It's a beautiful day with clear skies.",
        },
      ],
    },
  ] as any,
});
const chat = new Chat({
  id: data.value.id,
  messages: data.value.messages,
  transport: new DefaultChatTransport({
    api: `/api/service/chats/${data.value.id}`,
  }),
  onFinish() {
    refreshNuxtData('chats');
  },
  onError(error) {
    const { message } =
      typeof error.message === 'string' && error.message[0] === '{'
        ? JSON.parse(error.message)
        : error;
    toast.add({
      description: message,
      icon: 'i-lucide-alert-circle',
      color: 'error',
      duration: 0,
    });
  },
});
//
const copied = ref(false);
const clipboard = useClipboard();
function copy(e: MouseEvent, message: UIMessage) {
  clipboard.copy(getTextFromMessage(message));

  copied.value = true;

  setTimeout(() => {
    copied.value = false;
  }, 2000);
}
//
</script>

<template>
  <UDashboardPanel id="chat" class="relative" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <DashboardNavbar />
    </template>
    <template #body>
      <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6 p-6">
        <UChatMessages
          :assistant="{
            actions: [
              {
                label: 'Copy',
                icon: copied ? 'i-lucide-copy-check' : 'i-lucide-copy',
                onClick: copy,
              },
            ],
          }"
          class="lg:pt-(--ui-header-height) pb-4 sm:pb-6"
          :spacing-offset="160"
          :status="chat.status"
          :messages="chat.messages"
        >
          <template #content="{ message }">
            <div class="space-y-4">
              <template
                v-for="(part, index) in message.parts"
                :key="`${part.type}-${index}-${message.id}`"
              >
                <UButton
                  v-if="part.type === 'reasoning' && part.state !== 'done'"
                  label="Thinking..."
                  variant="link"
                  color="neutral"
                  class="p-0"
                  loading
                />

                <UTable
                  v-if="part.type === 'data-sheet'"
                  :data="(part.data as any[])"
                  :columns="useTable(part.data as any[])"
                  class="w-full"
                />

                <MDCCached
                  v-else-if="part.type === 'text'"
                  :value="getTextFromMessage(message)"
                  :cache-key="message.id"
                  unwrap="p"
                  :components="components"
                  :parser-options="{ highlight: false }"
                />
              </template>
            </div>
          </template>
        </UChatMessages>

        <UChatPrompt
          v-model="input"
          :error="chat.error"
          variant="subtle"
          placeholder="무엇을 도와드릴까요?"
          class="sticky bottom-0 [view-transition-name:chat-prompt] rounded-b-none z-10"
          @submit="handleSubmit"
        >
          <UChatPromptSubmit
            :status="chat.status"
            class="rounded-full cursor-pointer"
            @stop="chat.stop"
            @reload="chat.regenerate"
          />
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
