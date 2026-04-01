import { ref, watch } from 'vue';

export interface IdeSettings {
  /** canvas-app iframe URL */
  canvasAppUrl: string;

  /** .vue 코드 생성 시 문자열 치환 목록 */
  codeReplacements: { from: string; to: string }[];

  /** canvas-app의 vite proxy 설정 (표시용, 실제 적용은 canvas-app에서) */
  proxyRules: { path: string; target: string }[];
}

const STORAGE_KEY = 'vue-ide-settings';

const defaults: IdeSettings = {
  canvasAppUrl: 'http://192.168.1.60:7030',
  codeReplacements: [],
  proxyRules: [
    { path: '/std', target: 'http://localhost:5066/' },
    { path: '/ws', target: 'ws://localhost:5010/' },
  ],
};

function loadSettings(): IdeSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaults, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...defaults };
}

const settings = ref<IdeSettings>(loadSettings());

watch(
  settings,
  (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  },
  { deep: true },
);

export function useSettings() {
  function reset() {
    settings.value = { ...defaults };
  }

  return { settings, reset };
}
