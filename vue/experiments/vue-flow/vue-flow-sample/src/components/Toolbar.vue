<script setup lang="ts">
import { ref } from "vue";
import { useFlowStore } from "../stores/flowStore";

const store = useFlowStore();

const emit = defineEmits<{
  simulate: [];
  save: [];
}>();

const props = defineProps<{
  isSimulating: boolean;
}>();

// Import/Export
const showImportDialog = ref(false);
const importText = ref("");

function handleExport() {
  const json = store.exportToJson();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "flow-diagram.json";
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport() {
  if (store.importFromJson(importText.value)) {
    showImportDialog.value = false;
    importText.value = "";
  } else {
    alert("Invalid JSON format");
  }
}

function handleFileImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    if (store.importFromJson(content)) {
      showImportDialog.value = false;
    } else {
      alert("Invalid JSON format");
    }
  };
  reader.readAsText(file);
}
</script>

<template>
  <div class="toolbar">
    <!-- Undo/Redo -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        :disabled="!store.canUndo.value"
        @click="store.undo()"
        title="Undo (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        class="toolbar-btn"
        :disabled="!store.canRedo.value"
        @click="store.redo()"
        title="Redo (Ctrl+Y)"
      >
        ↷
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Snap Grid -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        :class="{ active: store.snapToGrid.value }"
        @click="store.snapToGrid.value = !store.snapToGrid.value"
        title="Snap to Grid"
      >
        ⊞
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Theme -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        @click="store.toggleTheme()"
        :title="store.theme.value === 'dark' ? 'Light Mode' : 'Dark Mode'"
      >
        {{ store.theme.value === "dark" ? "☀" : "☾" }}
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Import/Export -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        @click="showImportDialog = true"
        title="Import JSON"
      >
        📥
      </button>
      <button class="toolbar-btn" @click="handleExport" title="Export JSON">
        📤
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Simulate/Save -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        :class="{ active: isSimulating }"
        @click="$emit('simulate')"
      >
        {{ isSimulating ? "⏹ Stop" : "▶ Simulate" }}
      </button>
      <button class="toolbar-btn" @click="$emit('save')">💾 Save</button>
    </div>
  </div>

  <!-- Import Dialog -->
  <div
    v-if="showImportDialog"
    class="dialog-overlay"
    @click.self="showImportDialog = false"
  >
    <div class="dialog">
      <div class="dialog-header">
        <h3>Import JSON</h3>
        <button class="close-btn" @click="showImportDialog = false">✕</button>
      </div>
      <div class="dialog-body">
        <div class="file-input">
          <label>
            <input type="file" accept=".json" @change="handleFileImport" />
            <span class="file-btn">📁 Choose File</span>
          </label>
        </div>
        <div class="or-divider">or paste JSON</div>
        <textarea
          v-model="importText"
          placeholder="Paste JSON here..."
          rows="10"
        ></textarea>
      </div>
      <div class="dialog-footer">
        <button class="btn-secondary" @click="showImportDialog = false">
          Cancel
        </button>
        <button
          class="btn-primary"
          @click="handleImport"
          :disabled="!importText"
        >
          Import
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  padding: 4px;
}

.toolbar-group {
  display: flex;
  gap: 2px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--border-color, #334155);
  margin: 0 4px;
}

.toolbar-btn {
  padding: 6px 10px;
  background: transparent;
  color: var(--text-primary, #f1f5f9);
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--bg-hover, #334155);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn.active {
  background: #6366f1;
  color: white;
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px;
  width: 400px;
  max-width: 90vw;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color, #334155);
}

.dialog-header h3 {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary, #f1f5f9);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  font-size: 16px;
}

.close-btn:hover {
  color: var(--text-primary, #f1f5f9);
}

.dialog-body {
  padding: 16px;
}

.file-input input {
  display: none;
}

.file-btn {
  display: inline-block;
  padding: 8px 16px;
  background: var(--bg-primary, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 6px;
  color: var(--text-primary, #f1f5f9);
  font-size: 12px;
  cursor: pointer;
}

.file-btn:hover {
  background: var(--bg-hover, #334155);
}

.or-divider {
  text-align: center;
  color: var(--text-muted, #64748b);
  font-size: 12px;
  margin: 12px 0;
}

.dialog-body textarea {
  width: 100%;
  padding: 12px;
  background: var(--bg-primary, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 6px;
  color: var(--text-primary, #f1f5f9);
  font-size: 12px;
  font-family: monospace;
  resize: vertical;
  box-sizing: border-box;
}

.dialog-body textarea:focus {
  outline: none;
  border-color: #6366f1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--border-color, #334155);
}

.btn-secondary,
.btn-primary {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-color, #334155);
  color: var(--text-primary, #f1f5f9);
}

.btn-secondary:hover {
  background: var(--bg-hover, #334155);
}

.btn-primary {
  background: #6366f1;
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
