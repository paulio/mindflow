export type ThemeId = 'classic' | 'subtle';

export interface ThemeDefinition {
  nodeBg: string;
  nodeBgSelected: string;
  nodeBorderColor: string;
  nodeBorderColorSelected: string;
  nodeBorderWidth: string;
  nodeBorderWidthSelected: string;
  nodeTextColor: string;
  handleSourceColor: string;
  handleTargetColor: string;
  selectionOutline: string; // box-shadow value
  editorBg: string;
  editorTextColor: string;
}

export const themes: Record<ThemeId, ThemeDefinition> = {
  classic: {
    nodeBg: '#1b1b1f',
    nodeBgSelected: '#22242a',
    nodeBorderColor: '#2a2a30',
    nodeBorderColorSelected: 'var(--color-accent)',
    nodeBorderWidth: '1px',
    nodeBorderWidthSelected: '2px',
    nodeTextColor: 'var(--color-text)',
    handleSourceColor: '#ffd84f', // existing yellow (source or target depending on convention)
    handleTargetColor: '#4f9dff',
    selectionOutline: '0 0 0 3px rgba(79,157,255,0.35)',
    editorBg: 'transparent',
    editorTextColor: 'var(--color-text)'
  },
  subtle: {
    nodeBg: '#202022',
    nodeBgSelected: '#262628',
    nodeBorderColor: '#2c2c2e',
    nodeBorderColorSelected: '#3a3a3d',
    nodeBorderWidth: '1px',
    nodeBorderWidthSelected: '1px',
    nodeTextColor: '#f2f2f2',
    handleSourceColor: '#e7c34a',
    handleTargetColor: '#6aa8e8',
    selectionOutline: '0 0 0 2px rgba(122,184,255,0.30)',
    editorBg: 'transparent',
    editorTextColor: '#f2f2f2'
  }
};

export const defaultTheme: ThemeId = 'classic';

export function validateThemes() {
  const required: (keyof ThemeDefinition)[] = ['nodeBg','nodeBgSelected','nodeBorderColor','nodeBorderColorSelected','nodeBorderWidth','nodeBorderWidthSelected','nodeTextColor','handleSourceColor','handleTargetColor','selectionOutline','editorBg','editorTextColor'];
  Object.entries(themes).forEach(([id, def]) => {
    for (const k of required) {
      if (!(k in def)) throw new Error(`Theme ${id} missing key ${k}`);
    }
  });
}
