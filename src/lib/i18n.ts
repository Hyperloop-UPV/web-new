import i18next from "i18next";

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "es", "va"] as const;

/**
 * Remove locale prefix from a path
 * @example stripLocale("/es/about") => "/about"
 * @example stripLocale("/about") => "/about"
 */
export function stripLocale(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (SUPPORTED_LOCALES.includes(segments[0] as any)) {
    return "/" + segments.slice(1).join("/");
  }
  return path;
}

/**
 * Add locale prefix to a path
 * @example localizePath("/about", "es") => "/es/about"
 * @example localizePath("/about", "en") => "/about"
 */
export function localizePath(path: string, locale?: string): string {
  const targetLocale = locale || i18next.language || DEFAULT_LOCALE;
  const cleanPath = stripLocale(path);

  if (targetLocale === DEFAULT_LOCALE) {
    return cleanPath;
  }

  return `/${targetLocale}${cleanPath}`;
}

/**
 * Get the next locale in rotation (en -> es -> va -> en)
 */
export function getNextLocale(current?: string): string {
  const locale = current || i18next.language || DEFAULT_LOCALE;
  const index = SUPPORTED_LOCALES.indexOf(locale as any);
  const nextIndex = (index + 1) % SUPPORTED_LOCALES.length;
  return SUPPORTED_LOCALES[nextIndex];
}

/**
 * Get locale label for display
 */
export function getLocaleLabel(locale: string): string {
  const labels: Record<string, string> = {
    en: "EN",
    es: "ES",
    va: "VA",
  };
  return labels[locale] || locale.toUpperCase();
}
