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
const loadingThemes = new Map<string, Promise<void>>();

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

export const THEME_CHANGED_EVENT = "quantara:theme-changed";

export function notifyThemeApplied(): void {
  window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT));
}

export function applyThemeAttributes(themeName: string): void {
  const resolved = resolveThemeName(themeName);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved.startsWith("dark") ? "dark" : "light";
}

export function beginThemeTransition(): void {
  document.documentElement.setAttribute("data-theme-transitioning", "");
}

export function endThemeTransition(): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.removeAttribute("data-theme-transitioning");
    });
  });
}

export async function loadThemeCSS(themeName: string): Promise<void> {
  const resolved = resolveThemeName(themeName);
  if (resolved !== themeName) {
    return loadThemeCSS(resolved);
  }

  if (activeStyleEls.has(resolved)) return;

  const inFlight = loadingThemes.get(resolved);
  if (inFlight) return inFlight;

  if (resolved === "light" || resolved === "dark") return;

  const key = getThemeKey(resolved);
  if (!key) {
    console.warn(`[theme-loader] No CSS found for theme: ${resolved}`);
    return;
  }

  const loadPromise = (async () => {
    try {
      const loader = themeModules[key];
      if (!loader) {
        console.warn(`[theme-loader] Loader not found for theme: ${resolved}`);
        return;
      }
      const css = await loader();
      if (activeStyleEls.has(resolved)) return;

      const style = document.createElement("style");
      style.setAttribute("data-theme-css", resolved);
      style.textContent = css;
      document.head.appendChild(style);
      activeStyleEls.set(resolved, style);
    } catch (err) {
      console.error(`[theme-loader] Failed to load theme CSS: ${resolved}`, err);
    } finally {
      loadingThemes.delete(resolved);
    }
  })();

  loadingThemes.set(resolved, loadPromise);
  return loadPromise;
}

/** Warm variant theme chunks in the background so later switches stay instant. */
export function preloadVariantThemes(): void {
  const variants = VALID_THEMES.filter((t) => t !== "light" && t !== "dark");
  const run = () => {
    for (const theme of variants) {
      void loadThemeCSS(theme);
    }
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run);
  } else {
    setTimeout(run, 2000);
  }
}
