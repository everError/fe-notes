<template>
  <div
    id="canvas-root"
    :class="['h-full w-full flex flex-col p-2', { 'edit-mode': editMode }]"
  >
    <!-- 디버그: 트리 내용 확인 -->
    <!-- <div
      v-if="tree.length"
      style="
        position: fixed;
        bottom: 0;
        right: 0;
        background: black;
        color: lime;
        font-size: 10px;
        padding: 4px 8px;
        z-index: 9999;
        max-width: 300px;
        max-height: 150px;
        overflow: auto;
      "
    >
      <div v-for="node in tree" :key="node.id">
        {{ node.type }} | class="{{ node.props.class }}" | children={{
          node.children?.length
        }}
        | slots={{ Object.keys(node.slots || {}).join(',') }}
      </div>
    </div> -->

    <div class="flex flex-col flex-1">
      <NodeWrapper
        v-for="node in tree"
        :key="node.id"
        :node="node"
        :selected-id="selectedId"
        :bindings="bindings"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useParentBridge } from '@/composables/useParentBridge';
import { useDropDetector } from '@/composables/useDropDetector';
import { useClickDetector } from '@/composables/useClickDetector';
import { useScriptRunner } from '@/composables/useScriptRunner';
import NodeWrapper from '@/components/NodeWrapper.vue';

const { tree, selectedId, script, editMode, sendToParent } = useParentBridge();
const { bindings, error, execute } = useScriptRunner();

useDropDetector(sendToParent);
useClickDetector(sendToParent);

watch(script, (newScript) => {
  if (newScript) {
    execute(newScript);

    // 실행 결과를 부모에게 전달
    if (error.value) {
      sendToParent('script-result', {
        success: false,
        message: error.value,
        bindingNames: [],
      });
    } else {
      const names = Object.keys(bindings.value);
      sendToParent('script-result', {
        success: true,
        message: `${names.length}개 바인딩 성공`,
        bindingNames: names,
      });
    }
  }
});
</script>
