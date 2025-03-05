<template>
  <div class="h-full">
    <InputNumber
      class="bg-white text-9xl"
      v-model="value"
      inputId="integeronly"
      fluid
    />
  </div>
</template>

<script setup lang="ts">
import InputNumber from 'primevue/inputnumber';
const value = 12351;
</script>
