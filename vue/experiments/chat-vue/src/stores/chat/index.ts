import { defineStore } from 'pinia'
import { Ollama, type Message, type ChatRequest } from 'ollama'
import { reactive, ref, type Ref } from 'vue'

export interface Chat {
  id?: string
  title?: string
  createdAt?: string
  messages: ChatMessage[]
  // TODO: 수정한 날짜?
}
export interface ChatMessage extends Message {
  id: string
  done: boolean
}
export enum Role {
  USER = 'user',
  ASSISTANT = 'assistant'
}

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let url = typeof input === 'string' ? input : input.toString()
  if (url.startsWith('http://ollama:11434')) {
    url = url.replace('http://ollama:11434', '/ollama')
  }
  return fetch(url, init)
}

export const useChatStore = defineStore('chat', () => {
  // state
  const loading = ref<boolean>(false)
  const ollama = new Ollama({ host: '/ollama', fetch: customFetch })
  const chatList: Chat[] = []
  const currentChat = reactive<Chat>({
    messages: []
  })

  // 메시지 요청 중단
  const abortRequest = () => {
    ollama.abort() // ollama abort (모든 스트림 중단)
    loading.value = false

    // 마지막 어시스턴트 메시지 제거 (응답 지우기) - 삭제 X
    // const lastIndex = currentChat.messages.length - 1
    // if (lastIndex >= 0 && currentChat.messages[lastIndex].role === Role.ASSISTANT) {
    //   //currentChat.messages[lastIndex].
    // }
  }

  // 메시지 요청 전송
  const getChatRequest = (): ChatRequest => ({
    model: 'gpt-oss:20b',
    messages: currentChat.messages.slice(0, -1) || [] // 마지막 빈 ASSISTANT 메시지 제외
  })
  // action
  const askAsync = async (chatCallback?: () => {}) => {
    if (currentChat.messages.length === 0) {
      return
    }
    loading.value = true

    const message = createMessage(Role.ASSISTANT, false)
    currentChat.messages.push(message)

    try {
      const stream = await ollama.chat({
        ...getChatRequest(),
        stream: true
      })
      chatCallback?.()
      for await (const chunk of stream) {
        if (chunk.message) {
          message.content += chunk.message.content ?? ''
          message.thinking += chunk.message.thinking ?? ''
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // TODO: 오류 발생시
        console.log('Request aborted by user')
      } else {
        console.error(err)
      }
    } finally {
      loading.value = false
      message.done = true
    }
  }
  // 파라미터 Assistant 메시지 id -> 바로 이전 질문을 다시 요청
  // 이전 질문 이후의 메시지는 모두 삭제
  const retryAskAsync = async (assistantId: string, chatCallback?: () => {}) => {
    // ASSISTANT 메시지 ID로 인덱스 찾기
    const retryIndex = currentChat.messages.findIndex(
      (msg) => msg.id === assistantId && msg.role === Role.ASSISTANT
    )
    if (retryIndex === -1) {
      console.warn('Retry ID not found')
      return
    }

    // 이전 USER 메시지 확인 및 truncate
    const prevUserIndex = retryIndex - 1
    if (
      prevUserIndex >= 0 &&
      currentChat.messages[prevUserIndex].role === Role.USER
    ) {
      // 이전 USER 이후 모든 메시지 삭제 (USER는 유지)
      currentChat.messages.splice(prevUserIndex + 1)
    } else {
      return
    }

    // truncate 후 askAsync 호출 (새 응답 생성)
    await askAsync(chatCallback)
  }
  function generateMessageId(): string {
    const timestamp = Date.now().toString(36) // 타임스탬프를 36진수로 변환
    const randomStr = Math.random().toString(36).substring(2, 8) // 랜덤 문자열
    return `${timestamp}-${randomStr}` // 예: "k7g9v2-a1b2c3"
  }

  function initCurrentChat() {
    currentChat.id = undefined
    currentChat.title = undefined
    currentChat.createdAt = undefined
    currentChat.messages = []
  }

  const createMessage = (
    role: Role,
    done: boolean,
    content?: string,
    thinking?: string
  ): ChatMessage => {
    return reactive({
      id: generateMessageId(),
      role: role,
      content: content ?? '',
      thinking: thinking ?? '',
      done: done
    })
  }

  function deleteChat(chatId: string) {
    const index = chatList.findIndex((chat) => chat.id === chatId)
    if (index !== -1) {
      chatList.splice(index, 1)
    }
  }
  return {
    loading,
    currentChat,
    chatList,
    askAsync,
    retryAskAsync,
    abortRequest,
    addUserMessage: (content: string) =>
      currentChat.messages.push(createMessage(Role.USER, true, content)),
    initCurrentChat,
    deleteChat
  }
})
