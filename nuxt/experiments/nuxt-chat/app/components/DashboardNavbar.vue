<script setup lang="ts">
const user = '사용자';
const items = [
  [
    {
      label: user,
      type: 'label',
    },
  ],
  [
    {
      label: '프로필',
      icon: 'i-lucide-user',
      // to: '/profile' // 클릭 시 이동할 경로
    },
    {
      label: '설정',
      icon: 'i-lucide-settings',
      // to: '/settings'
    },
  ],
  [
    {
      label: '로그아웃',
      icon: 'i-lucide-log-out',
      // click: () => { ...로그아웃 로직... }
    },
  ],
];
</script>
<template>
  <UDashboardNavbar
    class="sticky lg:absolute top-0 inset-x-0 border-b-0 z-10 bg-default/75 backdrop-blur lg:bg-transparent lg:backdrop-blur-none pointer-events-none"
    :ui="{
      left: 'pointer-events-auto',
      right: 'pointer-events-auto',
      toggle: 'cursor-pointer',
    }"
  >
    <template #left>
      <NuxtLink to="/" class="flex items-end gap-0.5">
        <!-- TODO: Logo -->
        <span class="text-xl text-primary"> Chat </span>
      </NuxtLink>
    </template>
    <template #right>
      <UDropdownMenu
        size="lg"
        :items="items"
        :ui="{ content: 'w-42', item: 'cursor-pointer' }"
      >
        <UButton variant="ghost" class="p-0 rounded-full cursor-pointer">
          <UAvatar size="md" alt="Avatar" />
        </UButton>
      </UDropdownMenu>
    </template>
  </UDashboardNavbar>
</template>
