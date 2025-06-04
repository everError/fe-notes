<template>
  <div class="inspector" v-if="selected">
    <h3>🔍 Inspector - {{ selected.type }}</h3>

    <!-- 텍스트 노드 -->
    <template v-if="isText && textNode">
      <label>내용</label>
      <textarea v-model="textNode!.content" rows="3" />
    </template>

    <!-- 컴포넌트 노드 -->
    <template v-else-if="isEditor && editorNode">
      <button @click="store.deleteSelectedNode">삭제</button>
      <div class="section">
        <label>Class</label>
        <input v-model="editorNode!.class" type="text" />
      </div>

      <div class="section">
        <label>Style</label>
        <input v-model="styleText" type="text" @blur="applyStyle" />
      </div>

      <div class="section" v-for="prop in meta?.props || []" :key="prop.name">
        <label>{{ prop.name }}</label>

        <template v-if="prop.type === 'boolean'">
          <input type="checkbox" v-model="editorNode!.props[prop.name]" />
        </template>

        <template v-else-if="prop.options">
          <select v-model="editorNode!.props[prop.name]">
            <option v-for="opt in prop.options" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
        </template>

        <template v-else>
          <input type="text" v-model="editorNode!.props[prop.name]" />
        </template>
      </div>

      <div
        class="section"
        v-for="(children, slotName) in editorNode!.children"
        :key="slotName"
      >
        <label>{{ slotName }} 슬롯 자식</label>
        <ul>
          <li v-for="(child, idx) in children" :key="child.id">
            {{ child.type }}
            <input
              v-if="child.type === 'text'"
              v-model="(child as TextNode).content"
              style="margin-left: 0.5rem; width: 60%"
            />
            <button @click="removeChild(slotName, idx)">삭제</button>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useEditorStore } from "../store/editorStore";
import { getComponentMeta } from "@vue-editor/schema";
import { isTextNode, isEditorNode } from "@vue-editor/core";
import type { TextNode, EditorNode } from "@vue-editor/core";

const store = useEditorStore();
const selected = computed(() => store.selectedNode);

const isText = computed(
  () => selected.value !== null && isTextNode(selected.value)
);

const isEditor = computed(
  () => selected.value !== null && isEditorNode(selected.value)
);

const textNode = computed(() =>
  isText.value ? (selected.value as TextNode) : null
);
const editorNode = computed(() =>
  isEditor.value ? (selected.value as EditorNode) : null
);

const styleText = ref("");

watchEffect(() => {
  if (editorNode.value?.style) {
    styleText.value = Object.entries(editorNode.value.style)
      .map(([k, v]) => `${k}:${v}`)
      .join("; ");
  } else {
    styleText.value = "";
  }
});

function applyStyle() {
  if (!editorNode.value) return;
  const styleObj: Record<string, string> = {};
  for (const pair of styleText.value.split(";")) {
    const [k, v] = pair.split(":").map((s) => s.trim());
    if (k && v) styleObj[k] = v;
  }
  editorNode.value.style = styleObj;
}

const meta = computed(() =>
  editorNode.value ? getComponentMeta(editorNode.value.type) : null
);

function removeChild(slot: string, index: number) {
  if (editorNode.value) {
    store.removeNodeByIndex(editorNode.value.id, slot, index);
  }
}
</script>

<style scoped>
.inspector {
  width: 300px;
  padding: 1rem;
  background: #fafafa;
  border-left: 1px solid #ddd;
  overflow-y: auto;
}
.section {
  margin-bottom: 1rem;
}
label {
  display: block;
  font-weight: bold;
  margin-bottom: 0.3rem;
}
input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
}
ul {
  list-style: none;
  padding-left: 0;
}
li {
  margin-bottom: 0.3rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
button {
  padding: 2px 6px;
  font-size: 0.9rem;
}
</style>
