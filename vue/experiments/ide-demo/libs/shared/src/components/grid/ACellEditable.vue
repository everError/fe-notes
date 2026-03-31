<template>
  <div class="editable-cell">
    <span class="editable-cell-value">{{ displayValue }}</span>
    <button
      v-if="isDirty"
      class="editable-cell-undo"
      title="원본으로 되돌리기"
      @click.stop="onUndo"
    >
      <i class="pi pi-undo" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * 수정 가능 셀 렌더러.
 * useGridEdit.editable()에서 자동으로 cellRenderer로 지정됩니다.
 *
 * - 수정된 셀: 값 + 되돌리기(undo) 아이콘 표시
 * - 미수정 셀: 값만 표시
 */
const props = defineProps<{ params: any }>();

/** 화면에 표시할 값 — valueFormatter가 있으면 포맷된 값 사용 */
const displayValue = computed(() => {
  if (props.params.valueFormatted != null) return props.params.valueFormatted;
  if (props.params.value == null) return "";
  return props.params.value;
});

/** 이 셀이 수정되었는지 */
const isDirty = computed(() => {
  const ctx = props.params.context;
  if (!ctx?.gridEdit) return false;
  const rowKey = String(props.params.data[ctx.rowKeyField]);
  return ctx.gridEdit.isCellDirty(rowKey, props.params.colDef.field);
});

/** 원본값으로 되돌리기 */
const onUndo = () => {
  const ctx = props.params.context;
  if (!ctx?.gridEdit) return;

  const field = props.params.colDef.field;
  const rowKey = String(props.params.data[ctx.rowKeyField]);
  const original = ctx.gridEdit.getOriginalValue(rowKey, field);

  if (original === undefined) return;

  // 행 데이터에 원본값 복원
  props.params.data[field] = original;

  // 추적 해제 (원본 = 현재 → 자동 삭제)
  ctx.gridEdit.trackChange(rowKey, field, original, original);

  // 셀 새로고침
  props.params.api.refreshCells({
    rowNodes: [props.params.node],
    columns: [field],
    force: true,
  });
};
</script>

<style>
.editable-cell {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  gap: 4px;
}

.editable-cell-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editable-cell-undo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #f59e0b;
  cursor: pointer;
  border-radius: 3px;
  padding: 0;
  font-size: 12px;
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 0.15s, background-color 0.15s;
}

.editable-cell-undo:hover {
  opacity: 1;
  background-color: rgba(245, 158, 11, 0.1);
}
</style>
