import * as esbuild from 'esbuild';
await esbuild.build({
  entryPoints: ['src/bridgeMain.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/bridge.mjs',
  external: ['zod'],
});
