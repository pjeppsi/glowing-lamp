import { Theme } from '../services/theme.service';

// Categorical palettes, one per theme, same hue order so a given index
// keeps its identity across a theme switch. Both are validated for
// lightness band, chroma floor and CVD separation against their
// respective card surface (dark: --fc-card #16161e, light: --fc-card
// #ffffff) — see the dataviz skill. Only used as swatch/fill colors, never
// as text, so this isn't a text-contrast (WCAG) check.
const CATEGORICAL_DARK = [
  '#3987e5', // blue
  '#199e70', // aqua
  '#c98500', // yellow
  '#008300', // green
  '#9085e9', // violet
  '#e66767', // red
] as const;

const CATEGORICAL_LIGHT = [
  '#1d6fd1', // blue
  '#0f7a5c', // aqua
  '#a05d00', // yellow
  '#046b04', // green
  '#6c5ce0', // violet
  '#c23a3a', // red
] as const;

export function categoricalChartColors(theme: Theme): readonly string[] {
  return theme === 'light' ? CATEGORICAL_LIGHT : CATEGORICAL_DARK;
}

// Axis/gridline/accent colors for Chart.js canvas rendering. Chart.js draws
// to a <canvas>, which can't resolve CSS custom properties the way DOM
// elements do, so these mirror the --fc-text-secondary / --fc-border /
// --fc-accent-light values per theme from styles.scss rather than reading
// them at runtime — keep the two in sync if those tokens ever change.
export interface ChartThemeColors {
  muted: string;
  grid: string;
  accent: string;
}

export function chartThemeColors(theme: Theme): ChartThemeColors {
  return theme === 'light'
    ? { muted: '#4b4b5e', grid: 'rgba(0, 0, 0, 0.08)', accent: '#6d28d9' }
    : { muted: '#8b8ba8', grid: 'rgba(255, 255, 255, 0.07)', accent: '#a78bfa' };
}
