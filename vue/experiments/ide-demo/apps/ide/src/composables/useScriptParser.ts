import { computed, type Ref } from 'vue';
import type {
  ParsedScript,
  ParsedVariable,
  ParsedFunction,
} from '@ide-demo/editor';

/**
 * 스크립트 코드를 파싱하여 변수/함수 목록을 추출
 *
 * 현재: 정규식 기반 간이 파서
 * 향후: TypeScript Compiler API 또는 @vue/compiler-sfc 로 전환하여
 *       타입 정보까지 정확하게 추출 가능
 */
export function useScriptParser(script: Ref<string>) {
  const parsed = computed<ParsedScript>(() => {
    return parseScriptCode(script.value);
  });

  const variables = computed(() => parsed.value.variables);
  const functions = computed(() => parsed.value.functions);

  /** 바인딩 가능한 변수 목록 (type 필터 적용) */
  function getBindableVariables(filterTypes?: string[]) {
    if (!filterTypes?.length) return variables.value;
    return variables.value.filter((v) => filterTypes.includes(v.type));
  }

  return {
    parsed,
    variables,
    functions,
    getBindableVariables,
  };
}

/** 스크립트 코드 파싱 (순수 함수) */
export function parseScriptCode(code: string): ParsedScript {
  const variables: ParsedVariable[] = [];
  const functions: ParsedFunction[] = [];

  const lines = code.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // ref
    const refMatch = trimmed.match(/^const\s+(\w+)\s*=\s*ref\s*[<(]/);
    if (refMatch) {
      variables.push({ name: refMatch[1], type: 'ref' });
      continue;
    }

    // reactive
    const reactiveMatch = trimmed.match(/^const\s+(\w+)\s*=\s*reactive\s*[<(]/);
    if (reactiveMatch) {
      variables.push({ name: reactiveMatch[1], type: 'reactive' });
      continue;
    }

    // computed
    const computedMatch = trimmed.match(/^const\s+(\w+)\s*=\s*computed\s*[<(]/);
    if (computedMatch) {
      variables.push({ name: computedMatch[1], type: 'computed' });
      continue;
    }

    // const (일반 상수 — ref/reactive/computed 아닌 것)
    const constMatch = trimmed.match(
      /^const\s+(\w+)\s*=\s*(?!ref|reactive|computed)\s*[\[{'"]/,
    );
    if (constMatch) {
      variables.push({ name: constMatch[1], type: 'const' });
      continue;
    }

    // function 선언
    const fnMatch = trimmed.match(/^(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      functions.push({
        name: fnMatch[2],
        isAsync: !!fnMatch[1],
        params: fnMatch[3]
          ? fnMatch[3].split(',').map((p) => p.trim().split(':')[0].trim())
          : [],
      });
      continue;
    }

    // arrow function
    const arrowMatch = trimmed.match(
      /^const\s+(\w+)\s*=\s*(async\s*)?\(([^)]*)\)\s*(?::\s*\w+\s*)?=>/,
    );
    if (
      arrowMatch &&
      !trimmed.includes('ref') &&
      !trimmed.includes('reactive') &&
      !trimmed.includes('computed')
    ) {
      functions.push({
        name: arrowMatch[1],
        isAsync: !!arrowMatch[2],
        params: arrowMatch[3]
          ? arrowMatch[3].split(',').map((p) => p.trim().split(':')[0].trim())
          : [],
      });
    }
  }

  return { variables, functions };
}
