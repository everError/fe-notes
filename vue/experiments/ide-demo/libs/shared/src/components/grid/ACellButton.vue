<template>
  <AButton
    v-if="!params.hidden"
    class="w-full h-full underline text-xs"
    :label="params.label"
    text
    @click="params.onClick"
  />
</template>

<script setup lang="ts">
import AButton from "../button/AButton.vue";

/** AG Grid cellRenderer params */
defineProps<{ params: any }>();
</script>
