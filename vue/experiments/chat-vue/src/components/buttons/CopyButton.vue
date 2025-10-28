<template>
  <i
    :class="isCopied ? 'pi pi-check' : 'pi pi-clone text-gray-500'"
    class="cursor-pointer inline-block hover:text-primary"
    title="복사"
    @click="copy"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useClipboard } from '@vueuse/core'

const props = defineProps<{
  text: string
}>()

const { copy: clipboardCopy } = useClipboard()

const isCopied = ref(false)

const copy = async () => {
  await clipboardCopy(props.text)
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 1200)
}
</script>
