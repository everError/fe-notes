<template>
  <div id="canvas-root">
    <!-- postMessage 없이 직접 렌더링 테스트 -->
    <div v-if="!tree.length" style="padding: 20px">
      <!-- <AButton label="테스트 버튼" /> -->
      <p class="">이 텍스트가 보이면 canvas-app 렌더링은 정상입니다.</p>
    </div>
    <NodeWrapper
      v-for="node in tree"
      :key="node.id"
      :node="node"
      :selected-id="selectedId"
    />
  </div>
</template>

<script setup lang="ts">
import { useParentBridge } from '@/composables/useParentBridge';
import { useDropDetector } from '@/composables/useDropDetector';
import { useClickDetector } from '@/composables/useClickDetector';
import NodeWrapper from '@/components/NodeWrapper.vue';

const { tree, selectedId, sendToParent, sendNodeRects } = useParentBridge();

useDropDetector(sendToParent);
useClickDetector(sendToParent);
</script>
