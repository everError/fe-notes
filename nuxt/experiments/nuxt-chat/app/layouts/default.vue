<script setup lang="ts">
import { LazyModalConfirm } from '#components'

const route = useRoute()
const open = ref(false)
const toast = useToast()
const overlay = useOverlay()
const collapsedRef = ref(false)
const { data: chats, refresh: refreshChats } = await useFetch(
  '/api/service/chats-list',
  {
    key: 'chats',
    transform: (data: any) =>
      data.map((chat: any) => ({
        id: chat.id,
        label: chat.title || 'Untitled',
        to: `/chat/${chat.id}`,
        icon: 'i-lucide-message-circle',
        createdAt: chat.createdAt
      }))
  }
)
const deleteModal = overlay.create(LazyModalConfirm, {
  props: {
    title: 'Delete chat',
    description: 'Are you sure you want to delete this chat? This cannot be undone.'
  }
})
async function deleteChat(id: string) {
  const instance = deleteModal.open()
  const result = await instance.result
  if (!result) {
    return
  }

  await $fetch(`/api/service/chats/${id}`, { method: 'DELETE' })

  toast.add({
    title: 'Chat deleted',
    description: 'Your chat has been deleted',
    icon: 'i-lucide-trash'
  })

  refreshChats()

  if (route.params.id === id) {
    navigateTo('/')
  }
}
const { groups } = useChats(chats)
watch(open, (val) => {
  if (val) {
    // 사이드바 열릴 때 포커스 해제
    document.activeElement instanceof HTMLElement && document.activeElement.blur()
  }
})
const items = computed(() =>
  groups.value?.flatMap((group) => {
    return [
      {
        label: group.label,
        type: 'label' as const
      },
      ...group.items.map((item) => ({
        ...item,
        slot: 'chat' as const,
        icon: undefined,
        class: item.label === 'Untitled' ? 'text-muted' : ''
      }))
    ]
  })
)
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      v-model:collapsed="collapsedRef"
      collapsible
      class="bg-elevated/50 transition-all duration-300 ease-in-out border-0"
      :class="collapsedRef ? 'w-10' : 'w-65'"
      :ui="{
        header: 'p-2 hidden lg:block',
        body: 'flex flex-col gap-4 flex-1 overflow-y-auto pl-2 py-8 lg:py-0',
        content: 'w-80 sm:p-0 pl-4 '
      }"
    >
      <template #header>
        <UDashboardSidebarCollapse class="cursor-pointer" />
      </template>

      <template #default="{ collapsed }">
        <NuxtLink to="/" class="p-1 lg:hidden">
          <!-- TODO: Logo -->
          <span class="text-xl text-primary"> Chat </span>
        </NuxtLink>
        <div class="flex flex-col gap-1.5">
          <UButton
            v-bind="
              collapsed
                ? { icon: 'i-lucide-search' }
                : { label: '채팅 검색', icon: 'i-lucide-search' }
            "
            variant="ghost"
            class="text-gray-600 pl-2 cursor-pointer"
          />
          <UButton
            v-bind="
              collapsed
                ? { icon: 'i-lucide-plus' }
                : { label: '새 채팅', icon: 'i-lucide-plus' }
            "
            variant="ghost"
            class="text-gray-600 pl-2"
            to="/"
            @click="open = false"
          />

          <UNavigationMenu
            v-if="!collapsed"
            :items="items"
            :collapsed="collapsed"
            orientation="vertical"
            :ui="{ link: 'overflow-hidden' }"
          >
            <template #chat-trailing="{ item }">
              <div
                class="flex -mr-1.25 translate-x-full group-hover:translate-x-0 transition-transform"
              >
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  class="text-muted hover:text-primary hover:bg-accented/50 focus-visible:bg-accented/50 p-0.5"
                  tabindex="-1"
                  @click.stop.prevent="deleteChat((item as any).id)"
                />
              </div>
            </template>
          </UNavigationMenu>
        </div>
      </template>
    </UDashboardSidebar>
    <slot />
    <UDashboardSearch
      placeholder="Search chats..."
      :groups="[
        {
          id: 'links',
          items: [
            {
              label: 'New chat',
              to: '/',
              icon: 'i-lucide-square-pen'
            }
          ]
        },
        ...groups
      ]"
    />
  </UDashboardGroup>
</template>
