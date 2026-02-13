import { program } from 'npm:commander@^14.0'
import { Path, PathLike } from 'jsr:@leawind/inventory@0.18.1/fs'
import { generateIndex } from 'jsr:@leawind/inventory@0.18.1/index-gen'
import log from 'jsr:@leawind/inventory@0.18.1/log'

type CliOptions = {
  check: boolean
  quiet: boolean
  verbose: boolean
}

if (import.meta.main) {
  program
    .name('gen-index')
    .description(`Recursively generates or validates index.ts files in a directory`)
    .argument('<dir>', 'Directory to process index files in')
    .option('-c, --check', 'Validate index files without making changes', false)
    .option('-q, --quiet', 'Suppress all output except errors', false)
    .option('-v, --verbose', 'Enable detailed logging', false)
    .action(async (dir: string, options: CliOptions) => {
      if (options.quiet && options.verbose) {
        log.error('ERROR: --quiet and --verbose options cannot be used simultaneously')
        Deno.exit(1)
      }
      log.api.setLevel(options.verbose ? 'trace' : options.quiet ? 'none' : 'info')

      const outdatedFiles = await generateIndex(Path.from(dir), {
        check: options.check,
      })

      if (outdatedFiles.length > 0) {
        log.error('FAILURE: The following index files are outdated:')
        outdatedFiles.forEach((file) => log.error('  ' + file))
        Deno.exit(1)
      } else {
        log.info('SUCCESS: All index files are up to date')
      }
    })
    .parse([Deno.execPath(), ...Deno.args])
}
