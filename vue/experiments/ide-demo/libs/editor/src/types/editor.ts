// ─── Editor State Types ───
// 에디터의 핵심 상태를 정의하는 타입

/** 캔버스에 배치된 컴포넌트 노드 */
export interface EditorNode {
  /** 고유 ID */
  id: string;
  /** 컴포넌트 타입 (ComponentMeta.name과 매칭) */
  type: string;
  /** 현재 설정된 props 값 */
  props: Record<string, any>;
  /** 바인딩된 이벤트 핸들러 { eventName: functionName } */
  events: Record<string, string>;
  /** 자식 노드 (canHaveChildren이고 슬롯이 없을 때) */
  children: EditorNode[];
  /** 슬롯별 자식 노드 */
  slots: Record<string, EditorNode[]>;
  /** 부모 노드 ID (루트면 null) */
  parentId: string | null;
  /** 부모의 슬롯 이름 (슬롯 안에 있을 때) */
  parentSlot: string | null;
  /** 바인딩 모드로 설정된 props 키 목록 */
  bindModes: Record<string, boolean>;
}

/** 드래그 중인 아이템 정보 */
export interface DragItem {
  /** 'palette' = 새 컴포넌트, 'canvas' = 기존 노드 이동 */
  source: 'palette' | 'canvas';
  /** palette일 때: 컴포넌트 타입명, canvas일 때: 노드 ID */
  id: string;
}

/** 드롭 대상 정보 */
export interface DropTarget {
  /** 드롭할 위치의 부모 노드 ID (루트면 'root') */
  parentId: string;
  /** 슬롯 이름 (슬롯에 드롭하는 경우) */
  slotName?: string;
  /** 드롭 위치 인덱스 */
  index: number;
}

/** 스크립트에서 파싱된 변수 정보 */
export interface ParsedVariable {
  name: string;
  type: 'ref' | 'reactive' | 'computed' | 'const';
  /** 추론된 값 타입 */
  valueType?: string;
}

/** 스크립트에서 파싱된 함수 정보 */
export interface ParsedFunction {
  name: string;
  isAsync: boolean;
  params?: string[];
}

/** 스크립트 파싱 결과 */
export interface ParsedScript {
  variables: ParsedVariable[];
  functions: ParsedFunction[];
}

/** 에디터 전체 상태 (저장/불러오기 단위) */
export interface EditorProject {
  /** 프로젝트 이름 */
  name: string;
  /** 스크립트 코드 */
  script: string;
  /** 노드 트리 */
  tree: EditorNode[];
  /** 생성 시각 */
  createdAt: string;
  /** 수정 시각 */
  updatedAt: string;
}
