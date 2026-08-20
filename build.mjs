import { execSync } from "child_process";
import { readFileSync } from "fs";
import * as esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_DIR = path.resolve(__dirname, 'src')

// Generate version from package.json semver + git hash
const hash = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
const H2C_VERSION = `v${pkg.version}+${hash}`;
console.log(`✓ version ${H2C_VERSION}`);

// Build h2c CLI (dist/h2c.mjs)
await esbuild.build({
  entryPoints: [path.join(SRC_DIR, 'hermes_to_claude', 'cli.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/h2c.mjs',
  external: ['zod', 'chalk', 'axios', '@anthropic-ai/sdk', 'qrcode', 'lodash-es', 'get-east-asian-width'],
  define: {
    'globalThis.H2C_VERSION': JSON.stringify(H2C_VERSION),
  },
});

// Build statusline — pure Node.js, no external deps
await esbuild.build({
  entryPoints: [path.join(SRC_DIR, 'hermes_to_claude', 'statusline.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/statusline.mjs',
});
