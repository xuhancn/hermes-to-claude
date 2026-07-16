import * as esbuild from "esbuild";

// Build hbridge CLI
await esbuild.build({
  entryPoints: ["src/hbridge/cli.mjs"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/hbridge.mjs",
  external: ["zod", "chalk", "axios", "@anthropic-ai/sdk", "qrcode", "lodash-es", "get-east-asian-width"],
});

// Build original bridge
await esbuild.build({
  entryPoints: ["src/bridgeMain.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/bridge.mjs",
  external: ["zod", "chalk", "axios", "@anthropic-ai/sdk", "qrcode", "lodash-es", "get-east-asian-width"],
  plugins: [{
    name: "resolve-deps",
    setup(build) {
      build.onResolve({ filter: /^(bun:bundle|\.\.\/)/ }, args => {
        return { path: args.path, external: true };
      });
    },
  }],
});

console.log("Build done: dist/hbridge.mjs + dist/bridge.mjs");
