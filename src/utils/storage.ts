import { storage } from "#imports";

export const cardNameTemplatesStorage = storage.defineItem<string[]>(
  "local:cardNameTemplate",
  { fallback: [] }
);
