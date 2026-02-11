import { browser, defineContentScript } from "#imports";
import { WriteToClipboardArgs } from "@/utils/clipboard";

export default defineContentScript({
  matches: ["https://scryfall.com/card/*"],
  async main() {
    const { content }: WriteToClipboardArgs = await browser.runtime.sendMessage(
      undefined,
      {
        script: "writeToClipboard",
      },
    );
    await navigator.clipboard.writeText(content);
  },
});
