<script setup lang="ts">
const open = ref(false);
const collapsedRef = ref(false);
watch(open, (val) => {
  if (val) {
    // 사이드바 닫힐 때 포커스 해제
    document.activeElement instanceof HTMLElement && document.activeElement.blur();
  }
});
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
        content: 'w-80 sm:p-0 pl-4 ',
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

          <!-- TODO: 채팅 목록 items 바인딩 필요-->
          <UNavigationMenu
            v-if="!collapsed"
            :collapsed="collapsed"
            orientation="vertical"
            :ui="{ link: 'overflow-hidden' }"
          >
            <!-- TODO: 아이템 버튼 -->
          </UNavigationMenu>
        </div>
      </template>
    </UDashboardSidebar>
    <slot />
    <!-- TODO: UDashboardSearch -->
  </UDashboardGroup>
</template>
