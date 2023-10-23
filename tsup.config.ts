import { defineConfig, Options } from "tsup";

import pkg from "./package.json";

export default defineConfig((options: Options) => ({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  minify: false,
  external: [...Object.keys(pkg)],
  injectStyle: true,
  shims: false,
  ...options,
}));
