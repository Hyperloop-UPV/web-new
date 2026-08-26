import { documentToHtmlString } from "@contentful/rich-text-html-renderer";
import type { Document } from "@contentful/rich-text-types";

import { contentfulClient } from "./contentfulClient";
import type {
  HomePageContent,
  InvestigationFields,
  JobOpeningFields,
  MemberFields,
  NetworkingFields,
  PartnerFields,
  TierFields,
} from "./types";

type CtfAsset = {
  fields?: {
    file?: {
      url?: string;
    };
  };
};

type CtfEntry = {
  fields?: Record<string, unknown>;
};

type ImageOpts = {
  width?: number;
  height?: number;
  fit?: "fill" | "pad";
  quality?: number;
};

const buildImageUrl = (url: string, opts?: ImageOpts): string => {
  const params = new URLSearchParams();
  params.set("fm", "webp");
  params.set("q", String(opts?.quality ?? 75));
  if (opts?.width) params.set("w", String(opts.width));
  if (opts?.height) params.set("h", String(opts.height));
  if (opts?.fit) params.set("fit", opts.fit);
  return `${url}?${params.toString()}`;
};

const getAssetUrl = (
  assetLike: unknown,
  opts?: ImageOpts,
): string | undefined => {
  const asset = assetLike as CtfAsset | undefined;
  const rawUrl = asset?.fields?.file?.url;
  if (!rawUrl || typeof rawUrl !== "string") return undefined;
  const url = rawUrl.startsWith("http") ? rawUrl : `https:${rawUrl}`;
  return buildImageUrl(url, opts);
};

const getAssetUrls = (assetLike: unknown, opts?: ImageOpts): string[] => {
  if (Array.isArray(assetLike)) {
    return assetLike
      .map((asset) => getAssetUrl(asset, opts))
      .filter((value): value is string => Boolean(value));
  }

  const single = getAssetUrl(assetLike, opts);
  return single ? [single] : [];
};

const getFileUrl = (assetLike: unknown): string | undefined => {
  const asset = assetLike as CtfAsset | undefined;
  const rawUrl = asset?.fields?.file?.url;
  if (!rawUrl || typeof rawUrl !== "string") return undefined;
  return rawUrl.startsWith("http") ? rawUrl : `https:${rawUrl}`;
};

const getEntries = async (
  query: Record<string, unknown>,
): Promise<CtfEntry[]> => {
  const response = (await contentfulClient.getEntries(query)) as unknown as {
    items?: CtfEntry[];
  };
  return response.items ?? [];
};

const toHtml = (document?: Document): string => {
  if (!document) return "";
  return documentToHtmlString(document);
};

export const contentRepository = {
  async getSubsystemsWithMembers(locale = "en-US") {
    const subsystemEntries = await getEntries({
      content_type: "subsystem",
      include: 2,
      order: ["fields.name"],
      locale,
    });
    return subsystemEntries.map((entry) => {
      const membersRaw = Array.isArray(entry.fields?.members)
        ? (entry.fields?.members as CtfEntry[])
        : [];
      const members = membersRaw.map((member) => ({
        name: String(member.fields?.name ?? ""),
        role: member.fields?.role ? String(member.fields.role) : undefined,
        image: getAssetUrl(member.fields?.image, {
          width: 400,
          height: 400,
          fit: "fill",
        }),
        socials:
          (member.fields?.socials as Record<string, unknown> | undefined) ?? {},
      }));
      return {
        name: String(entry.fields?.name ?? ""),
        description: entry.fields?.description
          ? String(entry.fields.description)
          : undefined,
        groupImage: getAssetUrl(entry.fields?.groupImage, {
          width: 840,
          height: 640,
          fit: "fill",
        }),
        groupFunImage: getAssetUrl(entry.fields?.groupFunImage, {
          width: 840,
          height: 640,
          fit: "fill",
        }),
        color: entry.fields?.color ? String(entry.fields.color) : undefined,
        icon: getAssetUrl(entry.fields?.icon, { width: 80 }),
        members,
      };
    });
  },
  async getHomePageContent(locale = "en-US"): Promise<HomePageContent> {
    const [
      heroEntries,
      galleryEntries,
      subsystemEntries,
      vehicleEntries,
      partnerEntries,
    ] = await Promise.all([
      getEntries({
        content_type: "hero",
        include: 1,
        order: ["sys.createdAt"],
        limit: 1,
        locale,
      }),
      getEntries({
        content_type: "galery",
        include: 1,
        order: ["sys.createdAt"],
        locale,
      }),
      getEntries({
        content_type: "subsystem",
        include: 2,
        order: ["fields.name"],
        locale,
      }),
      getEntries({
        content_type: "vehicles",
        include: 1,
        order: ["-fields.date"],
        locale,
      }),
      getEntries({
        content_type: "partners",
        include: 2,
        order: ["fields.name"],
        locale,
      }),
    ]);

    const heroEntry = heroEntries[0];
    const heroBackgroundImages = getAssetUrls(heroEntry?.fields?.bg, {
      width: 1920,
    });
    const heroDescription = heroEntry?.fields?.description
      ? String(heroEntry.fields.description)
      : undefined;

    const missionImages = galleryEntries
      .map((entry) => getAssetUrl(entry.fields?.image, { width: 640 }))
      .filter((value): value is string => Boolean(value));

    const subsystemItems = subsystemEntries.map((entry) => ({
      label: String(entry.fields?.name ?? ""),
      href: "#",
      description: entry.fields?.description
        ? String(entry.fields.description)
        : undefined,
      image: getAssetUrl(entry.fields?.groupImage, {
        width: 800,
        height: 1200,
        fit: "fill",
      }),
      funImage: getAssetUrl(entry.fields?.groupFunImage, {
        width: 800,
        height: 1200,
        fit: "fill",
      }),
      icon: getAssetUrl(entry.fields?.icon, { width: 96 }),
    }));

    const vehicleTimeline = vehicleEntries.map((entry) => ({
      code: String(entry.fields?.codename ?? ""),
      years: String(entry.fields?.date ?? ""),
      vehicleName: String(entry.fields?.name ?? ""),
      description: String(entry.fields?.description ?? ""),
      accolades: Array.isArray(entry.fields?.accolades)
        ? (entry.fields?.accolades as unknown[]).map((item) => String(item))
        : [],
      image: getAssetUrl(entry.fields?.image, { width: 1080 }) ?? "",
    }));

    const partnerLogos = partnerEntries
      .map((entry) => getAssetUrl(entry.fields?.image, { width: 320 }))
      .filter((value): value is string => Boolean(value));

    return {
      hero: {
        bg: heroBackgroundImages,
        description: heroDescription,
      },
      missionImages,
      subsystemItems,
      vehicleTimeline,
      partnerLogos,
    };
  },

  async getPartners(locale = "en-US"): Promise<PartnerFields[]> {
    const partnerEntries = await getEntries({
      content_type: "partners",
      include: 2,
      order: ["fields.name"],
      locale,
    });

    return partnerEntries.map((entry) => {
      const statusEntry = entry.fields?.status as CtfEntry | undefined;
      const status: TierFields | undefined = statusEntry
        ? {
            name: String(statusEntry.fields?.name ?? ""),
            colorHex: statusEntry.fields?.colorHex
              ? String(statusEntry.fields.colorHex)
              : undefined,
            priority:
              typeof statusEntry.fields?.priority === "number"
                ? statusEntry.fields.priority
                : undefined,
            perks: Array.isArray(statusEntry.fields?.perks)
              ? (statusEntry.fields?.perks as unknown[]).map((item) =>
                  String(item),
                )
              : undefined,
          }
        : undefined;

      return {
        name: String(entry.fields?.name ?? ""),
        url: entry.fields?.url ? String(entry.fields.url) : undefined,
        image: getAssetUrl(entry.fields?.image, { width: 512 }),
        status,
      };
    });
  },

  async getNetworkingEventsBySlug(
    slug: string,
    locale = "en-US",
  ): Promise<(NetworkingFields & { descriptionHtml: string }) | null> {
    const entries = await getEntries({
      content_type: "networking",
      "fields.slug": slug,
      limit: 1,
      include: 2,
      locale,
    });

    const event = entries[0];
    if (!event) return null;

    const rawCompanies = Array.isArray(event.fields?.companies)
      ? (event.fields?.companies as CtfEntry[])
      : [];
    const companies: PartnerFields[] = rawCompanies.map((partner) => {
      const statusEntry = partner.fields?.status as CtfEntry | undefined;
      const status: TierFields | undefined = statusEntry
        ? {
            name: String(statusEntry.fields?.name ?? ""),
            colorHex: statusEntry.fields?.colorHex
              ? String(statusEntry.fields.colorHex)
              : undefined,
            priority:
              typeof statusEntry.fields?.priority === "number"
                ? statusEntry.fields.priority
                : undefined,
          }
        : undefined;

      return {
        name: String(partner.fields?.name ?? ""),
        url: partner.fields?.url ? String(partner.fields.url) : undefined,
        image: getAssetUrl(partner.fields?.image, { width: 512 }),
        status,
      };
    });

    const description = event.fields?.description as Document | undefined;
    const location = event.fields?.location as
      | { lat: number; lon: number }
      | undefined;

    return {
      name: String(event.fields?.name ?? ""),
      slug: String(event.fields?.slug ?? ""),
      description,
      descriptionHtml: toHtml(description),
      date: event.fields?.date ? String(event.fields.date) : undefined,
      location,
      companies,
    };
  },

  async getJobOpenings(locale = "en-US"): Promise<JobOpeningFields[]> {
    const entries = await getEntries({
      content_type: "jobOpening",
      include: 2,
      order: ["fields.title"],
      locale,
    });
    return entries.map((opening) => {
      const subgroup = opening.fields?.subgroup as CtfEntry | undefined;
      const imagesRaw = Array.isArray(opening.fields?.imagesCarousel)
        ? (opening.fields?.imagesCarousel as unknown[])
        : [];
      const imagesCarousel = imagesRaw
        .map((asset) =>
          getAssetUrl(asset, { width: 768, height: 384, fit: "fill" }),
        )
        .filter((value): value is string => Boolean(value));

      return {
        title: String(opening.fields?.title ?? ""),
        slug: String(opening.fields?.slug ?? ""),
        shortDescription: opening.fields?.shortDescription
          ? String(opening.fields.shortDescription)
          : undefined,
        fullDescription: opening.fields?.fullDescription as
          | Document
          | undefined,
        icon: getAssetUrl(opening.fields?.icon, {
          width: 144,
          height: 144,
          fit: "pad",
        }),
        imagesCarousel,
        formLink: opening.fields?.formLink
          ? String(opening.fields.formLink)
          : undefined,
        subgroup: subgroup
          ? {
              name: String(subgroup.fields?.name ?? ""),
              description: subgroup.fields?.description
                ? String(subgroup.fields.description)
                : undefined,
            }
          : undefined,
      };
    });
  },

  async getJobOpeningBySlug(
    slug: string,
    locale = "en-US",
  ): Promise<(JobOpeningFields & { fullDescriptionHtml: string }) | null> {
    const entries = await getEntries({
      content_type: "jobOpening",
      "fields.slug": slug,
      limit: 1,
      include: 2,
      locale,
    });

    const opening = entries[0];
    if (!opening) return null;

    const subgroup = opening.fields?.subgroup as CtfEntry | undefined;
    const imagesRaw = Array.isArray(opening.fields?.imagesCarousel)
      ? (opening.fields?.imagesCarousel as unknown[])
      : [];
    const imagesCarousel = imagesRaw
      .map((asset) =>
        getAssetUrl(asset, { width: 768, height: 384, fit: "fill" }),
      )
      .filter((value): value is string => Boolean(value));
    const fullDescription = opening.fields?.fullDescription as
      | Document
      | undefined;

    return {
      title: String(opening.fields?.title ?? ""),
      slug: String(opening.fields?.slug ?? ""),
      shortDescription: opening.fields?.shortDescription
        ? String(opening.fields.shortDescription)
        : undefined,
      fullDescription,
      fullDescriptionHtml: toHtml(fullDescription),
      icon: getAssetUrl(opening.fields?.icon, {
        width: 144,
        height: 144,
        fit: "pad",
      }),
      imagesCarousel,
      formLink: opening.fields?.formLink
        ? String(opening.fields.formLink)
        : undefined,
      subgroup: subgroup
        ? {
            name: String(subgroup.fields?.name ?? ""),
            description: subgroup.fields?.description
              ? String(subgroup.fields.description)
              : undefined,
          }
        : undefined,
    };
  },

  async getLatestDossier(locale = "en-US") {
    const entries = await getEntries({
      content_type: "dossier",
      order: ["-sys.createdAt"],
      limit: 1,
      locale,
    });
    const dossier = entries[0];
    if (!dossier) return null;

    return {
      file: getFileUrl(dossier.fields?.file),
    };
  },

  async getAllTiers(locale = "en-US") {
    const tierEntries = await getEntries({
      content_type: "tier",
      include: 1,
      order: ["fields.priority", "fields.name"],
      locale,
    });
    return tierEntries.map((entry) => ({
      name: String(entry.fields?.name ?? ""),
      colorHex: entry.fields?.colorHex
        ? String(entry.fields.colorHex)
        : undefined,
      priority:
        typeof entry.fields?.priority === "number"
          ? entry.fields.priority
          : undefined,
    }));
  },

  async getMembers(locale = "en-US"): Promise<MemberFields[]> {
    const entries = await getEntries({
      content_type: "member",
      include: 1,
      order: ["fields.name"],
      locale,
    });
    return entries.map((entry) => ({
      name: String(entry.fields?.name ?? ""),
      role: entry.fields?.role ? String(entry.fields.role) : undefined,
      image: getAssetUrl(entry.fields?.image, { width: 400 }),
      socials:
        (entry.fields?.socials as Record<string, unknown> | undefined) ?? {},
    }));
  },

  async getLatestGroupPhoto(locale = "en-US") {
    const entries = await getEntries({
      content_type: "groupPhoto",
      include: 1,
      order: ["-sys.createdAt"],
      limit: 1,
      locale,
    });
    const entry = entries[0];
    if (!entry) return undefined;
    return getAssetUrl(entry.fields?.image, { width: 1920 });
  },

  async getInvestigations(locale = "en-US"): Promise<InvestigationFields[]> {
    const entries = await getEntries({
      content_type: "investigation",
      include: 1,
      order: ["fields.title"],
      locale,
    });
    return entries.map((entry) => ({
      title: String(entry.fields?.title ?? ""),
      cover: getAssetUrl(entry.fields?.cover, {
        width: 760,
        height: 416,
        fit: "fill",
      }),
      document: getFileUrl(entry.fields?.document),
      description: entry.fields?.description
        ? String(entry.fields.description)
        : undefined,
    }));
  },
};
