/**
 * 라벨 관련 공통 Props.
 * AInputText, AInputNumber, ASelect 등 폼 컴포넌트에서 공통 사용.
 * AFormField 내부 컴포넌트가 이 props를 받아 라벨 렌더링을 처리합니다.
 */
export interface LabelProps {
  /** 라벨 텍스트 */
  label?: string;
  /** 라벨 위치. float: 인풋 안에서 올라감, vertical: 위에, horizontal: 옆에 */
  labelPosition?: "float" | "vertical" | "horizontal";
  /** horizontal 모드에서 라벨 너비 (CSS 값, 예: '120px', '8rem') */
  labelWidth?: string;
  /** 필수 입력 표시 — true면 라벨 옆에 빨간 * 표시 */
  required?: boolean;
}

/**
 * 폼 입력 컴포넌트 공통 Props.
 * LabelProps를 확장하여 입력 컴포넌트의 상태/스타일 props를 추가합니다.
 * 각 컴포넌트(AInputText, AInputNumber 등)가 이를 extends하여
 * 자기만의 고유 props를 추가하는 구조입니다.
 *
 * @example
 * ```ts
 * // AInputText.vue
 * export interface AInputTextProps extends BaseInputProps {
 *   type?: string;
 *   variant?: 'outlined' | 'filled';
 * }
 * ```
 */
export interface BaseInputProps extends LabelProps {
  /** 비활성화 — true면 입력 불가 + 흐릿한 스타일 */
  disabled?: boolean;
  /** 읽기 전용 — 입력 불가하지만 포커스/선택은 가능 */
  readonly?: boolean;
  /** 유효성 검사 실패 표시 — true면 빨간 테두리 등 invalid 스타일 적용 */
  invalid?: boolean;
  /** 부모 너비에 맞춤 — PrimeVue fluid prop */
  fluid?: boolean;
  /** 플레이스홀더 텍스트 (float 모드에서는 무시됨) */
  placeholder?: string;
  /** 입력 가이드 텍스트 — 인풋 아래에 작은 글씨로 표시 */
  helpText?: string;
  /** 유효성 검사 에러 메시지 — 인풋 아래에 빨간 글씨로 표시 */
  errorMessage?: string;
  /** 추가 CSS 클래스 — Tailwind 유틸리티 등 */
  customClass?: string | object | any[];
  /** 추가 인라인 스타일 */
  customStyle?: Record<string, string | number>;
}
