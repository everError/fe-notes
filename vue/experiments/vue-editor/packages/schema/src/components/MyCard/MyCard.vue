<template>
  <div class="border rounded shadow p-4">
    <h2 class="font-bold text-lg mb-2">{{ title }}</h2>
    <div class="flex flex-col gap-y-4">
      <slot name="first"></slot>
      <slot name="second"></slot>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ title: string }>();
</script>
