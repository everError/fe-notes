<template>
  <button
    class="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
  >
    {{ text }}
  </button>
</template>

<script setup lang="ts">
defineProps<{ text: string }>();
</script>
