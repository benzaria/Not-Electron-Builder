import { platform as pl, arch as ar } from 'os'
import { writeFile, mkdir } from 'fs/promises'
import { stdout } from 'process'
import { Version } from '@/lib'
import { dirname } from 'path'
import tms from '@benzn/to-ms'

// --- Random ---
const voidFn = () => { } //* new Function()
const delay = (ms: number = tms('2s')) => new Promise<void>(res => setTimeout(res, ms))

export {
    voidFn,
    delay,
}

// --- Download ---
const fallback = (obj: Dictionary<any>, prop?: string, fbVal = prop ?? '') => obj[prop || Object.keys(obj)[0]] ?? fbVal
const colors = (id: number | string, str: string) => `\x1b[${id}m${str}\x1b[0m`
const ansi256 = (id: number | string, str: string) => colors(`38;5;${id}`, str)

export {
    fallback,
    ansi256,
    colors,
}

// --- Zip ---
const nullBuf = Buffer.alloc(0)

const toBuffer = (buf: string | number | Buffer) => Buffer.isBuffer(buf) ? buf : Buffer.from('' + buf)

const fsWrite = async (path: string, data: string | Buffer) => {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, data)
}

const joinBuffer = (bufs: Buffer[], sep: string | Buffer = nullBuf) => {
    if (!bufs.length) return nullBuf

    const sepBuf = toBuffer(sep)
    const lastBuf = bufs.pop()!
    const newBufs = bufs.flatMap(buf => [buf, sepBuf])

    return Buffer.concat([...newBufs, lastBuf])
}

const splitBuffer = (buf: Buffer, sep: string | Buffer, limit = -1, offset = 0) => {
    const bSEP = toBuffer(sep)
    const lSEP = bSEP.byteLength
    const result: Buffer[] = []

    for (let i = 0; i != limit; i++) {
        const iSEP = buf.indexOf(bSEP, offset)
        if (iSEP === -1) break

        result.push(buf.subarray(offset, iSEP))
        offset = iSEP + lSEP
    }

    result.push(buf.subarray(offset))
    return result
}

export {
    nullBuf,
    toBuffer,
    fsWrite,
    joinBuffer,
    splitBuffer,
}

// --- Get ---
const toVersion = (ver: string) => (ver.startsWith('v') ? ver : `v${ver}`) as Version
const Joiner = (char: string) => (...args: (string | undefined)[]) => args
    .filter(Boolean)
    .map((val, idx) => idx
        ? val.endsWith(char) ? val + char : char + val
        : val)
    .join('')

export {
    toVersion,
    Joiner,
}

// --- Environment ---
const platform = pl()
const arch = ar()

const isMacOs = platform === 'darwin'
const isWindows = platform === 'win32'
const isLinux = platform === 'linux'

export {
    arch,
    platform,
    isLinux,
    isMacOs,
    isWindows,
}

// --- Global ---
const echoObj = {
    inf: [94, 'INFO'],
    wrn: [93, 'WARN'],
    err: [91, 'ERROR'],
    suc: [32, 'SUCCESS'],
    unk: [35, 'UNKNOWN'],
} as const

const echoMap = (p: string): [id: number, str: string] => (echoObj as any)[p] ?? echoObj.unk
const echo = new Proxy(
    console.log as {
        (...args: any[]): void
        inf: (...args: any[]) => any
        wrn: (...args: any[]) => any
        err: (...args: any[]) => any
        unk: (...args: any[]) => any
    },
    {
        apply: (fn, _this, args) => fn(...args),

        get(fn, prop: string) {
            const [id, str] = echoMap(prop)
            return (...args: any[]) => fn(`[${colors(`1;${id}`, str)}] -`, ...args)
        },
    }
)

const write = stdout.write.bind(stdout)

const deepMerge = <T extends Dictionary<any>>(target?: T, source?: Partial<T>): T => {
    if (!target) return source as T

    for (const key in source) {
        if (source[key] && !Array.isArray(source[key]) && typeof source[key] === 'object') {
            if (typeof target[key] !== 'object' || target[key] === null)
                target[key] = {} as T[typeof key]

            target[key] = deepMerge(target[key], source[key] as T[typeof key])

        } else if (source[key] !== undefined)
            target[key] = source[key] as T[typeof key]
    }

    return target
}

export {
    deepMerge,
    write,
    echo,
}

// --- Json ---
import pkg from '#/package.json' with { type: 'json' }
import env from '#/env.json' with { type: 'json' }

export { pkg, env }