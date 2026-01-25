import { browser, Browser } from "#imports";

let ctxMenuCounter = Number.MIN_SAFE_INTEGER;

export function createContextMenu(
  properties: Exclude<Browser.contextMenus.CreateProperties, "id">,
  idPrefix: string = ""
): string {
  const id = idPrefix + (ctxMenuCounter++).toString();
  browser.contextMenus.create({ ...properties, id });
  return id;
}
