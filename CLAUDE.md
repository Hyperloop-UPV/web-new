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

Astro's built-in i18n routing is used (`astro.config.mjs`: default locale `en`, supported `en`/`es`/`va`), combined with `astro-i18next` for translation strings from `public/locales/{en,es,va}/translation.json`.

Concretely, this means **pages are duplicated per non-default locale**: `src/pages/index.astro` also has `src/pages/es/index.astro` and `src/pages/va/index.astro`, each calling `changeLanguage("<locale>")` near the top before fetching content and rendering `t(...)` strings. When adding or editing a page, you generally need to update the `en` version and its `es`/`va` counterparts together. `[slug].astro` dynamic routes exist per-locale too (e.g. `src/pages/join/[slug].astro`, `src/pages/es/join/[slug].astro`).

`src/lib/i18n.ts` provides locale-path helpers (`stripLocale`, `localizePath`, `getNextLocale`, `getLocaleLabel`) used by locale-switcher UI (e.g. in `Header.astro`).

### Content layer: Contentful

All CMS access goes through `src/lib/contentful/`:
- `contentfulClient.ts` — creates the Contentful delivery client from env vars.
- `repository.ts` — `contentRepository`, the single object every page/component uses to fetch and shape content (e.g. `getHomePageContent`, `getSubsystemsWithMembers`, `getPartners`, `getJobOpenings`, `getJobOpeningBySlug`, `getNetworkingEventsBySlug`, `getMembers`). It normalizes raw Contentful entries (which are loosely typed `CtfEntry`/`CtfAsset` shapes) into the typed shapes in `types.ts`, converts asset references to absolute URLs via `getAssetUrl`/`getAssetUrls`, and converts rich text `Document` fields to HTML via `documentToHtmlString`.
- `types.ts` — the normalized content shapes (`PartnerFields`, `MemberFields`, `SubsystemFields`, `JobOpeningFields`, `HomePageContent`, etc.) that pages/components consume. Add new fields here when extending what a repository method returns.

Pages pass a Contentful locale (`en-US`, `es`, `va`) derived from the i18next language when calling repository methods — see the `contentfulLocale` switch near the top of each page file.

### Pages and components

- `src/pages/` — route files per the locale-duplication pattern above: `index`, `about`, `contact`, `investigation`, `partners`, `team`, `trajectory`, `join/` (listing + `[slug]` detail).
- `src/components/` — Astro components composed into pages (e.g. `Hero`, `MissionImageScatter`, `SubsystemsAccordion`, `VehicleTimeline`, `MeetTeamSection`, `PoweredBySupportSection`, `ImagesCarousel`, `JobOpeningCard`, `FilterBar`, `Header`, `SiteFooter`, `Breadcrumbs`, `Button`, `PageHero`, `Title`, `BlobReveal`, `MissionImageScatter`).
- `src/layouts/Layout.astro` — shared HTML shell (meta/OG tags, `astro:transitions` `ClientRouter`, page-transition overlay, custom cursor element); takes `title`/`description`/`img` props.
- GSAP (`gsap`) is used for animation in components/scripts; `lucide-astro` supplies icons.
