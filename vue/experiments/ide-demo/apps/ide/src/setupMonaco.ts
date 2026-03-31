import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

window.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

// TS 진단 마커 전역 차단 (하이라이팅은 유지)
monaco.editor.onDidChangeMarkers((uris) => {
  for (const uri of uris) {
    const model = monaco.editor.getModel(uri);
    if (model) {
      monaco.editor.setModelMarkers(model, 'typescript', []);
      monaco.editor.setModelMarkers(model, 'javascript', []);
    }
  }
});
