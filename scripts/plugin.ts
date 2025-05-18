//@ts-nocheck
import { basename, extname, resolve, join } from 'path'
import { cp, rename, appendFile } from 'fs/promises'
import { readFileSync, writeFileSync } from 'fs'
import { echo, isWindows } from '../src/utils'
import { execFile } from 'child_process'
import { createHash } from 'crypto'
import { Plugin } from 'esbuild'
import { env } from 'process'
import fg from 'fast-glob'

const __dirname = import.meta.dirname
const __filename = import.meta.filename

let newOutputs: Record<string, any> = {}
let oldOutputs: string[] = []

export function root(...paths: string[]) {
    const path = [__dirname, '../', ...paths]
    return resolve(...path) || join(...path)
}

export const src = (...path: string[]) => root('src', ...path)
export const out = (...path: string[]) => root('out', ...path)
export const dist = (...path: string[]) => root('dist', ...path)
export const make = (...path: string[]) => root('make', ...path)
export const DEV = env.dev === 'true' ? true : false
export const CJS = env.format?.toLowerCase() === 'cjs' ? true : false
export const PROD = env.prod === 'true' ? true : false
export const TEST = env.test === 'true' ? true : false
export const BUNDLE = env.bundle === 'true' ? true : false
export const FORMAT = CJS ? 'cjs' : 'esm'

export function cpFile(files: Record<string, string> | string[]): Plugin {
    return {
        name: 'copy-file',
        async setup(build) {
            let _files = Array.isArray(files)
                ? files.reduce<Record<string, string>>(
                    (obj, val) => (obj[val] = val, obj), {})
                : files

            build.onEnd(_ => {
                Object.keys(_files).forEach(
                    async file => await cp(file, out(_files[file]), { recursive: true })
                        .then(() => echo(`${file} copied to ${out(_files[file])}`))
                        .catch((err) => echo.err(`Failed to copy file ${file} to ${out(_files[file])}`, err))
                )
            })
        }
    }
}

export function cleanImport(files: {
    [name: string]: string[]
}): Plugin {
    return {
        name: 'import-cleaner',
        setup(build) {
            build.onEnd(_ => {
                Object.entries(files).forEach(
                    ([file, imps]) => {
                        const _file = out(file)
                        let cont = readFileSync(_file, 'utf8')
                        imps.forEach(imp => cont = cont
                            .replace(new RegExp(`import\\s*?["'][\\./]*?${imp}["'];?`, 'ig'), ''))
                        writeFileSync(_file, cont)
                    }
                )
            })
        }
    }
}

export function extMap(mapObj: Record<string, string>): Plugin {
    return {
        name: 'extension-mapper',
        setup(build) {
            const options = build.initialOptions
            const outExt = options.outExtension?.['.js'] ?? '.js'
            const entrys: Record<string, string> = {}
            if (Array.isArray(options.entryPoints))
                options.entryPoints.forEach(
                    (entry: any) => entrys[basename(entry, extname(entry), '')] = extname(entry)
                )

            build.onEnd(res => {
                if (!res.metafile) return
                const { outputs } = res.metafile

                Object.keys(outputs)
                    .filter(file =>
                        extname(file) === outExt &&
                        Object.keys(entrys).includes(basename(file, extname(file), ''))
                    )
                    .forEach(
                        entry => {
                            const newName = entry.replace(extname(entry), '') + (
                                mapObj[entrys[basename(entry, extname(entry), '')]]
                                ?? entrys[basename(entry, extname(entry), '')]
                            )
                            newOutputs[newName] = outputs[entry]
                            oldOutputs.push(entry)
                            rename(entry, newName).catch(echo.err)
                        }
                    )
            })
        }
    }
}

export function styles(): Plugin {
    return {
        name: 'style-modifier',
        setup(build) {
            build.onEnd(res => {
                if (!res.metafile) return

                const { outputs } = res.metafile
                const cssFile = Object.keys(outputs)
                    .filter(file => extname(file) === '.css')[0]

                const newName = join(cssFile, '../style.css')
                newOutputs[newName] = outputs[cssFile]
                oldOutputs.push(cssFile)

                rename(
                    cssFile,
                    newName
                ).catch(echo.err)
            })
        }
    }
}

export function pushMsg(msgMap:
    Partial<Record<
        | 'warn'
        | 'error'
        | 'success',
        {
            msg?: string
            style?: number
        }
    >>
): Plugin {
    return {
        name: 'msg-pusher',
        setup(build) {
            if (PROD || !isWindows) return
            const msgbox = join(__dirname, 'msg.vbs')
            const push = (...args: [msg: string, style: string, timeout: `${number}`]) => execFile(
                "wscript.exe",
                [msgbox, 'esbuild Compiler', ...args],
                { windowsHide: true },
                echo
            )

            build.onEnd(res => {
                const print = (obj: Record<string, any>[]) => obj.reduce(
                    (acc, val) => `${acc}${val.id} at ${val.location?.file.split(/[\\/]/).pop()}\n`, ''
                )
                if (res.warnings.length && msgMap.warn) push(msgMap.warn.msg ?? print(res.warnings), `${msgMap.warn.style}`, '5')
                if (res.errors.length && msgMap.error) push(msgMap.error.msg ?? print(res.errors), `${msgMap.error.style}`, '2')
                else if (msgMap.success) push(msgMap.success.msg ?? '', `${msgMap.success.style}`, '1')
            })
        }
    }
}

export async function postBuild(meta: Record<string, any> = {}, license = false) {
    license ? await pushLicense(out('../LICENSE.d.ts')) : null
    await modifyMeta(meta)
    //- await modifyPkg(pkg)
}

async function pushLicense(licensefile: string) {
    const entrys = await fg('out/**/*.{js,cjs,mjs}')
    const license = readFileSync(licensefile)
    echo(entrys)

    entrys.forEach(async entry => await appendFile(resolve(entry), license))
}

async function modifyMeta(meta: Record<string, any>) {
    const metafile = out('meta.json')
    const outputs = Object.assign(
        Object.fromEntries(
            Object.entries(meta.outputs).filter(
                ([file]) => !oldOutputs.includes(file)
            )
        ),
        newOutputs
    )

    const getHash = (file: string) => createHash('sha256')
        .update(readFileSync(file))
        .digest('hex');

    Object.keys(outputs)
        .forEach(file => {
            const hash = getHash(resolve('./', file))
            outputs[file].hash = hash
            echo(hash.yellowBright, file.blueBright)
        })

    meta.outputs = outputs
    writeFileSync(metafile, JSON.stringify(meta))
}

/* async function modifyPkg(pkg: Record<string, any>) {
    const pkgfileIn = resolve('./', 'package.json')
    const pkgfileOut = resolve('./', out('package.json'))
    const pkgJson = requireJson(pkgfileIn)
    const outputs = Object.assign(pkgJson, pkg)
    writeFileSync(pkgfileOut, JSON.stringify(outputs))
} */
