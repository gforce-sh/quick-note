import { defineConfig } from "tsup";
import type { Plugin } from "esbuild";

const preserveNodeProtocol: Plugin = {
  name: "preserve-node-protocol",
  setup(build) {
    build.onResolve({ filter: /^node:/ }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
};

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  platform: "node",
  esbuildPlugins: [preserveNodeProtocol],
});
