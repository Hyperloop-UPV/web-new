import { createClient, type ContentfulClientApi } from "contentful";

const requireEnv = (
  key: "CONTENTFUL_SPACE_ID" | "CONTENTFUL_DELIVERY_TOKEN",
) => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const space = requireEnv("CONTENTFUL_SPACE_ID");
const accessToken = requireEnv("CONTENTFUL_DELIVERY_TOKEN");

export const contentfulClient: ContentfulClientApi<undefined> = createClient({
  space,
  accessToken,
});

export const contentfulConfig = {
  space,
  accessToken,
};
