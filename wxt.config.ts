import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  // Disable auto-imports
  imports: false,
  manifest: {
    permissions: [
      "activeTab",
      "contextMenus",
      "clipboardRead",
      "clipboardWrite",
      "scripting",
      "storage",
    ],
    icons: {
      16: "/extension-icon.svg",
      24: "/extension-icon.svg",
      48: "/extension-icon.svg",
      96: "/extension-icon.svg",
      128: "/extension-icon.svg",
    },
    browser_specific_settings: {
      gecko: {
        id: "@card-proxying-helper",
      },
    },
  },
});
