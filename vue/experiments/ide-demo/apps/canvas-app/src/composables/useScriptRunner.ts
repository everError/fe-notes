import {
  ref,
  reactive,
  computed,
  watch as vueWatch,
  shallowRef,
  toRef,
  toRefs,
  nextTick,
  onMounted,
  onBeforeUnmount,
  effectScope,
  type App,
  type EffectScope,
} from 'vue';
import { transform } from 'sucrase';

// ─── 모듈 레지스트리 ───
const moduleRegistry: Record<string, Record<string, any>> = {
  vue: {
    ref,
    reactive,
    computed,
    watch: vueWatch,
    shallowRef,
    toRef,
    toRefs,
    nextTick,
    onMounted,
    onBeforeUnmount,
  },
};

// ─── App 인스턴스 (inject 동작용) ───
let appInstance: App | null = null;

export function setAppInstance(app: App) {
  appInstance = app;
}

export function registerModule(name: string, exports: Record<string, any>) {
  moduleRegistry[name] = exports;
}

export function getModuleRegistry() {
  return moduleRegistry;
}

export function useScriptRunner() {
  const bindings = shallowRef<Record<string, any>>({});
  const error = ref<string | null>(null);
  let currentScope: EffectScope | null = null;

  function execute(rawScript: string) {
    error.value = null;

    // 이전 scope 정리 (메모리 누수 방지)
    if (currentScope) {
      currentScope.stop();
      currentScope = null;
    }

    try {
      // 1. <script setup> 태그 제거
      let code = rawScript
        .replace(/<script[^>]*>/i, '')
        .replace(/<\/script>/i, '')
        .trim();

      // 2. import 문 파싱 → require 형태로 변환
      const { code: importStripped, importCode } = transformImports(code);
      code = importStripped;

      // 3. 남은 import 전부 제거
      code = code.replace(/^import\s+.*$/gm, '');

      // 4. type/interface 제거 (여러 줄 포함)
      // export type Foo = { ... }
      code = code.replace(
        /^export\s+type\s+\w+\s*=\s*\{[\s\S]*?^\}\s*;?\s*$/gm,
        '',
      );
      // type Foo = { ... }
      code = code.replace(/^type\s+\w+\s*=\s*\{[\s\S]*?^\}\s*;?\s*$/gm, '');
      // 한 줄 type: type Foo = string | number
      code = code.replace(/^(?:export\s+)?type\s+\w+\s*=\s*[^{].*$/gm, '');
      // export interface Foo { ... }
      code = code.replace(
        /^export\s+interface\s+\w+[\s\S]*?^\}\s*;?\s*$/gm,
        '',
      );
      // interface Foo { ... }
      code = code.replace(/^interface\s+\w+[\s\S]*?^\}\s*;?\s*$/gm, '');
      // enum (혹시 쓸 경우)
      code = code.replace(
        /^(?:export\s+)?enum\s+\w+\s*\{[\s\S]*?^\}\s*;?\s*$/gm,
        '',
      );

      // 5. defineProps, defineEmits 등 매크로 제거
      code = code.replace(
        /^.*(?:defineProps|defineEmits|withDefaults|defineExpose|defineModel)\b.*$/gm,
        '',
      );

      // 6. export 키워드 제거
      code = code.replace(
        /^export\s+(const|let|function|async\s+function)/gm,
        '$1',
      );

      // 7. TS → JS 변환
      const jsResult = transform(code, {
        transforms: ['typescript'],
      });

      // 8. 혹시 남은 import 한번 더 제거
      const cleanJs = jsResult.code.replace(/^import\s+.*$/gm, '');

      // 9. top-level 이름 추출
      const names = extractNames(cleanJs);

      if (names.length === 0 && !importCode) {
        bindings.value = {};
        return;
      }

      // 10. 실행 — effectScope + runWithContext 조합
      const body = `
        ${importCode}
        ${cleanJs}
        return { ${names.join(', ')} };
      `;

      const fn = new Function('__require__', body);

      let result: Record<string, any> = {};
      currentScope = effectScope();

      if (appInstance) {
        appInstance.runWithContext(() => {
          result = currentScope!.run(() => fn(requireModule)) ?? {};
        });
      } else {
        result = currentScope.run(() => fn(requireModule)) ?? {};
      }

      bindings.value = result;
    } catch (e: any) {
      error.value = e.message;
      console.warn('[ScriptRunner]', e.message);
    }
  }

  return { bindings, error, execute };
}

// ─── import 변환 ───

function transformImports(code: string): { code: string; importCode: string } {
  const importLines: string[] = [];

  // 여러 줄 import를 한 줄로 합치기
  let normalized = code.replace(
    /import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"]\s*;?/gs,
    (match) => match.replace(/\n/g, ' '),
  );

  normalized = normalized.replace(
    /import\s+\w+\s*,\s*\{[^}]*\}\s*from\s*['"][^'"]+['"]\s*;?/gs,
    (match) => match.replace(/\n/g, ' '),
  );

  const lines = normalized.split('\n');
  const otherLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      otherLines.push(line);
      continue;
    }

    // type-only import → 제거
    if (trimmed.match(/^import\s+type\s+/)) {
      continue;
    }

    // named import
    const namedMatch = trimmed.match(
      /^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/,
    );
    if (namedMatch) {
      const imports = namedMatch[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => !s.startsWith('type '));
      if (imports.length > 0) {
        importLines.push(
          `const { ${imports.join(', ')} } = __require__('${namedMatch[2]}');`,
        );
      }
      continue;
    }

    // default + named
    const mixedMatch = trimmed.match(
      /^import\s+(\w+)\s*,\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/,
    );
    if (mixedMatch) {
      const imports = mixedMatch[2]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => !s.startsWith('type '));
      importLines.push(
        `const ${mixedMatch[1]} = (__require__('${mixedMatch[3]}')?.default ?? __require__('${mixedMatch[3]}'));`,
      );
      if (imports.length > 0) {
        importLines.push(
          `const { ${imports.join(', ')} } = __require__('${mixedMatch[3]}');`,
        );
      }
      continue;
    }

    // default import
    const defaultMatch = trimmed.match(
      /^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/,
    );
    if (defaultMatch) {
      importLines.push(
        `const ${defaultMatch[1]} = (__require__('${defaultMatch[2]}')?.default ?? __require__('${defaultMatch[2]}'));`,
      );
      continue;
    }

    // side-effect import → 무시
    if (trimmed.match(/^import\s+['"][^'"]+['"]\s*;?\s*$/)) {
      continue;
    }

    otherLines.push(line);
  }

  return {
    code: otherLines.join('\n'),
    importCode: importLines.join('\n'),
  };
}

// ─── require 구현 ───

function requireModule(moduleName: string): Record<string, any> {
  // 정확한 매칭
  if (moduleRegistry[moduleName]) {
    return moduleRegistry[moduleName];
  }

  // 부분 매칭 (경로 끝부분)
  for (const [key, value] of Object.entries(moduleRegistry)) {
    if (moduleName.endsWith(key) || key.endsWith(moduleName)) {
      return value;
    }
    // 마지막 경로 세그먼트 비교
    const moduleBase = moduleName.split('/').pop();
    const keyBase = key.split('/').pop();
    if (moduleBase && keyBase && moduleBase === keyBase) {
      return value;
    }
  }

  // 못 찾으면 조용히 빈 객체 반환
  return {};
}

// ─── 이름 추출 ───

function extractNames(code: string): string[] {
  const names: string[] = [];
  let braceDepth = 0;

  for (const line of code.split('\n')) {
    const t = line.trim();

    // 중괄호 깊이 추적
    for (const ch of t) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }

    // braceDepth가 0일 때만 top-level
    // 닫는 중괄호가 있는 줄은 이전 깊이에서 시작하므로,
    // 여는 중괄호 전에 선언이 있는 경우를 잡기 위해
    // 줄 시작 시점의 깊이를 계산
    const opensInLine = (t.match(/\{/g) || []).length;
    const closesInLine = (t.match(/\}/g) || []).length;
    const depthBeforeLine = braceDepth - opensInLine + closesInLine;

    if (depthBeforeLine !== 0) continue;

    const v = t.match(/^(?:const|let)\s+(\w+)\s*=/);
    if (v) names.push(v[1]);

    // 구조 분해: const { a, b } = ...
    const destructure = t.match(/^(?:const|let)\s+\{([^}]+)\}\s*=/);
    if (destructure) {
      destructure[1].split(',').forEach((s) => {
        const name = s.trim().split(':')[0].trim();
        if (name && /^\w+$/.test(name)) names.push(name);
      });
    }

    const f = t.match(/^(?:async\s+)?function\s+(\w+)/);
    if (f) names.push(f[1]);
  }

  return [...new Set(names)];
}
