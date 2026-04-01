<script lang="ts">
import {
  defineComponent,
  computed,
  h,
  resolveComponent,
  isRef,
  unref,
  type PropType,
  type VNode,
} from 'vue';
import type { EditorNode } from '@ide-demo/editor';
import { componentRegistry } from '@ide-demo/editor';

export default defineComponent({
  name: 'NodeWrapper',
  props: {
    node: {
      type: Object as PropType<EditorNode>,
      required: true,
    },
    selectedId: {
      type: String as PropType<string | null>,
      default: null,
    },
    bindings: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({}),
    },
  },

  setup(props) {
    const meta = computed(() => componentRegistry[props.node.type] ?? null);

    /**
     * [개선된 로직] 단순 경로뿐만 아니라 함수 호출, 논리 연산까지 지원
     */
    function resolveBindingExpression(
      expr: string,
      bindings: Record<string, any>,
    ): any {
      if (!expr || !bindings) return undefined;

      try {
        // .value를 생략해도 접근 가능하도록 Proxy 컨텍스트 생성
        const context = new Proxy(bindings, {
          get(target, key) {
            const val = target[key as string];
            return isRef(val) ? val.value : val;
          },
        });

        // 식에 연산자나 괄호가 있으면 코드로 실행 (ex: count > 0, method())
        const hasOperator = /[!+\-*/%&|^=<>?()]/.test(expr);
        if (hasOperator) {
          const execute = new Function('ctx', `with(ctx) { return ${expr} }`);
          return execute(context);
        }

        // 단순 경로 (ex: text, user.name)
        const parts = expr.split('.');
        let current: any = context;
        for (const part of parts) {
          if (current === undefined || current === null) return undefined;
          current = current[part];
        }
        return current;
      } catch (e) {
        return undefined;
      }
    }

    const resolvedTag = computed(() => {
      const tagName =
        props.node.type === 'Div'
          ? 'div'
          : (meta.value?.tagName ?? props.node.type);
      const nativeTags = [
        'div',
        'span',
        'p',
        'section',
        'header',
        'footer',
        'main',
        'nav',
        'aside',
        'article',
      ];
      if (nativeTags.includes(tagName)) return tagName;
      return resolveComponent(tagName);
    });

    const isSelected = computed(() => props.selectedId === props.node.id);

    return () => {
      const tag = resolvedTag.value;
      const NodeWrapperComp = resolveComponent('NodeWrapper');
      const metaProps = meta.value?.props ?? {};

      const builtProps: Record<string, any> = {};
      const builtEvents: Record<string, Function> = {};

      // 1. Props 및 v-model 빌드
      for (const [key, value] of Object.entries(props.node.props)) {
        if (
          key === 'class' ||
          value === '' ||
          value === undefined ||
          value === null
        )
          continue;

        const isBind =
          metaProps[key]?.type === 'binding' ||
          props.node.bindModes?.[key] === true;

        if (isBind) {
          // 값 읽기 (Getter)
          builtProps[key] = resolveBindingExpression(
            String(value),
            props.bindings,
          );

          // 양방향 바인딩 지원 (Setter)
          // modelValue 속성이 바인딩 모드일 때만 동작
          if (key === 'modelValue') {
            builtEvents['onUpdate:modelValue'] = (newValue: any) => {
              const rootKey = String(value).split('.')[0];
              const target = props.bindings[rootKey];

              if (isRef(target)) {
                target.value = newValue;
              } else if (props.bindings[rootKey] !== undefined) {
                props.bindings[rootKey] = newValue;
              }
            };
          }
          continue;
        }
        builtProps[key] = value;
      }

      // 2. 일반 Events 빌드
      for (const [eventName, handlerName] of Object.entries(
        props.node.events,
      )) {
        if (!handlerName) continue;
        const handler = props.bindings[handlerName];
        if (typeof handler === 'function') {
          const vueEventKey =
            'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
          builtEvents[vueEventKey] = (...args: any[]) => {
            try {
              handler(...args);
            } catch (e) {
              console.warn(`이벤트 오류: ${handlerName}`, e);
            }
          };
        }
      }

      const nodeAttrs: Record<string, any> = {
        ...builtProps,
        ...builtEvents,
        'data-node-id': props.node.id,
        'data-node-type': props.node.type,
        class: [props.node.props.class, { 'node--selected': isSelected.value }],
      };

      if (meta.value?.canHaveChildren) {
        nodeAttrs['data-container'] = '';
      }

      // 슬롯 렌더링 로직 (기존과 동일)
      if (meta.value?.canHaveChildren && meta.value.slots.length > 0) {
        const slots: Record<string, () => VNode | VNode[]> = {};
        for (const slotDef of meta.value.slots) {
          const slotNodes = props.node.slots[slotDef.name] ?? [];
          if (slotNodes.length > 0) {
            slots[slotDef.name] = () =>
              h(
                'div',
                {
                  'data-slot-name': slotDef.name,
                  style: { display: 'contents' },
                },
                slotNodes.map((child) =>
                  h(NodeWrapperComp, {
                    key: child.id,
                    node: child,
                    selectedId: props.selectedId,
                    bindings: props.bindings,
                  }),
                ),
              );
          }
        }
        return h(tag, nodeAttrs, slots);
      }

      // 일반 자식 렌더링 로직 (기존과 동일)
      if (meta.value?.canHaveChildren) {
        const childNodes = props.node.children ?? [];
        if (childNodes.length) {
          return h(tag, nodeAttrs, [
            h(
              'div',
              { 'data-children': '', style: { display: 'contents' } },
              childNodes.map((child) =>
                h(NodeWrapperComp, {
                  key: child.id,
                  node: child,
                  selectedId: props.selectedId,
                  bindings: props.bindings,
                }),
              ),
            ),
          ]);
        }
        return h(tag, nodeAttrs, [
          h('div', { class: 'slot-drop-zone' }, [
            h('span', { class: 'slot-label' }, '자식 컴포넌트를 드롭하세요'),
          ]),
        ]);
      }

      return h(tag, nodeAttrs);
    };
  },
});
</script>

<!-- <script lang="ts">
import {
  defineComponent,
  computed,
  h,
  resolveComponent,
  isRef,
  unref,
  type PropType,
  type VNode,
} from 'vue';
import type { EditorNode } from '@ide-demo/editor';
import { componentRegistry } from '@ide-demo/editor';

export default defineComponent({
  name: 'NodeWrapper',

  props: {
    node: {
      type: Object as PropType<EditorNode>,
      required: true,
    },
    selectedId: {
      type: String as PropType<string | null>,
      default: null,
    },
    bindings: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({}),
    },
  },

  setup(props) {
    const meta = computed(() => componentRegistry[props.node.type] ?? null);

    /**
     * 바인딩 표현식을 실제 값으로 해석
     * 'systems' → bindings.systems (unref)
     * 'systems.data' → bindings.systems.data (unref 후 접근)
     * 'systems.data.value' → bindings.systems.data.value
     * 'colDefs' → bindings.colDefs (unref)
     */
    function resolveBindingExpression(
      expr: string,
      bindings: Record<string, any>,
    ): any {
      if (!expr || !bindings) return undefined;

      const parts = expr.split('.');
      let current: any = bindings;

      for (let i = 0; i < parts.length; i++) {
        if (current === undefined || current === null) return undefined;

        // 현재 값이 ref면 .value를 꺼냄 (단, 다음 part가 'value'면 직접 접근)
        if (isRef(current) && parts[i] !== 'value') {
          current = current.value;
        }

        if (i === 0) {
          // 첫 번째 파트는 bindings에서 가져옴
          current = current[parts[i]];
        } else {
          // 나머지는 property 접근
          current = current[parts[i]];
        }
      }

      // 최종 값도 ref면 unref
      return unref(current);
    }

    const resolvedTag = computed(() => {
      const tagName =
        props.node.type === 'Div'
          ? 'div'
          : (meta.value?.tagName ?? props.node.type);
      const nativeTags = [
        'div',
        'span',
        'p',
        'section',
        'header',
        'footer',
        'main',
        'nav',
        'aside',
        'article',
      ];
      if (nativeTags.includes(tagName)) return tagName;
      return resolveComponent(tagName);
    });

    const isSelected = computed(() => props.selectedId === props.node.id);

    return () => {
      const tag = resolvedTag.value;
      const NodeWrapperComp = resolveComponent('NodeWrapper');
      const metaProps = meta.value?.props ?? {};

      // ── props 빌드 (render 안에서 해야 ref 추적됨) ──
      const builtProps: Record<string, any> = {};
      for (const [key, value] of Object.entries(props.node.props)) {
        if (key === 'class') continue;
        if (value === '' || value === undefined || value === null) continue;

        const isBind =
          metaProps[key]?.type === 'binding' ||
          props.node.bindModes?.[key] === true;

        if (isBind) {
          const resolved = resolveBindingExpression(value, props.bindings);
          if (resolved !== undefined) {
            builtProps[key] = resolved;
          }
          continue;
        }

        builtProps[key] = value;
      }

      // ── events 빌드 ──
      const builtEvents: Record<string, Function> = {};
      for (const [eventName, handlerName] of Object.entries(
        props.node.events,
      )) {
        if (!handlerName) continue;
        const handler = props.bindings[handlerName];
        if (typeof handler === 'function') {
          // Vue h()에서 이벤트는 onXxx 형식
          const vueEventKey =
            'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
          builtEvents[vueEventKey] = (...args: any[]) => {
            try {
              handler(...args);
            } catch (e) {
              console.warn(
                `[NodeWrapper] 이벤트 핸들러 실행 실패: ${handlerName}`,
                e,
              );
            }
          };
        }
      }

      const nodeAttrs: Record<string, any> = {
        ...builtProps,
        ...builtEvents,
        'data-node-id': props.node.id,
        'data-node-type': props.node.type,
        class: [props.node.props.class, { 'node--selected': isSelected.value }],
      };

      if (meta.value?.canHaveChildren) {
        nodeAttrs['data-container'] = '';
      }

      // ── 슬롯이 있는 컨테이너 ──
      if (meta.value?.canHaveChildren && meta.value.slots.length > 0) {
        const slots: Record<string, () => VNode | VNode[]> = {};

        for (const slotDef of meta.value.slots) {
          const slotNodes = props.node.slots[slotDef.name] ?? [];

          if (slotNodes.length > 0) {
            slots[slotDef.name] = () =>
              h(
                'div',
                {
                  'data-slot-name': slotDef.name,
                  'data-parent-id': props.node.id,
                  style: { display: 'contents' },
                },
                slotNodes.map((child) =>
                  h(NodeWrapperComp, {
                    key: child.id,
                    node: child,
                    selectedId: props.selectedId,
                    bindings: props.bindings,
                  }),
                ),
              );
          }
        }

        return h(tag, nodeAttrs, slots);
      }

      // ── 슬롯 없는 컨테이너 ──
      if (meta.value?.canHaveChildren) {
        const childNodes = props.node.children ?? [];

        if (childNodes.length) {
          return h(tag, nodeAttrs, [
            h(
              'div',
              {
                'data-children': '',
                style: { display: 'contents' },
              },
              childNodes.map((child) =>
                h(NodeWrapperComp, {
                  key: child.id,
                  node: child,
                  selectedId: props.selectedId,
                  bindings: props.bindings,
                }),
              ),
            ),
          ]);
        }

        return h(tag, nodeAttrs, [
          h(
            'div',
            {
              'data-children': '',
              class: 'slot-drop-zone',
            },
            [h('span', { class: 'slot-label' }, '자식 컴포넌트를 드롭하세요')],
          ),
        ]);
      }

      // ── 비컨테이너 ──
      return h(tag, nodeAttrs);
    };
  },
});
</script>

<style>
/* .node--selected {
  outline: 2px solid #6366f1 !important;
  outline-offset: 2px;
} */
.slot-drop-zone {
  min-height: 32px;
  border: 1.5px dashed #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}
.slot-label {
  font-size: 11px;
  color: #9ca3af;
}
</style> -->
