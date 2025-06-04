<template>
  <div class="border rounded shadow p-4">
    <h2 class="font-bold text-lg mb-2">{{ title }}</h2>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();
</script>
