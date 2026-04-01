<template>
  <div class="settings-dialog__backdrop" @click.self="handleDone">
    <div class="settings-dialog">
      <div class="settings-dialog__header">
        <span class="settings-dialog__title">설정</span>
        <button class="settings-dialog__close" @click="handleDone">✕</button>
      </div>

      <div class="settings-dialog__body">
        <!-- Canvas App URL -->
        <div class="settings-dialog__section">
          <div class="settings-dialog__section-title">Canvas App URL</div>
          <div class="settings-dialog__section-desc">
            iframe으로 로드할 canvas-app 주소. 배포 시 변경하세요.
          </div>
          <input
            v-model="settings.canvasAppUrl"
            class="settings-dialog__input"
            placeholder="http://localhost:5174"
          />
        </div>

        <!-- 코드 문자열 치환 -->
        <div class="settings-dialog__section">
          <div class="settings-dialog__section-title">
            코드 생성 문자열 치환
          </div>
          <div class="settings-dialog__section-desc">
            .vue 코드 생성 시 특정 문자열을 자동 치환합니다.
          </div>
          <div
            v-for="(rule, idx) in settings.codeReplacements"
            :key="idx"
            class="settings-dialog__replacement-row"
          >
            <input
              v-model="rule.from"
              class="settings-dialog__input settings-dialog__input--half"
              placeholder="원본 문자열"
            />
            <span class="settings-dialog__arrow">→</span>
            <input
              v-model="rule.to"
              class="settings-dialog__input settings-dialog__input--half"
              placeholder="치환 문자열"
            />
            <button
              class="settings-dialog__remove"
              @click="settings.codeReplacements.splice(idx, 1)"
            >
              ✕
            </button>
          </div>
          <button
            class="settings-dialog__add-btn"
            @click="settings.codeReplacements.push({ from: '', to: '' })"
          >
            + 규칙 추가
          </button>
        </div>

        <!-- 프록시 설정 -->
        <div class="settings-dialog__section">
          <div class="settings-dialog__section-title">API 프록시</div>
          <div class="settings-dialog__section-desc">
            canvas-app proxy 설정 참고용입니다.
          </div>
          <div
            v-for="(rule, idx) in settings.proxyRules"
            :key="idx"
            class="settings-dialog__replacement-row"
          >
            <input
              v-model="rule.path"
              class="settings-dialog__input settings-dialog__input--half"
              placeholder="/api"
            />
            <span class="settings-dialog__arrow">→</span>
            <input
              v-model="rule.target"
              class="settings-dialog__input settings-dialog__input--half"
              placeholder="http://localhost:5000/"
            />
            <button
              class="settings-dialog__remove"
              @click="settings.proxyRules.splice(idx, 1)"
            >
              ✕
            </button>
          </div>
          <button
            class="settings-dialog__add-btn"
            @click="settings.proxyRules.push({ path: '', target: '' })"
          >
            + 규칙 추가
          </button>
        </div>
      </div>

      <div class="settings-dialog__footer">
        <button class="settings-dialog__reset" @click="reset()">초기화</button>
        <button class="settings-dialog__done" @click="handleDone">완료</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRaw } from 'vue';
import { useSettings } from '@ide-demo/shared';

const emit = defineEmits<{
  close: [];
  // 닫힐 때 변경된 설정을 부모에게 전달
  confirm: [settings: any];
}>();

const { settings, reset } = useSettings();

// '완료' 버튼 클릭 시 호출
function handleDone() {
  // 현재 설정값을 순수 객체로 복사하여 부모에게 전달
  emit('confirm', JSON.parse(JSON.stringify(toRaw(settings.value))));
  emit('close');
}
</script>

<style scoped lang="scss">
.settings-dialog {
  &__backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 1002;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  background: var(--ide-bg);
  border: 1px solid var(--ide-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: var(--ide-surface);
    border-bottom: 1px solid var(--ide-border);
    flex-shrink: 0;
  }

  &__title {
    font-size: 14px;
    font-weight: 700;
    color: var(--ide-text);
  }

  &__close {
    padding: 4px 8px;
    font-size: 14px;
    color: var(--ide-text-dim);
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
      color: var(--ide-text);
      background: var(--ide-surface-alt);
    }
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }

  &__section {
    margin-bottom: 24px;
  }

  &__section-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ide-text);
    margin-bottom: 4px;
  }

  &__section-desc {
    font-size: 11px;
    color: var(--ide-text-dim);
    margin-bottom: 10px;
  }

  &__input {
    width: 100%;
    padding: 7px 10px;
    background: var(--ide-surface-alt);
    border: 1.5px solid var(--ide-border);
    border-radius: 5px;
    color: var(--ide-text);
    font-size: 12px;
    font-family: var(--ide-font-mono);
    outline: none;

    &:focus {
      border-color: var(--ide-primary);
    }

    &--half {
      flex: 1;
    }
  }

  &__replacement-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  &__arrow {
    color: var(--ide-text-dim);
    font-size: 14px;
    flex-shrink: 0;
  }

  &__remove {
    padding: 2px 6px;
    font-size: 12px;
    color: var(--ide-text-dimmer);
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 3px;
    flex-shrink: 0;

    &:hover {
      color: var(--ide-accent-red);
      background: rgba(239, 68, 68, 0.1);
    }
  }

  &__add-btn {
    padding: 5px 12px;
    font-size: 11px;
    font-weight: 600;
    color: var(--ide-text-dim);
    background: var(--ide-surface-alt);
    border: 1px dashed var(--ide-border);
    border-radius: 5px;
    cursor: pointer;
    font-family: inherit;
    width: 100%;
    transition: all 0.12s;

    &:hover {
      color: var(--ide-text);
      border-color: var(--ide-border-hover);
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: var(--ide-surface);
    border-top: 1px solid var(--ide-border);
    flex-shrink: 0;
  }

  &__reset {
    padding: 6px 16px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ide-accent-red);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 5px;
    cursor: pointer;
    font-family: inherit;

    &:hover {
      background: rgba(239, 68, 68, 0.2);
    }
  }

  &__done {
    padding: 6px 20px;
    font-size: 12px;
    font-weight: 700;
    background: var(--ide-primary);
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;

    &:hover {
      opacity: 0.85;
    }
  }
}
</style>
