import { defineContentScript } from "#imports";

export default defineContentScript({
  matches: ["https://scryfall.com/card/*"],
  async main() {
    return await navigator.clipboard.readText();
  },
});
