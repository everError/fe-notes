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

  const script = ref<string>(`<script setup lang="ts">
import { ref, reactive } from 'vue'

// 검색 조건
const searchForm = reactive({
  name: '',
  status: '',
})

// 사용자 목록
const userList = ref([
  { name: '홍길동', email: 'hong@test.com', status: '활성' },
  { name: '김철수', email: 'kim@test.com', status: '비활성' },
])

const loading = ref(false)

// 검색 실행
async function handleSearch() {
  loading.value = true
  // API 호출...
  loading.value = false
}

// 행 클릭
function handleRowClick(row: any) {
  console.log('selected:', row)
}

// 저장
function handleSave() {
  console.log('saving...')
}
</script>`);

  // ─── Getters ───
  const selectedNode = computed(() => {
    if (!selectedId.value) return null;
    return findNodeById(tree.value, selectedId.value);
  });

  const isDragging = computed(() => dragItem.value !== null);

  // ─── Node CRUD ───

  /** 트리에서 노드 찾기 */
  function findNodeById(nodes: EditorNode[], id: string): EditorNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      // children 검색
      if (node.children.length) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
      // slots 검색
      for (const slotNodes of Object.values(node.slots)) {
        const found = findNodeById(slotNodes, id);
        if (found) return found;
      }
    }
    return null;
  }

  /** 새 노드 생성 */
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
    };
  }

  /** 루트에 노드 추가 */
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

  /** 특정 부모의 children에 노드 추가 */
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

  /** 특정 부모의 슬롯에 노드 추가 */
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

  /** 노드 삭제 */
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

  /** 노드 이동 (드래그 앤 드롭) */
  function moveNode(nodeId: string, target: DropTarget) {
    const node = findNodeById(tree.value, nodeId);
    if (!node) return;

    // 자기 자신 안으로 이동 방지
    if (target.parentId === nodeId) return;
    // 자신의 자식 안으로 이동 방지
    if (isDescendant(nodeId, target.parentId)) return;

    // 원래 위치에서 제거
    removeNode(nodeId);

    // 부모 참조 업데이트
    node.parentId = target.parentId === 'root' ? null : target.parentId;
    node.parentSlot = target.slotName || null;

    // 새 위치에 삽입
    if (target.parentId === 'root') {
      tree.value.splice(target.index, 0, node);
    } else if (target.slotName) {
      const parent = findNodeById(tree.value, target.parentId);
      if (parent?.slots[target.slotName]) {
        parent.slots[target.slotName].splice(target.index, 0, node);
      }
    } else {
      const parent = findNodeById(tree.value, target.parentId);
      if (parent) {
        parent.children.splice(target.index, 0, node);
      }
    }
  }

  /** nodeId가 possibleAncestorId의 자손인지 확인 */
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
    if (node) {
      node.props[key] = value;
    }
  }

  function updateNodeEvent(
    nodeId: string,
    eventName: string,
    handlerName: string,
  ) {
    const node = findNodeById(tree.value, nodeId);
    if (node) {
      node.events[eventName] = handlerName;
    }
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

  /** 드롭 실행 */
  function executeDrop(target: DropTarget) {
    if (!dragItem.value) return;

    if (dragItem.value.source === 'palette') {
      // 팔레트에서 새 컴포넌트 드롭
      const type = dragItem.value.id;
      if (target.parentId === 'root') {
        addNodeToRoot(type, target.index);
      } else if (target.slotName) {
        addNodeToSlot(type, target.parentId, target.slotName, target.index);
      } else {
        addNodeToParent(type, target.parentId, target.index);
      }
    } else {
      // 캔버스 내 노드 이동
      moveNode(dragItem.value.id, target);
    }

    endDrag();
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
    // state
    tree,
    selectedId,
    selectedNode,
    dragItem,
    dropTarget,
    isDragging,
    script,
    // node operations
    findNodeById,
    createNode,
    addNodeToRoot,
    addNodeToParent,
    addNodeToSlot,
    removeNode,
    moveNode,
    updateNodeProp,
    updateNodeEvent,
    // selection
    selectNode,
    // drag & drop
    startDrag,
    updateDropTarget,
    endDrag,
    executeDrop,
    // serialization
    toJSON,
    loadFromJSON,
  };
});
