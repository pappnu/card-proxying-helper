import { browser, Browser } from "#imports";

export interface WriteToClipboardArgs {
  content: string;
}

export async function writeToClipboard(tabId: number, content: string) {
  const script = "writeToClipboard";
  const listener = (
    message: { script: string },
    sender: Browser.runtime.MessageSender,
    sendResponse: (details: WriteToClipboardArgs) => void,
  ) => {
    if (sender?.tab?.id === tabId && message?.script === script) {
      sendResponse({ content });
      browser.runtime.onMessage.removeListener(listener);
    }
  };
  browser.runtime.onMessage.addListener(listener);
  return await browser.scripting.executeScript({
    files: [`${script}.js`],
    target: { tabId },
  });
}

export async function readClipboard(tabId: number): Promise<string> {
  return (
    (
      await browser.scripting.executeScript<unknown[], string>({
        files: ["readClipboard.js"],
        target: { tabId },
      })
    )[0].result ?? ""
  );
}
