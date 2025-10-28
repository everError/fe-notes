<template>
  <div
    class="rounded-2xl h-full duration-300 transition-all flex-shrink-0 border-r-1 bg-white border-zinc-200"
    :class="{
      'w-62': visible,
      'w-12': !visible,
      'cursor-ew-resize': !visible
    }"
    @click="handleClick"
  >
    <MenuContent :visible="visible">
      <template #toggle-button>
        <Button
          :icon="visible ? 'pi pi-chevron-left' : 'pi pi-chevron-right'"
          severity="secondary"
          class="w-full p-button-sm justify-start pl-2 h-10 whitespace-nowrap"
          @click="toggle"
          variant="text"
        />
      </template>
    </MenuContent>
  </div>
</template>

<script setup lang="ts">
import MenuContent from './MenuContent.vue'

const visible = defineModel<boolean>('visible', { default: true })

const toggle = (event: MouseEvent) => {
  visible.value = !visible.value
  event.stopPropagation()
}

const handleClick = (event: MouseEvent) => {
  if (visible.value) {
    return
  }
  visible.value = !visible.value
}
</script>
