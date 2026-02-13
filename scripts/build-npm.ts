import { build, emptyDir } from 'jsr:@deno/dnt@^0.42'
import * as std_path from 'jsr:@std/path@^1'

import DENO_JSON from '../deno.json' with { type: 'json' }

const OUTPUT_DIR = `dist/npm`
const COPIED_FILES = [
  `README.md`,
  `LICENSE`,
]

await emptyDir(OUTPUT_DIR)

await build({
  packageManager: 'npm',
  importMap: 'deno.json',
  entryPoints: Object.entries(DENO_JSON.exports).map(([name, path]) => ({ name, path })),
  outDir: OUTPUT_DIR,
  shims: {},
  esModule: true,
  typeCheck: false,
  test: false,
  declaration: 'inline',
  declarationMap: true,
  scriptModule: 'cjs',
  package: {
    type: 'module',
    name: DENO_JSON.name,
    version: DENO_JSON.version,
    license: DENO_JSON.license,
    description: DENO_JSON.description,
    repository: DENO_JSON.repository,
    main: './esm/index.js',
    module: './esm/index.js',
    private: false,
    publishConfig: {
      access: 'public',
    },
  },
  compilerOptions: {
    target: 'Latest',
    lib: ['ESNext'],
    inlineSources: true,
    sourceMap: true,
    strictFunctionTypes: false,
    noImplicitThis: false,
    noImplicitReturns: false,
    noImplicitAny: false,
  },
  postBuild() {
    COPIED_FILES.forEach((file) => Deno.copyFileSync(file, std_path.join(OUTPUT_DIR, file)))
  },
})
