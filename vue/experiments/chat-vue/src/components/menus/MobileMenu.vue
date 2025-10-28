<template>
  <Drawer v-model:visible="visible">
    <template #container="{ closeCallback }">
      <div class="h-full">
        <MenuContent :visible="true" @mobile-menu-toggle="visible = !visible" />
      </div>
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import Drawer from 'primevue/drawer'
import MenuContent from './MenuContent.vue'

const visible = defineModel<boolean>('visible', { default: true })
</script>
