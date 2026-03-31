// ─── Component Meta Types ───
// 각 사내 컴포넌트의 메타 정보를 정의하는 타입
// 이 메타 정보를 기반으로 팔레트, 속성 패널, 드롭존이 자동 생성됨

/** Props 필드 타입 */
export type PropFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'binding' // 스크립트 변수 바인딩용

/** Props 필드 정의 */
export interface PropFieldDef {
  type: PropFieldType
  label: string
  description?: string
  /** select 타입일 때 선택지 */
  options?: string[]
  /** 기본값 */
  defaultValue?: any
  /** 필수 여부 */
  required?: boolean
  /** 바인딩 가능한 변수 타입 필터 (예: 'ref', 'reactive') */
  bindingFilter?: string[]
}

/** 슬롯 정의 */
export interface SlotDef {
  name: string
  label: string
  description?: string
  /** 이 슬롯에 드롭 가능한 컴포넌트 타입 제한 (비어있으면 모두 허용) */
  allowedTypes?: string[]
}

/** 이벤트 정의 */
export interface EventDef {
  name: string
  label: string
  description?: string
  /** 이벤트 핸들러의 파라미터 타입 힌트 */
  payload?: string
}

/** 컴포넌트 메타 정의 */
export interface ComponentMeta {
  /** 컴포넌트 이름 (PascalCase) */
  name: string
  /** 팔레트 카테고리 */
  category: string
  /** 팔레트 아이콘 (emoji 또는 아이콘 클래스) */
  icon: string
  /** 설명 */
  description?: string
  /** Props 정의 */
  props: Record<string, PropFieldDef>
  /** 이벤트 정의 */
  events: EventDef[]
  /** 슬롯 정의 */
  slots: SlotDef[]
  /** 자식 컴포넌트를 가질 수 있는지 (컨테이너 여부) */
  canHaveChildren: boolean
  /** 기본 props 값 */
  defaultProps: Record<string, any>
  /** 캔버스에서 렌더링할 때 사용할 태그명 (iframe 내부용) */
  tagName?: string
}

/** 컴포넌트 레지스트리 */
export type ComponentRegistry = Record<string, ComponentMeta>
