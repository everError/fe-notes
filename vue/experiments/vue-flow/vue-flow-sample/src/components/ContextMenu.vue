<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

export interface MenuItem {
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
}

const props = defineProps<{
  x: number;
  y: number;
  items: MenuItem[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const menuRef = ref<HTMLDivElement | null>(null);

function handleClick(item: MenuItem) {
  if (item.disabled) return;
  item.action();
  emit("close");
}

function handleClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit("close");
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("contextmenu", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("contextmenu", handleClickOutside);
});
</script>

<template>
  <div
    ref="menuRef"
    class="context-menu"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <template v-for="(item, index) in items" :key="index">
      <div v-if="item.divider" class="menu-divider"></div>
      <div
        v-else
        class="menu-item"
        :class="{ disabled: item.disabled }"
        @click="handleClick(item)"
      >
        <span class="menu-icon">{{ item.icon || "" }}</span>
        <span class="menu-label">{{ item.label }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  padding: 4px;
  min-width: 160px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.menu-item:hover:not(.disabled) {
  background: var(--bg-hover, #334155);
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-icon {
  width: 16px;
  text-align: center;
  font-size: 12px;
}

.menu-label {
  font-size: 12px;
  color: var(--text-primary, #f1f5f9);
}

.menu-divider {
  height: 1px;
  background: var(--border-color, #334155);
  margin: 4px 8px;
}
</style>
