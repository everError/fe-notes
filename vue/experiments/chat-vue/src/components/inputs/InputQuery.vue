<template>
  <div
    class="bg-white h-auto shadow-xs border-gray-200 border-1 w-full mx-auto rounded-2xl p-2 cursor-text"
    @click="focusTextarea"
  >
    <textarea
      name="prompt"
      v-model="input"
      placeholder="무엇을 도와드릴까요?"
      class="w-full shadow-none rounded-lg scrollbar-thin placeholder:text-md"
      :disabled="loading"
      :rows="1"
      @keydown.enter.exact.prevent="preventDefaultOnEnter"
      @keyup.enter.exact="handleSend"
      @input="adjustHeight"
      ref="textareaRef"
    />
    <div class="w-full justify-end flex p-1">
      <Button
        :icon="loading ? 'pi pi-stop' : 'pi pi-arrow-up'"
        class="p-button-primary w-7 h-7"
        @click="handleSend"
        :disabled="!loading && !input"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'

const input = ref('')
const loading = defineModel<boolean>('loading')
const emits = defineEmits<{
  (event: 'onSend', input: string): Promise<void>
  (event: 'onAbort'): Promise<void>
}>()
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// textarea에 포커스 주는 함수
const focusTextarea = () => {
  if (textareaRef.value && !loading.value) {
    textareaRef.value.focus()
  }
}

const handleSend = async () => {
  const query = input.value.trim()
  if (query && !loading.value) {
    await emits?.('onSend', query)
    input.value = ''
    await nextTick(() => adjustHeight())
  } else if (loading.value) {
    await emits?.('onAbort')
  }
}

const preventDefaultOnEnter = (event: KeyboardEvent) => {
  if (!event.shiftKey) {
    event.preventDefault()
  }
}

const adjustHeight = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    const minHeight = 40
    const maxHeight = 200
    const scrollHeight = textareaRef.value.scrollHeight
    const newHeight = Math.min(maxHeight, Math.max(minHeight, scrollHeight))
    textareaRef.value.style.height = `${newHeight}px`

    if (scrollHeight > maxHeight) {
      textareaRef.value.style.overflowY = 'auto'
    } else {
      textareaRef.value.style.overflowY = 'hidden'
    }
  }
}

onMounted(() => adjustHeight())
onUnmounted(() => {
  if (textareaRef.value) textareaRef.value.style.height = 'auto'
})
</script>

<style scoped>
textarea {
  min-height: 40px;
  max-height: 200px;
  padding: 4px;
  border: none;
  resize: none;
  box-sizing: border-box;
}

textarea:focus {
  outline: none;
  box-shadow: none;
}
</style>
