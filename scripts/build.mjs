// Builds the extension into dist/. Load dist/ as an unpacked extension.
//   npm run build   - one-off build
//   npm run watch   - rebuild scripts on change (re-run for manifest/HTML/CSS changes)
import * as esbuild from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';

const outdir = 'dist';
const watch = process.argv.includes('--watch');

const staticFiles = [
    ['src/manifest.json', 'manifest.json'],
    ['src/popup/popup.html', 'popup/popup.html'],
    ['src/popup/popup.css', 'popup/popup.css'],
    ['src/popup/loading-animation.css', 'popup/loading-animation.css'],
];

/** @type {esbuild.BuildOptions} */
const options = {
    entryPoints: [
        { in: 'src/content/index.js', out: 'content' },
        { in: 'src/popup/popup.js', out: 'popup/popup' },
    ],
    outdir,
    bundle: true,
    // Content scripts cannot be ES modules, so emit self-contained IIFEs.
    format: 'iife',
    target: 'chrome110',
    sourcemap: watch ? 'inline' : false,
    logLevel: 'info',
};

await rm(outdir, { recursive: true, force: true });
await mkdir(`${outdir}/popup`, { recursive: true });
await Promise.all(staticFiles.map(([from, to]) => cp(from, `${outdir}/${to}`)));

if (watch) {
    const context = await esbuild.context(options);
    await context.watch();
} else {
    await esbuild.build(options);
}
