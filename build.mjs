import { execSync } from "child_process";
import * as esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_DIR = path.resolve(__dirname, 'src')

// Generate version from git
const count = execSync("git rev-list --count HEAD", { encoding: "utf8" }).trim();
const hash = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
const HBRIDGE_VERSION = `v${count}.0.${hash}`;
console.log(`✓ version ${HBRIDGE_VERSION}`);

// Build hbridge CLI
await esbuild.build({
  entryPoints: [path.join(SRC_DIR, 'hbridge', 'cli.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/hbridge.mjs',
  external: ['zod', 'chalk', 'axios', '@anthropic-ai/sdk', 'qrcode', 'lodash-es', 'get-east-asian-width'],
  define: {
    'globalThis.HBRIDGE_VERSION': JSON.stringify(HBRIDGE_VERSION),
  },
});

// Build statusline — pure Node.js, no external deps
await esbuild.build({
  entryPoints: [path.join(SRC_DIR, 'hbridge', 'statusline.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/statusline.mjs',
});
