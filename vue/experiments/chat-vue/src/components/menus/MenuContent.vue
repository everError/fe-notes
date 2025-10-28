<template>
  <div class="max-h-full h-full w-full flex-shrink-0">
    <div class="flex flex-col h-full p-2">
      <!-- 상단: 로고 -->
      <div class="flex items-center mt-4 mb-4 justify-between">
        <!-- <img
          src="@/assets/icon.png"
          alt="Logo"
          class="h-6 w-auto cursor-pointer"
          @click="goHome"
        /> -->
      </div>
      <!-- 새 채팅 버튼 -->
      <Button
        icon="pi pi-plus"
        :label="'새 채팅'"
        variant="text"
        class="w-full p-button-sm justify-start pl-2 h-10 whitespace-nowrap"
        @click="goHome"
      />
      <!-- 검색 버튼 -->
      <Button
        icon="pi pi-search"
        label="검색"
        severity="secondary"
        class="w-full p-button-sm focus:outline-none justify-start mb-4 pl-2 h-10 whitespace-nowrap"
        variant="text"
        @click="
          (event: MouseEvent) => {
            showSearchModal = true
            event.stopPropagation()
          }
        "
      />
      <!-- 채팅 목록 -->
      <div
        ref="scrollContainer"
        class="flex-1 max-h-full overflow-y-auto scrollbar-thin"
      >
        <div
          v-if="visible"
          v-for="(chat, index) in sortedChatList"
          :key="chat.id"
          class="group mb-1 rounded-lg cursor-pointer flex items-center justify-between p-1 relative"
          :class="{
            'bg-zinc-100 hover:bg-zinc-100': isSelectedChat(chat.id),
            'hover:bg-zinc-100': !isSelectedChat(chat.id)
          }"
          @click="(event: MouseEvent) => goToChat(event, chat.id)"
        >
          <!-- 타이틀 영역 -->
          <div v-if="visible" class="text-sm flex flex-col min-w-0 flex-1">
            <!-- 편집 모드가 아닐 때 -->
            <span v-if="editingChatId !== chat.id" class="truncate">
              {{ chat.title }}
            </span>

            <!-- 편집 모드일 때 -->
            <input
              v-else
              :ref="setEditInputRef"
              v-model="editingTitle"
              type="text"
              class="w-full p-1 text-sm border rounded border-primary-400 focus:outline-none"
              @click.stop
              @keydown.enter="saveTitle(chat.id)"
              @keydown.esc="cancelEdit"
              @blur="saveTitle(chat.id)"
            />
          </div>

          <!-- 더보기 버튼 -->
          <button
            v-if="editingChatId !== chat.id"
            :ref="(el) => setButtonRef(el, chat.id)"
            class="rounded pl-1 pr-1 hover:bg-gray-200 transition-opacity flex-shrink-0 cursor-pointer"
            :class="{
              'opacity-100': isSelectedChat(chat.id) || openMenuId === chat.id,
              'opacity-0 group-hover:opacity-100':
                !isSelectedChat(chat.id) && openMenuId !== chat.id
            }"
            @click.stop="toggleMenu($event, chat.id)"
          >
            <i class="pi pi-ellipsis-v text-sm"></i>
          </button>
        </div>

        <!-- 더보기 메뉴 -->
        <Teleport to="body">
          <div
            v-if="openMenuId"
            class="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] py-1 min-w-[140px]"
            :style="menuPosition"
            @click.stop
          >
            <button
              class="w-full text-left px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2"
              @click="startEdit(openMenuId, getCurrentChatTitle(openMenuId))"
            >
              <i class="pi pi-pencil text-sm"></i>
              제목 변경
            </button>
            <button
              class="w-full text-left px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 text-red-600 flex items-center gap-2"
              @click="confirmDelete(openMenuId)"
            >
              <i class="pi pi-trash text-sm"></i>
              삭제
            </button>
          </div>
        </Teleport>
      </div>
      <!-- 하단: 토글 버튼 -->
      <div>
        <slot name="toggle-button" />
      </div>
    </div>
  </div>
  <!-- 검색 모달 -->
  <SearchModal
    v-model:visible="showSearchModal"
    @chat-selected="emits('mobile-menu-toggle')"
  />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import { useChatStore, type Chat } from '@/stores/chat'
import SearchModal from './SearchModal.vue'
import { useToast } from 'primevue/usetoast'

const visible = defineModel<boolean>('visible', { default: true })
const emits = defineEmits(['mobile-menu-toggle'])
const router = useRouter()
const route = useRoute()
const chatStore = useChatStore()
const confirm = useConfirm()
const sortedChatList = computed(() => {
  return [...chatStore.chatList].sort((a: Chat, b: Chat) => {
    const dateA = new Date(a.createdAt!).getTime()
    const dateB = new Date(b.createdAt!).getTime()
    return dateB - dateA // 내림차순 (최신이 위로)
  })
})

const openMenuId = ref<string | null>(null)
const editingChatId = ref<string | null>(null)
const editingTitle = ref('')
const menuPosition = ref({ top: '0px', left: '0px' })
const buttonRefs = ref<Map<string, HTMLElement>>(new Map())
const scrollContainer = ref<HTMLElement | null>(null)
const showSearchModal = ref(false)
const shouldFocus = ref(false)
const toast = useToast()

const setButtonRef = (el: any, chatId?: string) => {
  if (!chatId) return
  if (el) {
    buttonRefs.value.set(chatId, el)
  }
}

const setEditInputRef = (el: any) => {
  if (el && shouldFocus.value) {
    nextTick(() => {
      ;(el as HTMLInputElement).focus()
      ;(el as HTMLInputElement).setSelectionRange(
        0,
        (el as HTMLInputElement).value.length
      )
      shouldFocus.value = false
    })
  }
}

const getCurrentChatTitle = (chatId: string) => {
  return chatStore.chatList.find((c) => c.id === chatId)?.title || ''
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener('scroll', handleScroll)
  }
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener('scroll', handleScroll)
  }
  window.removeEventListener('resize', handleResize)
})

const handleClickOutside = () => {
  openMenuId.value = null
}

const handleScroll = () => {
  if (openMenuId.value) {
    updateMenuPosition()
  }
}

const handleResize = () => {
  if (openMenuId.value) {
    updateMenuPosition()
  }
}

const updateMenuPosition = () => {
  if (openMenuId.value) {
    const buttonElement = buttonRefs.value.get(openMenuId.value)
    if (buttonElement) {
      menuPosition.value = calculateMenuPosition(buttonElement)
    }
  }
}

const isSelectedChat = (chatId?: string) => {
  return route.params.id === chatId
}

const goToChat = (event: MouseEvent, chatId?: string) => {
  if (editingChatId.value) {
    return
  }
  openMenuId.value = null
  router.push(`/chat/${chatId}`)
  emits('mobile-menu-toggle')
  event.stopPropagation()
}

const goHome = (event: MouseEvent) => {
  openMenuId.value = null
  router.push('/')
  emits('mobile-menu-toggle')
  event.stopPropagation()
}

const startEdit = (chatId: string, currentTitle: string = '') => {
  openMenuId.value = null
  editingChatId.value = chatId
  editingTitle.value = currentTitle
  shouldFocus.value = true
}

const saveTitle = (chatId: string) => {
  if (!editingTitle.value.trim()) {
    cancelEdit()
    return
  }

  const chat = chatStore.chatList.find((c) => c.id === chatId)
  if (chat) {
    chat.title = editingTitle.value.trim()
    // TODO: 서버에 저장 API 호출
    // await chatStore.updateChatTitle(chatId, editingTitle.value.trim())
  }

  editingChatId.value = null
  editingTitle.value = ''
}

const cancelEdit = () => {
  editingChatId.value = null
  editingTitle.value = ''
  shouldFocus.value = false
}

// 삭제 확인 다이얼로그
const confirmDelete = (chatId: string) => {
  const chatTitle = getCurrentChatTitle(chatId)
  openMenuId.value = null

  confirm.require({
    message: `"${chatTitle}" 채팅을 삭제하시겠습니까?`,
    header: '채팅 삭제',
    icon: 'pi pi-info-circle',
    rejectProps: {
      label: '취소',
      severity: 'secondary',
      outlined: true
    },
    acceptProps: {
      label: '삭제',
      severity: 'danger'
    },
    accept: () => {
      deleteChat(chatId)
    },
    group: 'basic'
  })
}

const deleteChat = (chatId: string) => {
  const index = chatStore.chatList.findIndex((c) => c.id === chatId)
  if (index !== -1) {
    chatStore.chatList.splice(index, 1)
    // TODO: 서버에 삭제 API 호출
    // await chatStore.deleteChat(chatId)
  }
  toast.add({
    severity: 'success',
    summary: 'Confirmed',
    detail: '채팅이 성공적으로 삭제되었습니다.',
    group: 'basic',
    life: 2000
  })
  // 현재 보고 있는 채팅을 삭제한 경우 홈으로 이동
  if (route.params.id === chatId) {
    router.push('/')
  }
}

const calculateMenuPosition = (buttonElement: HTMLElement) => {
  const buttonRect = buttonElement.getBoundingClientRect()
  const menuWidth = 140
  const menuHeight = 100

  let top = buttonRect.bottom + 4
  let left = buttonRect.right - menuWidth

  if (top + menuHeight > window.innerHeight) {
    top = buttonRect.top - menuHeight - 4
  }

  if (top < 0) {
    top = buttonRect.bottom + 4
  }

  if (left < 8) {
    left = 8
  }

  if (left + menuWidth > window.innerWidth - 8) {
    left = window.innerWidth - menuWidth - 8
  }

  return {
    top: `${top}px`,
    left: `${left}px`
  }
}

const toggleMenu = (event: Event, chatId?: string) => {
  event.stopPropagation()

  if (openMenuId.value === chatId) {
    openMenuId.value = null
  } else {
    const buttonElement = event.currentTarget as HTMLElement
    menuPosition.value = calculateMenuPosition(buttonElement)
    openMenuId.value = chatId!
  }
}
</script>
