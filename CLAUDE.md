# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the Hyperloop UPV marketing/content website, built with Astro 6 + Tailwind CSS 4, content sourced from Contentful, and localized into English (default), Spanish, and Valencian.

## Commands

- `npm run dev` — start local dev server at `localhost:4321`
- `npm run build` — build production site to `./dist/`
- `npm run preview` — preview a production build locally
- `npm run astro ...` — run any Astro CLI command (e.g. `npm run astro check` for type checking)
- `npm run contentful:migrate` — run `scripts/contentful/migrate-contentful.mjs` (referenced in `package.json` but not currently present in the repo — check before relying on it)

There is no test suite or linter configured in this repo.

## Environment variables

Required for any page that fetches Contentful data (see `src/env.d.ts`):
- `CONTENTFUL_SPACE_ID`
- `CONTENTFUL_DELIVERY_TOKEN`
- `CONTENTFUL_PREVIEW_TOKEN`

## Architecture

### i18n: locale-prefixed page duplication

Astro's built-in i18n routing is used (`astro.config.mjs`: default locale `en`, supported `en`/`es`/`va`), combined with `astro-i18next` for translation strings from `public/locales/{en,es,va}/translation.json`. All three dictionaries must keep identical key structure — a key missing in `es`/`va` renders the raw key, it does not fall back to English.

Concretely, this means **pages are duplicated per non-default locale**: `src/pages/index.astro` also has `src/pages/es/index.astro` and `src/pages/va/index.astro`, each calling `changeLanguage("<locale>")` near the top **before** any `t(...)` call or Contentful fetch — that call is what makes `i18next.language` resolve correctly for that specific file, since there's no shared request-scoped language context across the component tree. When adding or editing a page, you generally need to update the `en` version and its `es`/`va` counterparts together. `[slug].astro` dynamic routes exist per-locale too (e.g. `src/pages/join/[slug].astro`, `src/pages/es/join/[slug].astro`).

To add a new translated string: add the key to `public/locales/en/translation.json`, mirror it with translated copy in the `es` and `va` files, then call `t("your.new.key")` from the page/component.

`src/lib/i18n.ts` provides locale-path helpers (`stripLocale`, `localizePath`, `getNextLocale`, `getLocaleLabel`) used by locale-switcher UI (e.g. in `Header.astro`).

### Content layer: Contentful

All CMS access goes through `src/lib/contentful/` — pages/components should never import the Contentful client directly, always go through the repository:
- `contentfulClient.ts` — creates the single Contentful delivery client from env vars (`CONTENTFUL_SPACE_ID`, `CONTENTFUL_DELIVERY_TOKEN`), throwing early if either is missing.
- `repository.ts` — `contentRepository`, the single object every page/component uses to fetch and shape content (e.g. `getHomePageContent`, `getSubsystemsWithMembers`, `getPartners`, `getJobOpenings`, `getJobOpeningBySlug`, `getNetworkingEventsBySlug`, `getMembers`). It normalizes raw Contentful entries (which are loosely typed `CtfEntry`/`CtfAsset` shapes, since the SDK types don't reflect the real content model) into the typed shapes in `types.ts`, converts asset references to absolute, transformed image URLs via `getAssetUrl`/`getAssetUrls` (appends Contentful Image API params: `fm=webp`, `q`, `w`, `h`, `fit`), and converts rich text `Document` fields to HTML via `documentToHtmlString` for rendering with `set:html`.
- `types.ts` — the normalized content shapes (`PartnerFields`, `MemberFields`, `SubsystemFields`, `JobOpeningFields`, `HomePageContent`, etc.) that pages/components consume. Adding a new Contentful field: confirm it exists in the content model → add it to the relevant interface here → map it in the matching `repository.ts` method → consume it from the page/component.

Pages derive a Contentful locale from the active i18next language before calling repository methods — see the `contentfulLocale` switch near the top of each page file. The mapping is **not** 1:1 with site locales: `en` → `en-US`, `es` → `es`, and `va` currently has no Contentful locale configured, so it falls back to `en-US` (this switch is the single place to update per page if Valencian content is added to Contentful later).

`npm run contentful:migrate` → `scripts/contentful/migrate-contentful.mjs` is meant to bootstrap the content model/entries via `contentful-management`, but that script does not exist in this repo yet — see `README.md` for the caveat.

### Pages and components

- `src/pages/` — route files per the locale-duplication pattern above: `index`, `about`, `contact`, `investigation`, `partners`, `team`, `trajectory`, `join/` (listing + `[slug]` detail).
- `src/components/` — Astro components composed into pages (e.g. `Hero`, `MissionImageScatter`, `SubsystemsAccordion`, `VehicleTimeline`, `MeetTeamSection`, `PoweredBySupportSection`, `ImagesCarousel`, `JobOpeningCard`, `FilterBar`, `Header`, `SiteFooter`, `Breadcrumbs`, `Button`, `PageHero`, `Title`, `BlobReveal`, `MissionImageScatter`).
- `src/layouts/Layout.astro` — shared HTML shell (meta/OG tags, `astro:transitions` `ClientRouter`, page-transition overlay, custom cursor element); takes `title`/`description`/`img` props.
- GSAP (`gsap`) is used for animation in components/scripts; `lucide-astro` supplies icons.
