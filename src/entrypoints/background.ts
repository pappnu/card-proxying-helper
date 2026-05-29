import { browser, Browser, defineBackground } from "#imports";
import {
  getCardArtist,
  replaceAllIllegalFilenameCharacters,
} from "@/utils/cardData";
import { readClipboard, writeToClipboard } from "@/utils/clipboard";
import { createContextMenu } from "@/utils/contextMenu";
import { getScryfallCard } from "@/utils/scryfall";
import { cardNameTemplatesStorage } from "@/utils/storage";

interface CardDetails {
  name: string;
  artist: string;
  set: string;
  collectorNumber: string;
}

export default defineBackground(() => {
  const scryfallCardTabTitleRegex = /(.+) · .* \(([^)]+)\) #([^\s]+) ·/;
  const mtgpicsRefRegex = /([a-zA-Z0-9]{3}[a-zA-Z]*)0*([0-9]+)/;

  async function parseCardDetailsScryfall(
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

  async function parseMtgpicsCardDetails(
    tab: Browser.tabs.Tab,
    url: URL,
  ): Promise<CardDetails> {
    const ref = url.searchParams.get("ref");
    if (!ref)
      throw new Error(
        `MTGPics url doesn't contain ref search param: ${tab.url}`,
      );
    const match = mtgpicsRefRegex.exec(ref);
    if (match) {
      const scryfallCard = await getScryfallCard(match[1], match[2]);
      if (scryfallCard.ok) {
        return {
          name: scryfallCard.data.name,
          artist: scryfallCard.data.artist,
          set: scryfallCard.data.set,
          collectorNumber: scryfallCard.data.collector_number,
        };
      } else {
        throw new Error(
          `Failed to fetch Scryfall card for MTGPics url: ${tab.url}`,
        );
      }
    } else {
      throw new Error(
        `MTGPics ref doesn't conform to expected form: ${tab.url}`,
      );
    }
  }

  async function parseCardDetails(
    tab: Browser.tabs.Tab,
    url: URL,
    getArtist: boolean = false,
  ): Promise<CardDetails> {
    if (url.host.includes("scryfall.com")) {
      return await parseCardDetailsScryfall(tab, getArtist);
    } else {
      return await parseMtgpicsCardDetails(tab, url);
    }
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
    if (tab.id !== undefined && tab.url) {
      let card: CardDetails;

      const tabUrl = new URL(tab.url);
      card = await parseCardDetails(tab, tabUrl, getArtist);

      const namePart = includeName ? card.name + " " : "";
      const artistPart = includeArtist ? `(${card.artist || artist}) ` : "";
      await writeToClipboard(
        tab.id,
        `${namePart}${artistPart}[${card.set}] {${card.collectorNumber}}`,
      );
    }
  }

  async function copyCardNameTemplate(
    template: string,
    tab: Browser.tabs.Tab,
    {
      artist = "",
      getArtist = false,
    }: { artist?: string; getArtist?: boolean } = {},
  ) {
    if (tab.url && tab.id !== undefined) {
      if (template) {
        const card = await parseCardDetails(tab, new URL(tab.url), getArtist);
        let formattedStr = template
          .replace("{{name}}", card.name)
          .replace("{{artist}}", card.artist || artist)
          .replace("{{set}}", card.set)
          .replace("{{collectorNumber}}", card.collectorNumber);
        if (template.includes("{{clipboard}}")) {
          formattedStr = formattedStr.replace(
            "{{clipboard}}",
            await readClipboard(tab.id),
          );
        }
        await writeToClipboard(tab.id, formattedStr);
      }
    }
  }

  const documentUrlPatterns = [
    "https://scryfall.com/card/*",
    "https://*.mtgpics.com/*?ref=*",
    "https://*.mtgpics.com/*?gamerid=*",
    "https://*.magic-ville.com/*?ref=*",
  ];

  browser.contextMenus.removeAll().then(() => {
    const copySet = createContextMenu({
      title: "[set] {number}",
      contexts: ["all"],
      documentUrlPatterns,
    });
    const copyBlankArtistAndSet = createContextMenu({
      title: "() [set] {number}",
      contexts: ["all"],
      documentUrlPatterns,
    });
    const copyFullNameId = createContextMenu({
      title: "name (artist) [set] {number}",
      contexts: ["all"],
      documentUrlPatterns,
    });
    const copyFullNameNoArtistId = createContextMenu({
      title: "name () [set] {number}",
      contexts: ["all"],
      documentUrlPatterns,
    });
    const copyFullNameInjectArtistId = createContextMenu({
      title: "name (clipboard) [set] {number}",
      contexts: ["all"],
      documentUrlPatterns,
    });

    browser.contextMenus.onClicked.addListener(async (info, tab) => {
      if (tab)
        switch (info.menuItemId) {
          case copySet:
            await copyCardName(tab, {
              includeArtist: false,
              includeName: false,
            });
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

    const cardNameTemplateContextMenuIds: (string | number)[] = [];
    let cardNameTemplateContextMenusListener:
      | ((
          info: Browser.contextMenus.OnClickData,
          tab?: Browser.tabs.Tab,
        ) => void)
      | undefined = undefined;

    function createCardNameTemplateContextMenus(cardNameTemplates: unknown[]) {
      // Clean up old template context menus
      for (const id of cardNameTemplateContextMenuIds.splice(0)) {
        browser.contextMenus.remove(id);
      }
      if (cardNameTemplateContextMenusListener)
        browser.contextMenus.onClicked.removeListener(
          cardNameTemplateContextMenusListener,
        );

      const newIds: (string | number)[] = [];
      const actions: ((tab: Browser.tabs.Tab) => Promise<unknown>)[] = [];
      for (const template of cardNameTemplates) {
        if (typeof template === "string" && template) {
          newIds.push(
            createContextMenu({
              title: template,
              contexts: ["all"],
              documentUrlPatterns,
            }),
          );
          actions.push(async (tab) => {
            await copyCardNameTemplate(template, tab, { getArtist: true });
          });
        }
      }

      cardNameTemplateContextMenusListener = async (
        info: Browser.contextMenus.OnClickData,
        tab?: Browser.tabs.Tab,
      ) => {
        if (tab) {
          const idIdx = newIds.indexOf(info.menuItemId);
          for (let index = 0; index < newIds.length; index++) {
            const id = newIds[index];
            if (id === info.menuItemId) {
              await actions[index](tab);
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

    cardNameTemplatesStorage
      .getValue()
      .then(createCardNameTemplateContextMenus);

    browser.runtime.onMessage.addListener((message: unknown) => {
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
});
