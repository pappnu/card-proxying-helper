import { z, ZodType } from "zod";
import { FetchResult, tryFetch } from "./fetch";

const scryfallRoot = "https://api.scryfall.com";

export interface ScryfallCard {
  lang: string;
  name: string;
  artist: string;
  set: string;
  collector_number: string;
}

export const scryfallCardValidator = z.object({
  lang: z.string(),
  name: z.string(),
  artist: z.string(),
  set: z.string(),
  collector_number: z.string(),
}) satisfies ZodType<ScryfallCard>;

export async function getScryfallCard(
  set: string,
  collectorNumber: string,
): Promise<FetchResult<ScryfallCard>> {
  return await tryFetch(
    `${scryfallRoot}/cards/${set}/${collectorNumber}`,
    {
      method: "GET",
    },
    { validator: scryfallCardValidator },
  );
}
