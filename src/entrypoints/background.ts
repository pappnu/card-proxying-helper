import { browser, Browser, defineBackground } from "#imports";
import {
  getCardArtist,
  replaceAllIllegalFilenameCharacters,
} from "@/utils/cardData";
import { readClipboard, writeToClipboard } from "@/utils/clipboard";
import { createContextMenu } from "@/utils/contextMenu";
import { cardNameTemplatesStorage } from "@/utils/storage";

interface CardDetails {
  name: string;
  artist: string;
  set: string;
  collectorNumber: string;
}

export default defineBackground(() => {
  const scryfallCardTabTitleRegex = /(.+) · .* \(([^)]+)\) #([^\s]+) ·/;
  async function parseCardDetails(
    tab: Browser.tabs.Tab,
    getArtist: boolean = false,
  ): Promise<CardDetails> {
    if (tab.title) {
      const match = scryfallCardTabTitleRegex.exec(tab.title);
      if (match) {
        return {
          name: replaceAllIllegalFilenameCharacters(match[1]),
          artist:
            getArtist && tab.id !== undefined
              ? await getCardArtist(tab.id)
              : "",
          set: match[2],
          collectorNumber: match[3],
        };
      }
    }
    throw Error("Tab has no title");
  }

  async function copyCardName(
    tab: Browser.tabs.Tab,
    {
      includeName = true,
      includeArtist = true,
      artist = "",
      getArtist = false,
    }: {
      includeName?: boolean;
      includeArtist?: boolean;
      artist?: string;
      getArtist?: boolean;
    } = {},
  ) {
    if (tab.id !== undefined) {
      const card = await parseCardDetails(tab, getArtist);
      const namePart = includeName ? card.name + " " : "";
      const artistPart = includeArtist ? `(${card.artist || artist}) ` : "";
      await writeToClipboard(
        tab.id,
        `${namePart}${artistPart}[${card.set}] {${card.collectorNumber}}`,
      );
    }
  }

  async function formatCardName(
    template: string,
    tab: Browser.tabs.Tab,
    {
      artist = "",
      getArtist = false,
    }: { artist?: string; getArtist?: boolean } = {},
  ) {
    if (tab.id !== undefined) {
      if (template) {
        const card = await parseCardDetails(tab, getArtist);
        await writeToClipboard(
          tab.id,
          template
            .replace("{{name}}", card.name)
            .replace("{{artist}}", card.artist || artist)
            .replace("{{set}}", card.set)
            .replace("{{collectorNumber}}", card.collectorNumber),
        );
      }
    }
  }

  const documentUrlPatterns = ["https://scryfall.com/card/*"];

  const copySet = createContextMenu({
    title: "[set] {number}",
    contexts: ["page"],
    documentUrlPatterns,
  });
  const copyBlankArtistAndSet = createContextMenu({
    title: "() [set] {number}",
    contexts: ["page"],
    documentUrlPatterns,
  });
  const copyFullNameId = createContextMenu({
    title: "name (artist) [set] {number}",
    contexts: ["page"],
    documentUrlPatterns,
  });
  const copyFullNameNoArtistId = createContextMenu({
    title: "name () [set] {number}",
    contexts: ["page"],
    documentUrlPatterns,
  });
  const copyFullNameInjectArtistId = createContextMenu({
    title: "name (clipboard) [set] {number}",
    contexts: ["page"],
    documentUrlPatterns,
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (tab)
      switch (info.menuItemId) {
        case copySet:
          await copyCardName(tab, { includeArtist: false, includeName: false });
          break;
        case copyBlankArtistAndSet:
          await copyCardName(tab, { includeName: false });
          break;
        case copyFullNameId:
          await copyCardName(tab, { getArtist: true });
          break;
        case copyFullNameNoArtistId:
          await copyCardName(tab);
          break;
        case copyFullNameInjectArtistId:
          if (tab.id !== undefined)
            copyCardName(tab, { artist: await readClipboard(tab.id) });
          break;

        default:
          break;
      }
  });

  const cardNameTemplateContextMenuIds: string[] = [];
  let cardNameTemplateContextMenusListener:
    | ((info: Browser.contextMenus.OnClickData, tab?: Browser.tabs.Tab) => void)
    | undefined = undefined;

  function createCardNameTemplateContextMenus(cardNameTemplates: unknown[]) {
    // Cleanup old template context menus
    for (const id of cardNameTemplateContextMenuIds.splice(0)) {
      browser.contextMenus.remove(id);
    }
    if (cardNameTemplateContextMenusListener)
      browser.contextMenus.onClicked.removeListener(
        cardNameTemplateContextMenusListener,
      );

    const newIds: string[] = [];
    const actions: ((tab: Browser.tabs.Tab) => Promise<unknown>)[] = [];
    for (const template of cardNameTemplates) {
      if (typeof template === "string" && template) {
        newIds.push(
          createContextMenu({
            title: template,
            contexts: ["page"],
            documentUrlPatterns,
          }),
        );
        actions.push((tab) =>
          formatCardName(template, tab, { getArtist: true }),
        );
        if (template.includes("{{artist}}")) {
          newIds.push(
            createContextMenu({
              title: template.replace("{{artist}}", "{{clipboard}}"),
              contexts: ["page"],
              documentUrlPatterns,
            }),
          );
          actions.push(
            async (tab) =>
              tab.id !== undefined &&
              formatCardName(template, tab, {
                artist: await readClipboard(tab.id),
              }),
          );
        }
      }
    }

    cardNameTemplateContextMenusListener = async (
      info: Browser.contextMenus.OnClickData,
      tab?: Browser.tabs.Tab,
    ) => {
      if (tab) {
        for (let index = 0; index < newIds.length; index++) {
          const id = newIds[index];
          if (id === info.menuItemId) {
            actions[index](tab);
            break;
          }
        }
      }
    };
    browser.contextMenus.onClicked.addListener(
      cardNameTemplateContextMenusListener,
    );

    cardNameTemplateContextMenuIds.push(...newIds);
  }

  cardNameTemplatesStorage.getValue().then(createCardNameTemplateContextMenus);

  browser.runtime.onMessage.addListener(async (message: unknown) => {
    if (
      message &&
      typeof message === "object" &&
      "purpose" in message &&
      message.purpose === "cardNameTemplates" &&
      "templates" in message &&
      Array.isArray(message.templates)
    ) {
      createCardNameTemplateContextMenus(message.templates);
    }
  });
});
