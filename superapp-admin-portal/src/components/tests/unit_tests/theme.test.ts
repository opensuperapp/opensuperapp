import { describe, it, expect } from '@jest/globals';
import { createAppTheme } from '../../../theme';

describe('theme configuration', () => {
  it('creates a light theme with expected palette and typography', () => {
    const theme = createAppTheme('light');
    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.primary?.main).toBe('#2563eb');
    expect(theme.palette.secondary?.main).toBe('#7c3aed');
    expect(theme.palette.background?.default).toBe('#f8fafc');
    expect(theme.palette.text?.primary).toBe('#0f172a');
    expect(theme.shape.borderRadius).toBe(10);
    expect(theme.typography?.h1?.fontSize).toBe('2.25rem');
    expect(theme.components?.MuiButton?.styleOverrides?.root).toBeTruthy();
  });

  it('creates a dark theme with expected palette and overrides', () => {
    const theme = createAppTheme('dark');
    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.primary?.main).toBe('#60a5fa');
    expect(theme.palette.background?.default).toBe('#0f172a');
    expect(theme.palette.text?.primary).toBe('#f1f5f9');
    // Component-specific override reflecting dark divider border
    const cardBorder = (theme.components?.MuiCard?.styleOverrides as any)?.root?.border as string;
    expect(cardBorder).toContain('#334155');
    // AppBar shadow changes by mode
    const appBarRoot = (theme.components?.MuiAppBar?.styleOverrides as any)?.root;
    expect(appBarRoot).toBeTruthy();
  });
});
