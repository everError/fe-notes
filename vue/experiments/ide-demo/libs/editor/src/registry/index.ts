import type { ComponentRegistry } from '@ide-demo/editor';
import { AButtonMeta } from './meta/AButton.meta';
import {
  InputTextMeta,
  SelectMeta,
  CardMeta,
  DivMeta,
  DataGridMeta,
  SearchPanelMeta,
} from './meta/components.meta';

/**
 * 컴포넌트 레지스트리
 *
 * 새 컴포넌트를 추가하려면:
 * 1. src/registry/meta/ 에 [ComponentName].meta.ts 생성
 * 2. 여기에 import 후 등록
 *
 * 나중에 사내 라이브러리가 npm 배포되면,
 * 빌드 타임에 .d.ts 파싱해서 자동 생성하도록 전환 가능
 */
export const componentRegistry: ComponentRegistry = {
  AButton: AButtonMeta,
  InputText: InputTextMeta,
  Select: SelectMeta,
  Card: CardMeta,
  Div: DivMeta,
  DataGrid: DataGridMeta,
  SearchPanel: SearchPanelMeta,
};

/** 카테고리 목록 (순서 유지) */
export const categories = [
  '레이아웃',
  '기본',
  '입력',
  '데이터',
  '비즈니스',
] as const;

/** 카테고리별 컴포넌트 그룹 */
export function getComponentsByCategory() {
  return categories.map((cat) => ({
    category: cat,
    components: Object.values(componentRegistry).filter(
      (c) => c.category === cat,
    ),
  }));
}
