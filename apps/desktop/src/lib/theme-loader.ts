const themeModules = import.meta.glob<string>("/src/themes/*.css", {
  query: "?raw",
  import: "default",
  eager: false,
});

const activeStyleEls = new Map<string, HTMLStyleElement>();

function getThemeKey(themeName: string): string | null {
  const key = `/src/themes/${themeName}.css`;
  return key in themeModules ? key : null;
}

export async function loadThemeCSS(themeName: string): Promise<void> {
  if (activeStyleEls.has(themeName)) return;

  for (const [name, el] of activeStyleEls) {
    el.remove();
    activeStyleEls.delete(name);
  }

  if (themeName === "light" || themeName === "dark") return;

  const key = getThemeKey(themeName);
  if (!key) {
    console.warn(`[theme-loader] No CSS found for theme: ${themeName}`);
    return;
  }

  try {
    const loader = themeModules[key];
    if (!loader) {
      console.warn(`[theme-loader] Loader not found for theme: ${themeName}`);
      return;
    }
    const css = await loader();
    const style = document.createElement("style");
    style.setAttribute("data-theme-css", themeName);
    style.textContent = css;
    document.head.appendChild(style);
    activeStyleEls.set(themeName, style);
  } catch (err) {
    console.error(`[theme-loader] Failed to load theme CSS: ${themeName}`, err);
  }
}
