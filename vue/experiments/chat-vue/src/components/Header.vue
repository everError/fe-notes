<template>
  <div class="flex bg-zinc-50">
    <Button
      icon="pi pi-bars"
      severity="secondary"
      variant="text"
      class="lg:hidden self-start p-button-rounded"
      @click="emits('toggle-mobile-menu', true)"
    />
    <!-- <Button class="bg-zinc-100 border-none" @click="setTempMessage"></Button> -->
  </div>
</template>

<script setup lang="ts">
import { Role, useChatStore } from '@/stores/chat'
import Button from 'primevue/button'
const emits = defineEmits(['toggle-mobile-menu'])
const setTempMessage = () => {
  const chatStore = useChatStore()
  chatStore.currentChat.messages = [
    {
      id: '1',
      role: Role.USER,
      content:
        '안녕! 오늘 날씨가 정말 좋네. 혹시 오후에 비가 올 가능성이 있나요? 그리고 내일 아침도 궁금해요.',
      thinking: undefined,
      done: true
    },
    {
      id: '2',
      role: Role.ASSISTANT,
      content:
        '안녕하세요! 오늘 날씨가 정말 멋지죠. 현재로선 오후에 비가 올 확률은 낮지만, 지역에 따라 약간의 소나기가 있을 수 있으니 우산을 챙기는 걸 추천드립니다. 내일 아침은 맑음이 예상되지만, 기온이 조금 쌀쌀할 수 있으니 따뜻한 옷을 준비하세요. 더 궁금한 점이 있으면 말씀해 주세요!',
      thinking: '날씨 데이터를 분석 중... 지역별 예보 확인... 기온 변화 고려...',
      done: true
    },
    {
      id: '3',
      role: Role.USER,
      content:
        '고마워! 그럼 오후에 산책을 할까 생각 중인데, 어디로 가는 게 좋을까? 공원이나 강변 중에 추천해 줄 수 있어? 그리고 운동화 신고 가도 될까?',
      thinking: undefined,
      done: true
    },
    {
      id: '4',
      role: Role.ASSISTANT,
      content:
        '좋은 선택이네요! 오후 산책이라면 공원이 조용하고 자연을 즐기기 좋습니다. 근처에 있는 ○○ 공원이 추천되는데, 나무가 많아서 그늘도 되고 분위기도 좋아요. 강변도 멋지지만 바람이 조금 세서 공원이 더 편안할 수 있습니다. 운동화는 문제없습니다! 편한 신발이면 충분히 즐길 수 있을 거예요. 물도 챙기시고요!',
      thinking: '공원과 강변의 특성 비교... 날씨 영향 고려... 신발 종류 분석...',
      done: true
    },
    {
      id: '5',
      role: Role.USER,
      content:
        '좋아, 공원으로 정했어. 근데 거기까지 어떻게 가야 하지? 대중교통으로 갈 건데, 버스나 지하철 중에 어떤 게 더 편리할까? 그리고 대략적인 소요 시간을 알려줄 수 있어?',
      thinking: undefined,
      done: true
    },
    {
      id: '6',
      role: Role.USER,
      content:
        '안녕! 오늘 날씨가 정말 좋네. 혹시 오후에 비가 올 가능성이 있나요? 그리고 내일 아침도 궁금해요.',
      thinking: undefined,
      done: true
    },
    {
      id: '7',
      role: Role.ASSISTANT,
      content:
        '안녕하세요! 오늘 날씨가 정말 멋지죠. 현재로선 오후에 비가 올 확률은 낮지만, 지역에 따라 약간의 소나기가 있을 수 있으니 우산을 챙기는 걸 추천드립니다. 내일 아침은 맑음이 예상되지만, 기온이 조금 쌀쌀할 수 있으니 따뜻한 옷을 준비하세요. 더 궁금한 점이 있으면 말씀해 주세요!',
      thinking: '날씨 데이터를 분석 중... 지역별 예보 확인... 기온 변화 고려...',
      done: true
    },
    {
      id: '8',
      role: Role.USER,
      content:
        '고마워! 그럼 오후에 산책을 할까 생각 중인데, 어디로 가는 게 좋을까? 공원이나 강변 중에 추천해 줄 수 있어? 그리고 운동화 신고 가도 될까?',
      thinking: undefined,
      done: true
    },
    {
      id: '9',
      role: Role.ASSISTANT,
      content:
        '좋은 선택이네요! 오후 산책이라면 공원이 조용하고 자연을 즐기기 좋습니다. 근처에 있는 ○○ 공원이 추천되는데, 나무가 많아서 그늘도 되고 분위기도 좋아요. 강변도 멋지지만 바람이 조금 세서 공원이 더 편안할 수 있습니다. 운동화는 문제없습니다! 편한 신발이면 충분히 즐길 수 있을 거예요. 물도 챙기시고요!',
      thinking: '공원과 강변의 특성 비교... 날씨 영향 고려... 신발 종류 분석...',
      done: true
    },
    {
      id: '10',
      role: Role.USER,
      content:
        '좋아, 공원으로 정했어. 근데 거기까지 어떻게 가야 하지? 대중교통으로 갈 건데, 버스나 지하철 중에 어떤 게 더 편리할까? 그리고 대략적인 소요 시간을 알려줄 수 있어?',
      thinking: undefined,
      done: true
    },
    {
      id: '11',
      role: Role.USER,
      content:
        '안녕! 오늘 날씨가 정말 좋네. 혹시 오후에 비가 올 가능성이 있나요? 그리고 내일 아침도 궁금해요.',
      thinking: undefined,
      done: true
    },
    {
      id: '12',
      role: Role.ASSISTANT,
      content:
        '안녕하세요! 오늘 날씨가 정말 멋지죠. 현재로선 오후에 비가 올 확률은 낮지만, 지역에 따라 약간의 소나기가 있을 수 있으니 우산을 챙기는 걸 추천드립니다. 내일 아침은 맑음이 예상되지만, 기온이 조금 쌀쌀할 수 있으니 따뜻한 옷을 준비하세요. 더 궁금한 점이 있으면 말씀해 주세요!',
      thinking: '날씨 데이터를 분석 중... 지역별 예보 확인... 기온 변화 고려...',
      done: true
    },
    {
      id: '13',
      role: Role.USER,
      content:
        '고마워! 그럼 오후에 산책을 할까 생각 중인데, 어디로 가는 게 좋을까? 공원이나 강변 중에 추천해 줄 수 있어? 그리고 운동화 신고 가도 될까?',
      thinking: undefined,
      done: true
    },
    {
      id: '14',
      role: Role.ASSISTANT,
      content:
        '좋은 선택이네요! 오후 산책이라면 공원이 조용하고 자연을 즐기기 좋습니다. 근처에 있는 ○○ 공원이 추천되는데, 나무가 많아서 그늘도 되고 분위기도 좋아요. 강변도 멋지지만 바람이 조금 세서 공원이 더 편안할 수 있습니다. 운동화는 문제없습니다! 편한 신발이면 충분히 즐길 수 있을 거예요. 물도 챙기시고요!',
      thinking: '공원과 강변의 특성 비교... 날씨 영향 고려... 신발 종류 분석...',
      done: true
    },
    {
      id: '15',
      role: Role.USER,
      content:
        '좋아, 공원으로 정했어. 근데 거기까지 어떻게 가야 하지? 대중교통으로 갈 건데, 버스나 지하철 중에 어떤 게 더 편리할까? 그리고 대략적인 소요 시간을 알려줄 수 있어?',
      thinking: undefined,
      done: true
    },
    {
      id: '17',
      role: Role.ASSISTANT,
      content:
        '좋은 선택이네요! 오후 산책이라면 공원이 조용하고 자연을 즐기기 좋습니다. 근처에 있는 ○○ 공원이 추천되는데, 나무가 많아서 그늘도 되고 분위기도 좋아요. 강변도 멋지지만 바람이 조금 세서 공원이 더 편안할 수 있습니다. 운동화는 문제없습니다! 편한 신발이면 충분히 즐길 수 있을 거예요. 물도 챙기시고요!',
      thinking: '공원과 강변의 특성 비교... 날씨 영향 고려... 신발 종류 분석...',
      done: true
    }
    // 추가 ASSISTANT 응답은 필요 시 확장 가능
  ]
}
</script>
