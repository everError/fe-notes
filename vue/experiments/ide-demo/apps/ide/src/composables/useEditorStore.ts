import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { EditorNode, DragItem, DropTarget } from '@ide-demo/editor';
import { componentRegistry } from '@ide-demo/editor';

let nodeIdCounter = 1;
function generateId(): string {
  return `node_${nodeIdCounter++}`;
}

export const useEditorStore = defineStore('editor', () => {
  // ─── State ───
  const tree = ref<EditorNode[]>([]);
  const selectedId = ref<string | null>(null);
  const dragItem = ref<DragItem | null>(null);
  const dropTarget = ref<DropTarget | null>(null);

  // state에 추가
  const scriptStatus = ref<{
    success: boolean;
    message: string;
    bindingNames: string[];
  } | null>(null);

  const script = ref<string>(`
import { ref } from 'vue';
import {
  defineApi,
  useSelection,
} from '@ide-demo/shared';

export type SystemMessage = {
    systemCode?: string | null;
    systemName?: string | null;
    remarks?: string | null;
};

// ── API 정의 ──

const useSystemApi = defineApi((api) => ({
  systems: api.get<SystemMessage[]>('/std/mes/system/system', {skipAuth: true}),
  setSystem: api.put<SystemMessage>('/std/mes/system/system'),
}));

const { systems, setSystem } = useSystemApi();

// ── 상태 ──

const selection = useSelection<SystemMessage>();
const gridRef = ref<InstanceType<typeof ADataGrid> | null>(null);
const submitted = ref(false);

// ── 컬럼 정의 ──

const colDefs = [
  { field: 'systemCode', headerName: '시스템코드' },
  { field: 'systemName', headerName: '시스템명' },
  { field: 'remarks', headerName: '비고', flex: 1 },
];

// ── 조회 ──

const search = async () => {
  const proceed = await selection.guard();
  if (!proceed) return;
  selection.clear();
  await systems.fetch();
};

// ── 행 선택 ──

const onRowSelected = async (params: any) => {
  const proceed = await selection.guard();
  if (!proceed) return;
  submitted.value = false;
  selection.select(params.data as SystemMessage);
};

// ── 신규 ──

const onNew = async () => {
  const proceed = await selection.guard();
  if (!proceed) return;
  submitted.value = false;
  selection.create({
    systemCode: '',
    systemName: '',
    remarks: null,
  });
};

// ── 저장 ──

const onSave = async () => {
  submitted.value = true;

  if (!selection.data.value?.systemCode || !selection.data.value?.systemName) {
    return;
  }

  const result = await setSystem(selection.data.value);
  if (result.success) {
    selection.commit();
    await systems.refetch();
  }
};
`);

  // 슬롯 선택 다이얼로그 상태
  const pendingSlotDrop = ref<{
    type: string;
    source: 'palette' | 'canvas';
    parentId: string;
    slots: { name: string; label: string }[];
  } | null>(null);

  // ─── Getters ───
  const selectedNode = computed(() => {
    if (!selectedId.value) return null;
    return findNodeById(tree.value, selectedId.value);
  });

  const isDragging = computed(() => dragItem.value !== null);

  // ─── Node CRUD ───

  function findNodeById(nodes: EditorNode[], id: string): EditorNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children.length) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
      for (const slotNodes of Object.values(node.slots)) {
        const found = findNodeById(slotNodes, id);
        if (found) return found;
      }
    }
    return null;
  }

  function createNode(
    type: string,
    parentId: string | null = null,
    parentSlot: string | null = null,
  ): EditorNode {
    const meta = componentRegistry[type];
    if (!meta) throw new Error(`Unknown component type: ${type}`);

    return {
      id: generateId(),
      type,
      props: { ...meta.defaultProps },
      events: {},
      children: [],
      slots: meta.slots.reduce(
        (acc, slot) => ({ ...acc, [slot.name]: [] }),
        {} as Record<string, EditorNode[]>,
      ),
      parentId,
      parentSlot,
      bindModes: {},
    };
  }
  function updateNodeBindMode(nodeId: string, key: string, isBind: boolean) {
    const node = findNodeById(tree.value, nodeId);
    if (node) {
      if (!node.bindModes) node.bindModes = {};
      node.bindModes[key] = isBind;
    }
  }

  function addNodeToRoot(type: string, index?: number) {
    const node = createNode(type);
    if (index !== undefined && index >= 0) {
      tree.value.splice(index, 0, node);
    } else {
      tree.value.push(node);
    }
    selectedId.value = node.id;
    return node;
  }

  function addNodeToParent(type: string, parentId: string, index?: number) {
    const parent = findNodeById(tree.value, parentId);
    if (!parent) return null;
    const node = createNode(type, parentId, null);
    if (index !== undefined && index >= 0) {
      parent.children.splice(index, 0, node);
    } else {
      parent.children.push(node);
    }
    selectedId.value = node.id;
    return node;
  }

  function addNodeToSlot(
    type: string,
    parentId: string,
    slotName: string,
    index?: number,
  ) {
    const parent = findNodeById(tree.value, parentId);
    if (!parent || !parent.slots[slotName]) return null;
    const node = createNode(type, parentId, slotName);
    if (index !== undefined && index >= 0) {
      parent.slots[slotName].splice(index, 0, node);
    } else {
      parent.slots[slotName].push(node);
    }
    selectedId.value = node.id;
    return node;
  }

  function removeNode(id: string) {
    function removeFrom(nodes: EditorNode[]): boolean {
      const idx = nodes.findIndex((n) => n.id === id);
      if (idx !== -1) {
        nodes.splice(idx, 1);
        return true;
      }
      for (const node of nodes) {
        if (removeFrom(node.children)) return true;
        for (const slotNodes of Object.values(node.slots)) {
          if (removeFrom(slotNodes)) return true;
        }
      }
      return false;
    }

    removeFrom(tree.value);
    if (selectedId.value === id) {
      selectedId.value = null;
    }
  }

  function moveNode(nodeId: string, target: DropTarget) {
    const node = findNodeById(tree.value, nodeId);
    if (!node) return;
    if (target.parentId === nodeId) return;
    if (isDescendant(nodeId, target.parentId)) return;

    // 이동 전 원래 위치 기록
    const oldParentId = node.parentId;
    const oldSlot = node.parentSlot;
    let oldIndex = -1;

    if (!oldParentId) {
      oldIndex = tree.value.findIndex((n) => n.id === nodeId);
    } else {
      const oldParent = findNodeById(tree.value, oldParentId);
      if (oldParent) {
        if (oldSlot && oldParent.slots[oldSlot]) {
          oldIndex = oldParent.slots[oldSlot].findIndex((n) => n.id === nodeId);
        } else {
          oldIndex = oldParent.children.findIndex((n) => n.id === nodeId);
        }
      }
    }

    // 원래 위치에서 제거
    removeNode(nodeId);

    // 같은 부모 + 같은 슬롯 안에서 이동할 경우 인덱스 보정
    const isSameParent =
      (oldParentId === null && target.parentId === 'root') ||
      oldParentId === target.parentId;
    const isSameSlot =
      (oldSlot ?? undefined) === (target.slotName ?? undefined);

    let adjustedIndex = target.index;
    if (
      isSameParent &&
      isSameSlot &&
      oldIndex !== -1 &&
      oldIndex < target.index
    ) {
      adjustedIndex = target.index - 1;
    }
    adjustedIndex = Math.max(0, adjustedIndex);

    // 부모 참조 업데이트
    node.parentId = target.parentId === 'root' ? null : target.parentId;
    node.parentSlot = target.slotName || null;

    // 새 위치에 삽입
    if (target.parentId === 'root') {
      tree.value.splice(adjustedIndex, 0, node);
    } else if (target.slotName) {
      const parent = findNodeById(tree.value, target.parentId);
      if (parent?.slots[target.slotName]) {
        parent.slots[target.slotName].splice(adjustedIndex, 0, node);
      }
    } else {
      const parent = findNodeById(tree.value, target.parentId);
      if (parent) {
        parent.children.splice(adjustedIndex, 0, node);
      }
    }
  }

  function isDescendant(possibleAncestorId: string, nodeId: string): boolean {
    const ancestor = findNodeById(tree.value, possibleAncestorId);
    if (!ancestor) return false;
    return !!findNodeById(
      [...ancestor.children, ...Object.values(ancestor.slots).flat()],
      nodeId,
    );
  }

  // ─── Props/Events 업데이트 ───

  function updateNodeProp(nodeId: string, key: string, value: any) {
    const node = findNodeById(tree.value, nodeId);
    if (node) node.props[key] = value;
  }

  function updateNodeEvent(
    nodeId: string,
    eventName: string,
    handlerName: string,
  ) {
    const node = findNodeById(tree.value, nodeId);
    if (node) node.events[eventName] = handlerName;
  }

  // ─── Selection ───

  function selectNode(id: string | null) {
    selectedId.value = id;
  }

  // ─── Drag & Drop ───

  function startDrag(item: DragItem) {
    dragItem.value = item;
  }

  function updateDropTarget(target: DropTarget | null) {
    dropTarget.value = target;
  }

  function endDrag() {
    dragItem.value = null;
    dropTarget.value = null;
  }

  function executeDrop(target: DropTarget) {
    // console.log('[Store] executeDrop', {
    //   dragSource: dragItem.value?.source,
    //   dragId: dragItem.value?.id,
    //   targetParentId: target.parentId,
    //   targetSlotName: target.slotName,
    //   targetIndex: target.index,
    // });
    if (!dragItem.value) return;

    const parentNode =
      target.parentId !== 'root'
        ? findNodeById(tree.value, target.parentId)
        : null;

    // 슬롯 있는 컨테이너에 드롭 + slotName 미지정 → 다이얼로그
    if (parentNode && target.slotName === undefined) {
      const meta = componentRegistry[parentNode.type];
      if (meta?.canHaveChildren && meta.slots.length > 0) {
        pendingSlotDrop.value = {
          type: dragItem.value.id,
          source: dragItem.value.source,
          parentId: target.parentId,
          slots: meta.slots.map((s) => ({ name: s.name, label: s.label })),
        };
        endDrag();
        return;
      }
    }

    if (dragItem.value.source === 'palette') {
      const type = dragItem.value.id;
      if (target.parentId === 'root') {
        addNodeToRoot(type, target.index);
      } else if (target.slotName) {
        addNodeToSlot(type, target.parentId, target.slotName, target.index);
      } else {
        addNodeToParent(type, target.parentId, target.index);
      }
    } else {
      moveNode(dragItem.value.id, target);
    }

    endDrag();
  }

  function confirmSlotDrop(slotName: string) {
    if (!pendingSlotDrop.value) return;

    const { type, source, parentId } = pendingSlotDrop.value;

    if (source === 'palette') {
      addNodeToSlot(type, parentId, slotName);
    } else {
      moveNode(type, { parentId, slotName, index: 0 });
    }

    pendingSlotDrop.value = null;
  }

  function cancelSlotDrop() {
    pendingSlotDrop.value = null;
  }

  // ─── Serialization ───

  function toJSON() {
    return JSON.stringify(
      {
        name: 'untitled',
        script: script.value,
        tree: tree.value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  function loadFromJSON(json: string) {
    try {
      const data = JSON.parse(json);
      if (data.script) script.value = data.script;
      if (data.tree) tree.value = data.tree;
      selectedId.value = null;
    } catch (e) {
      console.error('Failed to load project:', e);
    }
  }

  return {
    tree,
    selectedId,
    selectedNode,
    dragItem,
    dropTarget,
    isDragging,
    script,
    pendingSlotDrop,
    scriptStatus,
    findNodeById,
    createNode,
    addNodeToRoot,
    addNodeToParent,
    addNodeToSlot,
    removeNode,
    moveNode,
    updateNodeProp,
    updateNodeEvent,
    selectNode,
    startDrag,
    updateDropTarget,
    endDrag,
    executeDrop,
    confirmSlotDrop,
    cancelSlotDrop,
    toJSON,
    loadFromJSON,
    updateNodeBindMode,
  };
});
