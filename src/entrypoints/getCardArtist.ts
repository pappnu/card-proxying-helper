import { defineContentScript } from "#imports";

export default defineContentScript({
  matches: ["https://scryfall.com/card/*"],
  main() {
    const artistElement = document.querySelector(".card-text-artist>a");
    return artistElement?.textContent || "";
  },
});
