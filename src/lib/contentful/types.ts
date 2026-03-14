import type { Document } from "@contentful/rich-text-types";

export interface TierFields {
  name: string;
  colorHex?: string;
  priority?: number;
}

export interface PartnerFields {
  name: string;
  url?: string;
  image?: string;
  status?: TierFields;
}

export interface NetworkingFields {
  name: string;
  slug: string;
  description?: Document;
  date?: string;
  location?: { lat: number; lon: number };
  companies: PartnerFields[];
}

export interface MemberFields {
  name: string;
  role?: string;
  image?: string;
  socials?: Record<string, unknown>;
}

export interface SubsystemFields {
  name: string;
  description?: string;
  groupImage?: string;
  groupFunImage?: string;
  color?: string;
  icon?: string;
  members: MemberFields[];
}

export interface SubgroupFields {
  name: string;
  description?: string;
}

export interface JobOpeningFields {
  title: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: Document;
  icon?: string;
  imagesCarousel?: string[];
  formLink?: string;
  subgroup?: SubgroupFields;
}

export interface GalleryFields {
  image: string;
}

export interface InvestigationFields {
  title: string;
  cover?: string;
  document?: string;
  description?: string;
}

export interface VehicleFields {
  name: string;
  codename: string;
  date: string;
  description?: string;
  image?: string;
  accolades?: string[];
}

export interface HomePageContent {
  missionImages: string[];
  subsystemItems: {
    label: string;
    href: string;
    icon?: string;
    description?: string;
    image?: string;
    funImage?: string;
  }[];
  vehicleTimeline: {
    code: string;
    years: string;
    vehicleName: string;
    description: string;
    accolades: string[];
    image: string;
  }[];
  partnerLogos: string[];
}
