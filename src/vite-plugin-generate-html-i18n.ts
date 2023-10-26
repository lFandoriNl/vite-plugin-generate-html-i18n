import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

import { globSync } from "glob";

import { JSDOM } from "jsdom";

import type { Plugin } from "vite";

type TranslationKey = string;
type HTMLString = string;

export type ViteGenerateHtmlI18nOptions = {
  /** The glob pattern for selecting HTML files.
   * @param {string} outputPath - this is the path to your outDir folder
   * @default (outputPath) => `${outputPath}/*.html`
   */
  glob?: (outputPath: string) => string | string[];

  /** The translations for different languages.
   * @example
   * translations: {
   *   en: {
   *     hello: "Hello",
   *   },
   *   fr: {
   *     hello: "Bonjour",
   *   }
   * }
   */
  translations: {
    [language: string]: Record<TranslationKey, string>;
  };

  /** The selector for the dom elements to be translated. Will be pass to the document.querySelectorAll(selector) */
  selector: string;

  /** The function to get the translation key from an element.
   * @example
   * // If you have an HTML element structure like this
   * <p data-i18n="key">text</p>
   *
   * // Your function should look like this
   * getTranslationKey: (element) => element.getAttribute("data-i18n")
   */
  getTranslationKey: (element: Element) => TranslationKey | null;

  /** The function to format the translation.
   * @param {string} value - the translation value
   * @param {object} meta - the meta object for the translation, including the translationKey, language, and translations object
   * @default
   * (value) => {
   *    return value || "";
   * }
   */
  formatTranslation?: (
    value: string,
    meta: {
      key: TranslationKey;
      language: string;
      translations: Record<TranslationKey, string>;
    }
  ) => HTMLString;

  /** The function to modify the translated element, modifyElement is called after formatTranslation
   * @param {Element} element - the element to be modified
   * @param {string} value - the translation value
   * @param {object} meta - the meta object for the translation, including the translationKey, language, and translations object
   * @example
   * // If you have an HTML element structure like this
   * <p data-i18n="key">text</p>
   *
   * // This function will wrap the translated text in a span element
   * modifyElement: (element, value, meta) => {
   *   element.innerHTML = `<span>${element.textContent}</span>`;
   * }
   *
   * // The resulting HTML will be
   * <p data-i18n="key"><span>text</span></p>
   */
  modifyElement?: (
    element: Element,
    value: string,
    meta: {
      key: TranslationKey;
      language: string;
      translations: Record<TranslationKey, string>;
    }
  ) => void;

  /**
   * The function to modify the document before the translation is applied, modifyDocumentBefore is called before formatTranslation
   * @param document - the document
   * @param meta - the meta object for the translation, including the language and translations object
   * @example
   * // Can be used to replace the lang attribute in html
   * modifyDocumentBefore(document, { language }) {
   *   document.documentElement.setAttribute("lang", language);
   * }
   */
  modifyDocumentBefore?: (
    document: Document,
    meta: {
      language: string;
      translations: Record<TranslationKey, string>;
    }
  ) => void;

  /**
   * The function to modify the document after the translation is applied, modifyDocumentAfter is called after formatTranslation
   * @param document - the document
   * @param meta - the meta object for the translation, including the language and translations object
   * @example
   * // Can be used to replace the lang attribute in html
   * modifyDocumentAfter(document, { language }) {
   *   document.documentElement.setAttribute("lang", language);
   * }
   */
  modifyDocumentAfter?: (
    document: Document,
    meta: {
      language: string;
      translations: Record<TranslationKey, string>;
    }
  ) => void;

  /** Whether to log verbose messages.
   * @default true
   */
  verbose?: boolean;

  /** The filter function for verbose messages of missing translations.
   * @param {string} key - the key of the translation
   * @param {string} language - the language of the translation
   * @param {Record<string, string>} translations - the all translations of the language
   *
   * @example
   * // skip warning about missing translations for "en" language
   * missingTranslationVerboseFilter: (key, language, translations) => {
   *   return language !== "en"
   * }
   */
  missingTranslationVerboseFilter?: (
    key: TranslationKey,
    language: string,
    translations: Record<TranslationKey, string>
  ) => boolean;
};

const colors = {
  reset(message: string) {
    return "\x1b[0m" + message;
  },
  cyan(message: string) {
    return "\x1b[36m" + message;
  },
  green(message: string) {
    return "\x1b[32m" + message;
  },
  yellow(message: string) {
    return "\x1b[33m" + message;
  },
  gray(message: string) {
    return "\x1b[90m" + message;
  },
};

const logPluginPrefix = `${colors.reset("[")}${colors.cyan(
  "vite-plugin-generate-html-i18n"
)}${colors.reset("]")}`;

export function viteGenerateHtmlI18n(
  options: ViteGenerateHtmlI18nOptions
): Plugin {
  const {
    glob,
    translations,
    selector,
    getTranslationKey,
    modifyElement,
    formatTranslation,
    modifyDocumentBefore,
    modifyDocumentAfter,
    verbose = true,
    missingTranslationVerboseFilter = () => true,
  } = options;

  const languages = Object.keys(translations);

  let outputPath = "";
  let outDir = "";

  return {
    name: "generate-html-i18n-pages",
    apply: "build",
    enforce: "post",
    configResolved(resolvedConfig) {
      outDir = resolvedConfig.build.outDir;
      outputPath = path.isAbsolute(resolvedConfig.build.outDir)
        ? resolvedConfig.build.outDir
        : path.join(resolvedConfig.root, resolvedConfig.build.outDir);
    },
    closeBundle() {
      const pattern = glob ? glob(outputPath) : `${outputPath}/*.html`;

      const htmlFilePaths = globSync(pattern);

      if (htmlFilePaths.length === 0) {
        console.log(
          logPluginPrefix,
          "HTML files not found by",
          pattern,
          "pattern"
        );
        return;
      }

      console.log(logPluginPrefix, "Result of scanning HTML files to generate");

      htmlFilePaths.forEach((filePath) =>
        console.log(
          `${colors.gray(outDir + "/")}${colors.green(
            filePath.replace(outputPath, "").slice(1)
          )}`
        )
      );

      const htmlResultFilePaths: string[] = [];

      languages.forEach((lang) => {
        const updatedHtmlFiles = htmlFilePaths.map((filePath) => {
          const html = readFileSync(filePath, "utf-8");

          const jsdom = new JSDOM(html);

          const { document } = jsdom.window;

          if (modifyDocumentBefore) {
            modifyDocumentBefore(document, {
              language: lang,
              translations: translations[lang],
            });
          }

          const elements = document.querySelectorAll(selector);

          elements.forEach((element) => {
            const key = getTranslationKey(element);

            if (key) {
              if (!translations[lang][key]) {
                if (verbose) {
                  const needLog = missingTranslationVerboseFilter(
                    key,
                    lang,
                    translations[lang]
                  );

                  if (needLog) {
                    console.warn(
                      colors.yellow(`Translation not found: ${lang}.${key}`)
                    );
                  }
                }
              }

              if (formatTranslation) {
                element.innerHTML = formatTranslation(translations[lang][key], {
                  key,
                  language: lang,
                  translations: translations[lang],
                });
              } else {
                element.innerHTML = translations[lang][key] || "";
              }

              if (modifyElement) {
                modifyElement(element, translations[lang][key], {
                  key,
                  language: lang,
                  translations: translations[lang],
                });
              }
            }
          });

          if (modifyDocumentAfter) {
            modifyDocumentAfter(document, {
              language: lang,
              translations: translations[lang],
            });
          }

          return {
            filePath,
            html: jsdom.serialize(),
          };
        });

        updatedHtmlFiles.forEach(({ filePath, html }) => {
          const languagePath = path.join(path.dirname(filePath), lang);

          mkdirSync(languagePath, {
            recursive: true,
          });

          const pagePath = path.join(languagePath, path.basename(filePath));

          writeFileSync(pagePath, html, "utf-8");

          htmlResultFilePaths.push(pagePath);
        });
      });

      console.log(logPluginPrefix, `Generated html files`);

      htmlResultFilePaths.forEach((filePath) => {
        console.log(
          `${colors.gray(outDir + "/")}${colors.green(
            filePath.replace(outputPath, "").slice(1)
          )}`
        );
      });
    },
  };
}
