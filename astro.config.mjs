// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import astroI18next from 'astro-i18next';

// https://astro.build/config
export default defineConfig({
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es", "va"],
  },
  integrations: [astroI18next()],
  vite: {
    plugins: [tailwindcss()],
  },
});