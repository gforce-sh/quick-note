import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  platform: "node",
  async onSuccess() {
    const path = "dist/index.js";
    writeFileSync(
      path,
      readFileSync(path, "utf8").replace(/from "sqlite"/g, 'from "node:sqlite"'),
    );
  },
});
