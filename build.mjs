import * as esbuild from 'esbuild'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_DIR = path.resolve(__dirname, 'src')
const SUBMODULE = path.resolve(__dirname, 'original-claude-code', 'src')
const DEPS = path.resolve(__dirname, 'claude-code-deps')

/**
 * Resolve an import path coming from a file in src/.
 * For `../` imports, map them to claude-code-deps/ first, then submodule.
 * For `src/` prefixed imports, map to submodule.
 */
function resolveSrcImport(resolvedPath, srcRelative) {
  // Strip leading ../ to get the path relative to repo root
  const parts = srcRelative.split(path.sep).filter(p => p !== '..')
  if (parts.length === 0) return null
  const relPath = parts.join(path.sep)

  // Try claude-code-deps first
  const depsPath = path.resolve(DEPS, relPath)
  if (fs.existsSync(depsPath)) return depsPath
  const depsTs = depsPath.replace(/\.js$/, '.ts')
  if (fs.existsSync(depsTs)) return depsTs

  // Then submodule
  const subPath = path.resolve(SUBMODULE, relPath)
  if (fs.existsSync(subPath)) return subPath
  const subTs = subPath.replace(/\.js$/, '.ts')
  if (fs.existsSync(subTs)) return subTs

  return null
}

// Walk dir to find existing stub files
function findStubFiles() {
  const stubs = new Map()
  if (!fs.existsSync(DEPS)) return stubs
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.ts')) {
        const key = path.relative(DEPS, full).replace(/\\/g, '/')
        stubs.set(key, full)
      }
    }
  }
  walk(DEPS)
  return stubs
}

const existingStubs = findStubFiles()

await esbuild.build({
  entryPoints: ['src/bridgeMain.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/bridge.mjs',
  external: [
    'zod', 'chalk', 'axios', 'qrcode', 'lodash-es', 'get-east-asian-width',
    // Node built-ins — keep as externals to avoid CJS→ESM require issues
    'fs', 'fs/promises', 'path', 'crypto', 'os', 'child_process', 'readline',
    'net', 'stream', 'util', 'events', 'tty', 'assert', 'buffer', 'querystring',
    'url', 'http', 'https', 'zlib',
    // Other problematic packages
    '@anthropic-ai/sdk',
  ],
  plugins: [{
    name: 'resolve-bridge-deps',
    setup(build) {
      // bun:bundle → stub
      build.onResolve({ filter: /^bun:bundle$/ }, () => {
        return { path: path.resolve(DEPS, 'bun-bundle-stub.ts') }
      })

      // src/ prefixed → submodule or deps
      build.onResolve({ filter: /^src\// }, args => {
        const relPath = args.path.slice(4)
        const depsPath = path.resolve(DEPS, relPath)
        if (fs.existsSync(depsPath)) return { path: depsPath }
        const depsTs = depsPath.replace(/\.js$/, '.ts')
        if (fs.existsSync(depsTs)) return { path: depsTs }
        const subPath = path.resolve(SUBMODULE, relPath)
        if (fs.existsSync(subPath)) return { path: subPath }
        const subTs = subPath.replace(/\.js$/, '.ts')
        if (fs.existsSync(subTs)) return { path: subTs }
      })

      // ../ imports from src/ → deps or submodule
      build.onResolve({ filter: /^\.\.\// }, args => {
        if (!args.importer.startsWith(SRC_DIR)) return
        const resolved = path.resolve(args.resolveDir, args.path)
        const srcRel = path.relative(SRC_DIR, resolved)
        const mapped = resolveSrcImport(resolved, srcRel)
        if (mapped) return { path: mapped }
      })

      // ../ imports from claude-code-deps/ files — resolve naturally
      build.onResolve({ filter: /^\.\.\// }, args => {
        if (args.importer.startsWith(DEPS)) {
          const resolved = path.resolve(args.resolveDir, args.path)
          // Resolve relative to submodule
          const depsRel = path.relative(DEPS, resolved)
          if (!depsRel.startsWith('..')) {
            // Stays within deps
            const depsPath = path.resolve(DEPS, depsRel)
            if (fs.existsSync(depsPath)) return { path: depsPath }
            const depsTs = depsPath.replace(/\.js$/, '.ts')
            if (fs.existsSync(depsTs)) return { path: depsTs }
          } else {
            // Goes outside deps — try submodule
            const subPath = path.resolve(SUBMODULE, depsRel)
            if (fs.existsSync(subPath)) return { path: subPath }
            const subTs = subPath.replace(/\.js$/, '.ts')
            if (fs.existsSync(subTs)) return { path: subTs }
          }
        }
      })

      // ../../ imports from files that were deeper in the original tree
      build.onResolve({ filter: /^\.\.\/\.\.\// }, args => {
        if (args.importer.startsWith(DEPS) || args.importer.startsWith(SUBMODULE)) {
          const resolved = path.resolve(args.resolveDir, args.path)
          const subRel = path.relative(SUBMODULE, resolved)
          if (!subRel.startsWith('..') && !subRel.startsWith(path.sep)) {
            const subPath = path.resolve(SUBMODULE, subRel)
            if (fs.existsSync(subPath)) return { path: subPath }
            const subTs = subPath.replace(/\.js$/, '.ts')
            if (fs.existsSync(subTs)) return { path: subTs }
          }
        }
      })

      // Log unresolved packages
      build.onEnd(result => {
        if (result.errors.length > 0) {
          const unresolved = result.errors.filter(e =>
            e.text.includes('Could not resolve'))
          if (unresolved.length > 0) {
            console.error(`\n[WARN] ${unresolved.length} unresolved imports — need stubs or packages`)
            const packages = new Set()
            for (const e of unresolved) {
              const m = e.text.match(/Could not resolve "([^"]+)"/)
              if (m) {
                const name = m[1]
                if (!name.startsWith('.') && !name.startsWith('src/')) {
                  packages.add(name)
                }
              }
            }
            if (packages.size > 0) {
              console.error(`Missing packages: ${[...packages].sort().join(', ')}`)
            }
          }
        }
      })
    },
  }],
})

// Build statusline script
await esbuild.build({
  entryPoints: [path.join(SRC_DIR, 'hbridge', 'statusline.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/statusline.mjs',
});

// Build hbridge CLI
await esbuild.build({
  entryPoints: [path.join(SRC_DIR, 'hbridge', 'cli.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/hbridge.mjs',
  external: ['zod', 'chalk', 'axios', '@anthropic-ai/sdk', 'qrcode', 'lodash-es', 'get-east-asian-width'],
});
