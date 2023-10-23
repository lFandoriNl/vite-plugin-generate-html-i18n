# vite-plugin-generate-html-i18n

This is a vite plugin that allows you to generate HTML page by page in localized folders when building, for example:

For example, you have html files with a statically specified language via ejs templates and your html looks something like this:

```html
<div data-i18n="hello"><%- trans["hello"] -%></div>
```

As a result of the build, we would get the translated version:

```html
<div data-i18n="hello">Hello</div>
```

Using this plugin, we will get several versions of our html, divided into separate folders by language.

```html
// en
<div data-i18n="hello">Hello</div>

// fr
<div data-i18n="hello">Bonjour</div>
```

Before:

```
/dist
  index.html
  contact.html
```

After:

```
/dist
  index.html
  contact.html
  en/
    index.html
    contact.html
  [language]/
    index.html
    contact.html
```

And using the [jsdom](https://www.npmjs.com/package/jsdom) api you can change your element template as you like.

## Installation

You can add it as a dev dependency to any of the package managers (NPM, Yarn, PNPM)

npm

```
npm install vite-plugin-generate-html-i18n --save-dev
```

pnpm

```
pnpm add -D vite-plugin-generate-html-i18n
```

yarn

```
yarn add -D vite-plugin-generate-html-i18n
```

## Usage

```ts
import { defineConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-generate-html-i18n";

export default defineConfig(() => {
  return {
    plugins: [
      viteGenerateHtmlI18n({
        /* pass your config */
      }),
      // plugins that process html output should come after viteGenerateHtmlI18n,
      // for example compression plugins such as viteCompression
    ],
  };
});
```

## Example

You can see an example setup on [Github](https://github.com/lFandoriNl/vite-plugin-generate-html-i18n/blob/master/example/vite.config.ts)

## Plugin Options

- **[`glob`](#glob)**
- **[`translations`](#translations)**
- **[`selector`](#selector)**
- **[`getTranslationKey`](#gettranslationkey)**
- **[`formatTranslation`](#formattranslation)**
- **[`modifyElement`](#modifyelement)**
- **[`verbose`](#verbose)**
- **[`missingTranslationVerboseFilter`](#missingtranslationverbosefilter)**

### `glob`

Type: `(outputPath: string) => string | string[]`

Default: `(outputPath) => outputPath + "/*.html"`

The glob pattern for selecting HTML files.

`outputPath` - this is the path to your outDir folder

### `translations`

Type:

```ts
{
  [language: string]: Record<TranslationKey string>;
}
```

The translations for different languages.

```ts
translations: {
  en: {
    hello: "Hello",
  },
  fr: {
    hello: "Bonjour",
  }
}
```

### `selector`

Type: `string`

The selector for the dom elements to be translated. Will be pass to the `document.querySelectorAll(selector)`

For example, if your elements have i18n-key stored in the date attribute like this:

```html
<p data-i18n="key">text</p>
```

You can write a selector like this, which is equivalent to `document.querySelectorAll("[data-i18n]")`

```ts
selector: "[data-i18n]";
```

### `getTranslationKey`

Type: `(element: Element) => string | null`

The function to get the translation key from an element.

If you have an HTML element structure like this

```html
<p data-i18n="key">text</p>
```

Your function should look like this

```ts
getTranslationKey: (element) => element.getAttribute("data-i18n");
```

That is, your method of storing a translation key in an element can be anything, even a data-attribute or anything else, all you need is to get this key.

### `formatTranslation`

Type:

```ts
(
  value: string, // translation value
  meta: {
    key: TranslationKey;
    language: string;
    translations: Record<TranslationKey, string>;
  }
) => HTMLString;
```

Default:

```ts
(value) => {
  return value || "";
};
```

The function to format the translation. The result of this function will be written to the innerHTML of the element

### `modifyElement`

Type:

```ts
(
  element: Element,
  value: string, // translation value
  meta: {
    key: TranslationKey;
    language: string;
    translations: Record<TranslationKey, string>;
  }
) => void;
```

The function to modify the translated element, modifyElement is called after formatTranslation.

With this function you can modify your element, add attributes, classes, styles, etc.

### `verbose`

Type: `boolean`

Default: `true`

Whether to log verbose messages.

### `missingTranslationVerboseFilter`

Type:

```ts
(
  key: TranslationKey,
  language: string,
  translations: Record<TranslationKey, string>
) => boolean;
```

The filter function for verbose messages of missing translations.

For example, you want to ignore the warning that there is no translation for the language "en".

```ts
missingTranslationVerboseFilter: (key, language, translations) => {
  return language !== "en";
};
```
