import { out, src, dist, make, TEST, PROD, DEV, CJS, BUNDLE, FORMAT } from './scripts/plugin'
import { extMap, cpFile, pushMsg, postBuild } from './scripts/plugin'
import { rm, writeFile, readFile } from 'fs/promises'
import { pkg, echo, voidFn } from './src/utils'
import { build, BuildOptions } from 'esbuild'
import { basename, dirname } from 'path'
import { argv } from 'process'

import chok from 'chokidar'
import fg from 'fast-glob'
import net from 'net'

import '@benzn/to-ms/extender'
import 'string.chalk'

const args = argv.slice(2)

let outdir = args.includes('--dist') ? dist() : out()
if (args.includes('--make')) outdir = make()

const settings = { DEV, PROD, TEST, BUNDLE, FORMAT }
const entryies = await fg(['src/**/*.{ts,mts,cts,js,cjs,mjs}', '!src/**/*.d.ts'])

echo(settings)
echo(entryies)

export const esbuildConfig = {
    entryPoints: entryies,
    outdir,
    write: true,
    bundle: BUNDLE,
    minify: PROD && !TEST,
    metafile: true,
    sourcemap: false,
    treeShaking: PROD,
    minifySyntax: PROD && !TEST,
    minifyWhitespace: PROD && !TEST,
    minifyIdentifiers: PROD && !TEST,
    resolveExtensions: ['.ts', '.js'],
    splitting: false,
    mangleProps: PROD ? /^_(?:.*?)_$/ : undefined,
    mangleQuoted: true,
    // chunkNames: 'lib/[hash]',
    // entryNames: '[name]',
    assetNames: '[name]',
    logLevel: 'info',
    platform: 'node',
    target: 'esnext',
    format: FORMAT,
    legalComments: 'none',
    dropLabels: [
        CJS ? 'ESM' : 'CJS',
        PROD ? 'DEV' : '',
        PROD ? 'TEST' : '',
        TEST ? 'TEST' : '',
    ],
    define: {
        DEV: `${DEV}`,
        CJS: `${CJS}`,
        ESM: `${!CJS}`,
        PROD: `${PROD}`,
        TEST: `${TEST}`,
    },
    loader: { '.json': args.includes('--json') ? 'json' : 'copy' },
    plugins: [
        pushMsg({
            success: {
                msg: 'build Completed',
                style: 64
            },
            error: {
                msg: 'build Failed',
                style: 16
            },
            warn: {
                style: 48
            }
        }),
    ],
} as const satisfies BuildOptions

void (
    argv.includes('--watch')
        ? await watchFiles()
        : await buildFiles()
)

/* void (
    argv.includes('--terser')
        ? await terserFiles()
        : null
) */

async function buildFiles() {
    try {
        const res = await build(esbuildConfig)
        await postBuild(res.metafile, outdir === out())
        echo('Building completed!'.greenBright)
    } catch (err) {
        echo.err('Building failed:'.redBright, err)
    }
}

async function watchFiles() {
    try {
        const watcher = chok.watch(src('app'))
        let timeout: NodeJS.Timeout
        watcher.on('change', () => {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                echo(''.clearScreen, 'Rebuilding...'.yellow)
                buildFiles()
                    .then(() => {
                        const client = net.connect(3000, 'localhost', () => {
                            echo('Reloading Render proccess...'.blueBright)
                            client.write('reload', echo)
                            client.end()
                        })

                        client.on('error', (err) => {
                            echo.err('Failed to connect to Electron dev server:'.redBright, err.message)
                        })
                    })
                    .catch(echo.err)
            }, '2'.s)
        })
        await buildFiles()
        echo(`Watching directory: ${src('app')}`.blueBright)
        return () => watcher.close()
    } catch (err) {
        echo.err('Watching failed:'.redBright, err)
        return voidFn
    }
}
/* 
async function terserFiles() {
    try {
        (await fg([out('**\/*.js'), out('**\/*.[mc]js')])).forEach(
            async entry => {
                const code = await readFile(entry, 'utf8')
                const minified = await minify(code, {
                    mangle: true,
                    compress: true,
                    keep_fnames: false,
                    toplevel: true,
                    module: true,
                    format: {
                        comments: /^!/,
                    }
                } as MinifyOptions)

                if (minified.code) {
                    await rm(entry)
                    await writeFile(entry, minified.code)
                    echo(`Minified: ${entry}`)
                } else
                    echo.err('Error minifying the file:', entry)
            }
        )
    } catch (err) {
        echo.err('Error minifying the file:', err)
    }
}
 */