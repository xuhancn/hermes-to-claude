import * as esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_DIR = path.resolve(__dirname, 'src')

// Build hbridge CLI
await esbuild.build({
  entryPoints: [path.join(SRC_DIR, 'hbridge', 'cli.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/hbridge.mjs',
  external: ['zod', 'chalk', 'axios', '@anthropic-ai/sdk', 'qrcode', 'lodash-es', 'get-east-asian-width'],
});

// Build statusline — pure Node.js, no external deps
await esbuild.build({
  entryPoints: [path.join(SRC_DIR, 'hbridge', 'statusline.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/statusline.mjs',
});
