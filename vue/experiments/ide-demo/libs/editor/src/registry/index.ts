import type { ComponentRegistry } from '@ide-demo/editor';
import { AButtonMeta } from './meta/AButton.meta';
import { ACardMeta } from './meta/ACard.meta';
import { AQueryCardMeta } from './meta/AQueryCard.meta';
import { AFormFieldMeta } from './meta/AFormField.meta';
import { AInputTextMeta } from './meta/AInputText.meta';
import { AInputNumberMeta } from './meta/AInputNumber.meta';
import { ADataGridMeta } from './meta/ADataGrid.meta';
import { DivMeta } from './meta/Div.meta';

export const componentRegistry: ComponentRegistry = {
  AButton: AButtonMeta,
  ACard: ACardMeta,
  AQueryCard: AQueryCardMeta,
  AFormField: AFormFieldMeta,
  AInputText: AInputTextMeta,
  AInputNumber: AInputNumberMeta,
  ADataGrid: ADataGridMeta,
  Div: DivMeta,
};

export const categories = [
  '레이아웃',
  '입력',
  '데이터',
  '비즈니스',
  '기본',
] as const;

export function getComponentsByCategory() {
  return categories.map((cat) => ({
    category: cat,
    components: Object.values(componentRegistry).filter(
      (c) => c.category === cat,
    ),
  }));
}
