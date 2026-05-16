const VALID_THEMES = [
  "light",
  "light-warm",
  "light-cool",
  "light-soft",
  "dark",
  "dark-amber",
  "dark-midnight",
  "dark-forest",
] as const;

const themeModules = import.meta.glob<string>("/src/themes/*.css", {
  query: "?raw",
  import: "default",
  eager: false,
});

const activeStyleEls = new Map<string, HTMLStyleElement>();

function isValidTheme(themeName: string): themeName is (typeof VALID_THEMES)[number] {
  return (VALID_THEMES as readonly string[]).includes(themeName);
}

function getThemeKey(themeName: string): string | null {
  const key = `/src/themes/${themeName}.css`;
  return key in themeModules ? key : null;
}

export function resolveThemeName(themeName: string): string {
  if (isValidTheme(themeName)) return themeName;
  const knownKey = getThemeKey(themeName);
  if (knownKey) return themeName;
  console.warn(`[theme-loader] Unknown theme "${themeName}", falling back to "light"`);
  return "light";
}

export async function loadThemeCSS(themeName: string): Promise<void> {
  const resolved = resolveThemeName(themeName);
  if (resolved !== themeName) {
    return loadThemeCSS(resolved);
  }

  if (activeStyleEls.has(resolved)) return;

  for (const [name, el] of activeStyleEls) {
    el.remove();
    activeStyleEls.delete(name);
  }

  if (resolved === "light" || resolved === "dark") return;

  const key = getThemeKey(resolved);
  if (!key) {
    console.warn(`[theme-loader] No CSS found for theme: ${resolved}`);
    return;
  }

  try {
    const loader = themeModules[key];
    if (!loader) {
      console.warn(`[theme-loader] Loader not found for theme: ${resolved}`);
      return;
    }
    const css = await loader();
    const style = document.createElement("style");
    style.setAttribute("data-theme-css", resolved);
    style.textContent = css;
    document.head.appendChild(style);
    activeStyleEls.set(resolved, style);
  } catch (err) {
    console.error(`[theme-loader] Failed to load theme CSS: ${resolved}`, err);
  }
}
