import { browser } from "#imports";

const filenameCharacterReplacements: Record<string, string> = {
  "<": "＜",
  ">": "＞",
  ":": "：",
  '"': "＂",
  "/": "／",
  "\\": "＼",
  "|": "￨",
  "?": "？",
  "*": "＊",
};

export function replaceAllIllegalFilenameCharacters(value: string): string {
  for (const illegalCharacter in filenameCharacterReplacements) {
    value = value.replaceAll(
      illegalCharacter,
      filenameCharacterReplacements[illegalCharacter],
    );
  }
  return value;
}

export async function getCardArtist(tabId: number): Promise<string> {
  return replaceAllIllegalFilenameCharacters(
    (
      await browser.scripting.executeScript<unknown[], string>({
        files: ["getCardArtist.js"],
        target: { tabId },
      })
    )[0].result ?? "",
  );
}
