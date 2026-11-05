export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "phn-theme";

/** Remembers whether the admin sidebar is collapsed; a cookie so the server renders the right width. */
export const SIDEBAR_COOKIE = "phn-sidebar";

/**
 * Runs inline in <head> before the page paints. Light is the default until someone picks
 * otherwise; "system" follows the OS setting.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export function applyTheme(pref: ThemePreference) {
  const dark =
    pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
