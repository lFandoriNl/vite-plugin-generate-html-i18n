import { defineConfig } from "vite";
import { createMpaPlugin, createPages } from "vite-plugin-virtual-mpa";

import { viteGenerateHtmlI18n } from "../src/vite-plugin-generate-html-i18n";

const enTranslations = {
  hello: "Hello",
  keyWithIcon: "With icon - {icon}",
};

const frTranslations = {
  hello: "Bonjour",
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    createMpaPlugin({
      pages: createPages({
        name: "index",
        template: "index.html",
        data: {
          trans: enTranslations,
        },
      }),
    }),
    viteGenerateHtmlI18n({
      glob: (outputPath) => `${outputPath}/*.html`,
      translations: {
        en: enTranslations,
        fr: frTranslations,
      },
      selector: "[data-i18n]",
      getTranslationKey: (element) => element.getAttribute("data-i18n"),
      formatTranslation(value) {
        return value || "";
      },
      modifyElement(element, value, { key }) {
        element.innerHTML = element.innerHTML.replace("{icon}", "<i>icon</i>");
      },
    }),
  ],
});
