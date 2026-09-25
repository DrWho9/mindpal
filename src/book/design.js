/**
 * Book Design: fonts, themes, colours, text size.
 * Themes and the localStorage key are from ff8da0f (mindpal-book-design-v1).
 * Text size is the owner spec addition on that same saved object.
 */

export const BOOK_DESIGN_KEY = "mindpal-book-design-v1";

export const DESIGN_THEMES = {
  paper: {
    id: "paper",
    label: "Paper cream",
    bg: "#faf6ef",
    ink: "#2a2621",
    accent: "#2f5d50",
    muted: "#6b645c",
    chrome: "rgba(255,252,246,.94)",
    chip: "#dceae2",
    line: "#e4dccf",
  },
  sage: {
    id: "sage",
    label: "Sage calm",
    bg: "#e8f0eb",
    ink: "#1e2e28",
    accent: "#3d6b58",
    muted: "#5a6e63",
    chrome: "rgba(232,240,235,.96)",
    chip: "#cfe3d7",
    line: "#cfdfd5",
  },
  night: {
    id: "night",
    label: "Night",
    bg: "#1a1d21",
    ink: "#e8e6e3",
    accent: "#7eb89a",
    muted: "#9a958e",
    chrome: "rgba(28,32,38,.96)",
    chip: "#2a3238",
    line: "#333940",
  },
  sepia: {
    id: "sepia",
    label: "Sepia",
    bg: "#f4ecd8",
    ink: "#5c4a32",
    accent: "#8b6914",
    muted: "#8a7a62",
    chrome: "rgba(244,236,216,.96)",
    chip: "#e8dcc0",
    line: "#e0d4b8",
  },
  sky: {
    id: "sky",
    label: "Soft sky",
    bg: "#eef4fa",
    ink: "#243447",
    accent: "#4a7ab0",
    muted: "#5f7085",
    chrome: "rgba(238,244,250,.96)",
    chip: "#d6e4f2",
    line: "#cfdceb",
  },
};

export const BOOK_FONTS = [
  { id: "serif", label: "Serif · Georgia", css: "Georgia, 'Times New Roman', ui-serif, serif" },
  { id: "sans", label: "Sans · System", css: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { id: "rounded", label: "Soft rounded", css: "ui-rounded, 'Segoe UI', system-ui, sans-serif" },
];

export const TEXT_SIZES = [
  { id: "sm", label: "Small", css: "0.98rem" },
  { id: "md", label: "Medium", css: "1.12rem" },
  { id: "lg", label: "Large", css: "1.28rem" },
  { id: "xl", label: "Extra large", css: "1.46rem" },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

export function defaultDesign() {
  const theme = DESIGN_THEMES.paper;
  return {
    font: "serif",
    theme: "paper",
    textSize: "md",
    textColor: theme.ink,
    bgColor: theme.bg,
  };
}

function fontById(id) {
  return BOOK_FONTS.find((font) => font.id === id) || BOOK_FONTS[0];
}

function sizeById(id) {
  return TEXT_SIZES.find((size) => size.id === id) || TEXT_SIZES[1];
}

export function normalizeDesign(raw) {
  const base = defaultDesign();
  const theme = DESIGN_THEMES[raw?.theme] || DESIGN_THEMES.paper;
  const textColor = HEX.test(raw?.textColor || "") ? raw.textColor : theme.ink;
  const bgColor = HEX.test(raw?.bgColor || "") ? raw.bgColor : theme.bg;
  return {
    font: fontById(raw?.font).id,
    theme: theme.id,
    textSize: sizeById(raw?.textSize).id,
    textColor,
    bgColor,
  };
}

export function designWithTheme(design, themeId) {
  const theme = DESIGN_THEMES[themeId] || DESIGN_THEMES.paper;
  return normalizeDesign({
    ...design,
    theme: theme.id,
    textColor: theme.ink,
    bgColor: theme.bg,
  });
}

export function designCssVars(design) {
  const next = normalizeDesign(design);
  const theme = DESIGN_THEMES[next.theme] || DESIGN_THEMES.paper;
  const font = fontById(next.font);
  const size = sizeById(next.textSize);
  return {
    "--book-bg": next.bgColor || theme.bg,
    "--book-ink": next.textColor || theme.ink,
    "--book-accent": theme.accent,
    "--book-muted": theme.muted,
    "--book-chrome": theme.chrome,
    "--book-chip": theme.chip,
    "--book-line": theme.line,
    "--book-font": font.css,
    "--book-size": size.css,
  };
}

export function loadDesign(storage) {
  if (!storage) return defaultDesign();
  try {
    const raw = JSON.parse(storage.getItem(BOOK_DESIGN_KEY) || "null");
    return normalizeDesign(raw);
  } catch {
    return defaultDesign();
  }
}

export function saveDesign(design, storage) {
  const next = normalizeDesign(design);
  if (!storage) return next;
  try {
    storage.setItem(BOOK_DESIGN_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  return next;
}
