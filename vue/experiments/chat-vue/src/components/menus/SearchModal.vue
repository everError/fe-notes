<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    :dismissableMask="true"
    :closable="false"
    :draggable="false"
    class="w-full max-w-3xl m-2"
    :pt="{
      root: { class: 'border-none shadow-xl' },
      mask: { class: 'backdrop-blur-sm' }
    }"
  >
    <template #container>
      <div class="w-full max-w-3xl bg-white rounded-lg shadow-2xl">
        <!-- 검색 헤더 -->
        <div class="flex items-center gap-3 p-4 border-b border-gray-200">
          <i class="pi pi-search text-gray-400"></i>
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="검색"
            class="flex-1 outline-none text-base"
            @input="handleSearch"
            @keydown.down.prevent="moveSelection(1)"
            @keydown.up.prevent="moveSelection(-1)"
            @keydown.enter="selectChat"
            @keydown.esc="closeModal"
          />
          <button
            class="text-xs text-gray-500 cursor-pointer px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
            @click="closeModal"
          >
            ESC
          </button>
        </div>

        <!-- 결과 카운트 -->
        <div
          v-if="searchQuery"
          class="px-4 py-2 text-sm text-gray-600 border-b border-gray-200"
        >
          검색된 채팅 {{ filteredChats.length }}개
          <!-- <button class="text-blue-600 hover:underline ml-2">선택</button> -->
        </div>

        <!-- 검색 결과 목록 -->
        <div class="max-h-126 overflow-y-auto">
          <div
            v-for="(chat, index) in filteredChats"
            :key="chat.id"
            class="px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
            :class="{
              'bg-blue-50': selectedIndex === index,
              'hover:bg-gray-50': selectedIndex !== index
            }"
            @click="goToChat(chat.id)"
            @mouseenter="selectedIndex = index"
          >
            <div class="font-medium text-sm mb-1">{{ chat.title }}</div>
            <!-- <div class="text-xs text-gray-500">
              {{ chat.subtitle || '마지막 메시지' }}
            </div> -->
          </div>

          <!-- 검색 결과 없음 -->
          <div
            v-if="searchQuery && filteredChats.length === 0"
            class="px-4 py-8 text-center text-gray-500"
          >
            <i class="pi pi-inbox text-3xl mb-2 block"></i>
            <div class="text-sm">검색 결과가 없습니다</div>
          </div>

          <!-- 검색어 입력 전 -->
          <!-- <div v-if="!searchQuery" class="px-4 py-8 text-center text-gray-400">
            <i class="pi pi-search text-3xl mb-2 block"></i>
            <div class="text-sm">채팅을 검색하세요</div>
          </div> -->
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import { useChatStore } from '@/stores/chat'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'chat-selected': [chatId: string]
}>()

const router = useRouter()
const chatStore = useChatStore()

const searchInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const selectedIndex = ref(0)

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 검색 결과 필터링
const filteredChats = computed(() => {
  if (!searchQuery.value.trim()) {
    return chatStore.chatList
  }

  const query = searchQuery.value.toLowerCase()
  return chatStore.chatList.filter((chat) =>
    chat.title?.toLowerCase().includes(query)
  )
})

// 검색 처리
const handleSearch = () => {
  selectedIndex.value = 0
}

// 키보드 네비게이션
const moveSelection = (direction: number) => {
  const newIndex = selectedIndex.value + direction
  if (newIndex >= 0 && newIndex < filteredChats.value.length) {
    selectedIndex.value = newIndex
  }
}

// 채팅 선택
const selectChat = () => {
  if (filteredChats.value.length > 0 && selectedIndex.value >= 0) {
    const chat = filteredChats.value[selectedIndex.value]
    goToChat(chat.id)
  }
}

// 채팅으로 이동
const goToChat = (chatId?: string) => {
  if (!chatId) return

  closeModal()
  emit('chat-selected', chatId)
  router.push(`/chat/${chatId}`)
}

// 모달 닫기
const closeModal = () => {
  isVisible.value = false
  searchQuery.value = ''
  selectedIndex.value = 0
}

// 모달이 열릴 때 검색창에 포커스
watch(
  () => props.visible,
  async (newValue) => {
    if (newValue) {
      await nextTick()
      searchInput.value?.focus()
    }
  }
)
</script>
