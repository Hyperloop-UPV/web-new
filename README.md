# Hyperloop UPV — Website

The Hyperloop UPV marketing/content website: built with [Astro](https://astro.build) 6 and [Tailwind CSS](https://tailwindcss.com) 4, content sourced from [Contentful](https://www.contentful.com), and localized into English (default), Spanish, and Valencian.

## Author

**[Alex](https://github.com/Humanoidear)** — main author and primary maintainer of this codebase.

## Getting started

```sh
npm install
npm run dev
```

The dev server runs at `localhost:4321`.

### Environment variables

Any page that fetches Contentful data needs these set (see `src/env.d.ts`):

| Variable | Purpose |
| --- | --- |
| `CONTENTFUL_SPACE_ID` | Contentful space to read from |
| `CONTENTFUL_DELIVERY_TOKEN` | Content Delivery API token (published content) |
| `CONTENTFUL_PREVIEW_TOKEN` | Content Preview API token (draft content) |

Put these in a `.env` file at the project root; Astro loads them automatically via `import.meta.env`.

## Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Start local dev server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview a production build locally |
| `npm run astro ...` | Run any Astro CLI command (e.g. `npm run astro check`) |
| `npm run i18next:generate` | Regenerate `astro-i18next` types/config from `public/locales` |
| `npm run contentful:migrate` | Run `scripts/contentful/migrate-contentful.mjs` — **not currently present in the repo**, check before relying on it |

There is no test suite or linter configured in this repo.

## Translation methodology (i18n)

The site is localized into three locales: `en` (default), `es`, and `va`. Localization is built from two layers that work together:

1. **Astro's built-in i18n routing** (`astro.config.mjs`) declares the supported locales and default locale, and produces the `/`, `/es/`, `/va/` URL structure.
2. **`astro-i18next`** supplies translation strings (via `i18next`) from JSON dictionaries in `public/locales/{en,es,va}/translation.json`. Each file has the same key structure (`nav.about`, `hero.discover`, `mission.title`, …); every page calls `t("some.key")` to render the localized string for whatever language is active on that page.

### How a page picks up its locale

Astro's file-based i18n routing means **each localized page is a duplicated file**, not one page with runtime language switching:

- `src/pages/index.astro` is the English page.
- `src/pages/es/index.astro` and `src/pages/va/index.astro` are the Spanish/Valencian counterparts, living under a locale-prefixed folder.
- The same pattern repeats for every route (`about`, `contact`, `investigation`, `partners`, `team`, `trajectory`, `join`, and dynamic routes like `join/[slug]`).

Near the top of each localized page, `changeLanguage("<locale>")` is called explicitly (e.g. `changeLanguage("es")` in `src/pages/es/index.astro`) before any `t(...)` calls or Contentful fetches happen. This is what makes `i18next.language` and `t()` resolve to the right locale for that specific file, since there's no shared request-scoped language context across a single component tree — each duplicated page sets its own.

**Practical consequence:** editing a piece of UI copy or logic usually means updating the `en` version of a page *and* its `es`/`va` counterparts together, since they are independent files rather than one template with conditional branches. `[slug].astro` dynamic routes are duplicated the same way (e.g. `src/pages/join/[slug].astro` and `src/pages/es/join/[slug].astro`).

### Adding a new translation string

1. Add the key to `public/locales/en/translation.json`.
2. Add the same key with translated copy to `public/locales/es/translation.json` and `public/locales/va/translation.json`.
3. Reference it in the page/component with `t("your.new.key")`.

Keep key structure identical across all three files — a key missing from `es`/`va` will render the raw key rather than falling back to the English copy.

`src/lib/i18n.ts` provides path helpers used by the locale-switcher UI (e.g. in `Header.astro`):

- `stripLocale(path)` — removes a locale prefix (`/es/about` → `/about`).
- `localizePath(path, locale)` — adds the right prefix for a target locale.
- `getNextLocale(current)` — cycles `en → es → va → en` for the language-switcher control.
- `getLocaleLabel(locale)` — display label for the switcher (`EN`, `ES`, `VA`).

## Contentful methodology

All CMS access goes through `src/lib/contentful/`, split into three layers:

### 1. `contentfulClient.ts` — the raw client

Creates a single Contentful Delivery API client from `CONTENTFUL_SPACE_ID` and `CONTENTFUL_DELIVERY_TOKEN`, throwing early if either env var is missing. Every repository call goes through this one client instance.

### 2. `repository.ts` — the content repository (the only thing pages should import)

`contentRepository` exposes one method per content need — `getHomePageContent`, `getSubsystemsWithMembers`, `getPartners`, `getJobOpenings`, `getJobOpeningBySlug`, `getNetworkingEventsBySlug`, `getMembers`, etc. Pages and components never call the Contentful client directly; they always go through this repository. Its job is to:

- Query Contentful with `getEntries(query)`, treating the response as the loosely-typed `CtfEntry`/`CtfAsset` shapes (Contentful's SDK types don't reflect the actual content model).
- Normalize those raw entries into the strongly-typed shapes declared in `types.ts` (`PartnerFields`, `MemberFields`, `SubsystemFields`, `JobOpeningFields`, `HomePageContent`, …), so nothing outside this file needs to know about Contentful's field/entry structure.
- Resolve asset references to absolute, transformed image URLs via `getAssetUrl` / `getAssetUrls`, which append Contentful's Image API params (`fm=webp`, `q`, `w`, `h`, `fit`) and prefix protocol-relative URLs with `https:`.
- Convert Contentful rich-text `Document` fields to HTML strings via `documentToHtmlString` (e.g. long-form descriptions), so components can render them with `set:html` rather than walking rich-text nodes themselves.

### 3. `types.ts` — the normalized shapes pages/components consume

When a page needs a new field from Contentful, the flow is:

1. Add/confirm the field exists in the Contentful content model.
2. Add it to the relevant interface in `types.ts`.
3. Map it in the corresponding `repository.ts` method (raw `entry.fields.x` → typed field).
4. Consume it from the page/component — never reach past the repository into raw Contentful entries.

### Locale mapping

Contentful locales don't match the site's i18n locale codes one-to-one. Each page derives a Contentful locale from the active i18next language before calling repository methods, following this mapping (see the `contentfulLocale` switch near the top of every page file):

| Site locale (i18next) | Contentful locale |
| --- | --- |
| `en` | `en-US` |
| `es` | `es` |
| `va` | falls back to `en-US` (no Valencian Contentful locale configured) |

If Valencian content is added to Contentful in the future, this switch is the single place to update per page.

### Migrating/seeding content

`package.json` references `npm run contentful:migrate` → `scripts/contentful/migrate-contentful.mjs`, intended to bootstrap the Contentful content model/entries using `contentful-management`. That script is **not currently present in this repo** — treat the command as aspirational until the script is added, and check `scripts/contentful/` before relying on it.

## Architecture reference

- `src/pages/` — route files per the locale-duplication pattern above: `index`, `about`, `contact`, `investigation`, `partners`, `team`, `trajectory`, `join/` (listing + `[slug]` detail).
- `src/components/` — Astro components composed into pages (`Hero`, `MissionImageScatter`, `SubsystemsAccordion`, `VehicleTimeline`, `MeetTeamSection`, `PoweredBySupportSection`, `ImagesCarousel`, `JobOpeningCard`, `FilterBar`, `Header`, `SiteFooter`, `Breadcrumbs`, `Button`, `PageHero`, `Title`, `BlobReveal`, …).
- `src/layouts/Layout.astro` — shared HTML shell (meta/OG tags, `astro:transitions` `ClientRouter`, page-transition overlay, custom cursor element); takes `title`/`description`/`img` props.
- [GSAP](https://gsap.com) is used for animation in components/scripts; [`lucide-astro`](https://lucide.dev) supplies icons.

For contributor-facing conventions and instructions aimed at AI coding assistants, see [`CLAUDE.md`](./CLAUDE.md).
