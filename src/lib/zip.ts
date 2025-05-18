import { echo, fsWrite, joinBuffer, nullBuf, toBuffer } from '@/utils'
import { basename, extname, relative, join } from 'path'
import { readdir, readFile, stat } from 'fs/promises'
import { promisify } from 'util'
import {
    gzip as gz,
    gunzip as gu,
    inflate as inf,
    deflate as def,
    zstdCompress as zdC,
    zstdDecompress as zdD,
    brotliCompress as brC,
    brotliDecompress as brD,
    BrotliOptions,
    ZstdOptions,
    ZlibOptions,
    InputType,
} from 'zlib'

ESM: Object.assign(globalThis, {
    __dirname: import.meta.dirname,
    __filename: import.meta.filename,
})

const VERSION = 1
const MAGIC_BYTES = [
    '\x00\x02\x1A',
    '\x01\x02\x1B',
    '\x01\x02\x1C',
    '\x01\x02\x1D',
    `\x01\xBENZv${VERSION}`,
] as const satisfies string[]

const archiveOpts = {
    compress: true,
    options: {},
} as const satisfies ArchiveOptions

const methods: Dictionary<(
    buf: InputType,
    options?: ZlibOptions | BrotliOptions | ZstdOptions
) => Promise<Buffer>> = Object.fromEntries(
    ([0, [gz, gu], [def, inf], [zdC, zdD], [brC, brD]] as const).flatMap(
        (fn, i) => [0, 1].map(n => ['' + n + i,
        fn
            ? promisify(fn[n])
            : (a: any) => a
        ])
    )
)

const byteObj = {
    gzip: 1,
    deflate: 2,
    zstd: 3,
    brotli: 4,
    true: 1,
} as const

const byteMap = (p: string | number | boolean) => (byteObj as any)['' + p] ?? 0

const [HDR, SEP, , , FTR] = MAGIC_BYTES
const [bHDR, bSEP, bLEN, bSTR, bFTR] = MAGIC_BYTES.map(Buffer.from)

const headerReg = new RegExp(`^NZ(\\d{1})[\\s\\S]*?${FTR.slice(0, -1)}(\\d{1})$`)
//- const centralReg = new RegExp(['^', '.*?', '.*?', '.*?', ''].join(HDR))

async function archive(
    files: FilesInput,
    outFile?: string | null,
    options?: ArchiveOptions
) {
    const { compress, options: opts } = { ...archiveOpts, ...options }
    const chunks: Buffer[] = [nullBuf]
    const byte = byteMap(compress)
    const meth = methods['0' + byte]
    const _files = await getFiles(files)
    const entries = constructArchive(_files)
    echo(_files)
    chunks.push(...entries)

    const raw = joinBuffer(chunks, SEP)
    const data = await meth(raw, opts)
    const archive = joinBuffer([toHeader('NZ', byte, HDR), data, bFTR])

    //@ts-ignore
    return outFile === null ? archive : await fsWrite(outFile || 'archive.nz', archive)
}

async function extract(
    archive: string | Buffer,
    outDir?: string | null
) {
    const chunks: [string, Buffer][] = []
    const isFile = typeof archive == 'string'
    const buffer = isFile ? await readFile(archive) : archive
    const header = buffer.subarray(0, 20)
    const footer = buffer.subarray(-20)
    const matchs = headerReg.exec('' + header + footer)

    if (!matchs)
        throw new Error(`Invalid NZ Archive. Header mismatch in: ${isFile ? archive : '[Buffer]'}`)

    const [ver, , byte] = [matchs.pop(), ...matchs].map(Number)
    const meth = methods['1' + byte]
    const raw = buffer.subarray(3 + bHDR.byteLength, -bFTR.byteLength)
    const data = await meth(raw)
    const entries = deconstructArchive(data, ver)

    chunks.push(...entries)

    //@ts-ignore
    return outDir === null ? Object.fromEntries(chunks) : (await Promise.all(
        chunks.map(([name, content]) => fsWrite(join(outDir || (isFile
            ? basename(archive, extname(archive))
            : 'archive'), name), content)
        )
    ), undefined)
}

const toHeader = (...bytes: (string | number | Buffer)[]) => toBuffer(bytes.join(''))

const getFiles = async (entries: FilesInput) => (
    Array.isArray(entries)
        ? Array.isArray(entries[0])
            ? Buffer.isBuffer(entries[0][1])
                ? entries
                : await fetchFiles(entries)
            : await fetchFiles(entries.map(entry => [null, entry]))
        : Object.entries(entries)
) as [string, Buffer][]

const fetchFiles = async (entries: any) => (await Promise.all(
    (entries as [string, string][]).map(async ([name, entry]) => {
        const stats = await stat(entry)

        if (stats.isFile())
            return [[name ?? basename(entry), await readFile(entry)]]

        if (stats.isDirectory())
            return await Promise.all(
                (await readdir(entry, { recursive: true, withFileTypes: true }))
                    .filter(dirent => dirent.isFile())
                    .map(async dirent => [
                        join(name ?? basename(entry), relative(entry, dirent.parentPath), dirent.name).replaceAll('\\', '/'),
                        await readFile(join(dirent.parentPath, dirent.name))
                    ])
            )

        throw new Error(`Unsupported file type for entry: ${entry}`)
    })
)).flat()

function constructArchive(bufs: [string, string | Buffer][], _ver = VERSION) {
    return bufs.map(([name, content]) => {
        const buf = toBuffer(content)
        return joinBuffer([
            toBuffer(name),
            bLEN,
            toBuffer(buf.byteLength),
            bSTR,
            buf
        ])
    })
}

function deconstructArchive(buf: Buffer, _ver = VERSION, offset = 0) {

    const [lSEP, lLEN, lSTR] = [bSEP, bLEN, bSTR].map(b => b.byteLength)
    const result: [string, Buffer][] = []

    while (true) {
        const iSEP = buf.indexOf(bSEP, offset)
        if (iSEP === -1) break

        const iLEN = buf.indexOf(bLEN, offset)
        const iSTR = buf.indexOf(bSTR, offset)
        const name = buf.subarray(iSEP + lSEP, iLEN)
        const size = buf.subarray(iLEN + lLEN, iSTR)

        const start = iSTR + lSTR
        offset = start + +size

        result.push(['' + name, buf.subarray(start, offset)])
    }

    return result
}

// --- Types ---

type FilesInput =
    | string[]
    | [string, string | Buffer][]
    | { [name: string]: string | Buffer }

type ArchiveOptions = {
    compress: false
} | {
    compress?: true | 'deflate' | 'gzip'
    options?: ZlibOptions
} | {
    compress: 'brotli'
    opts?: BrotliOptions
} | {
    compress: 'zstd'
    opts?: ZstdOptions
}

export {
    byteMap,
    archive,
    extract,
    getFiles,
    toHeader,
    methods,
    VERSION,
    headerReg,
    archiveOpts,
    MAGIC_BYTES,
    FilesInput,
    ArchiveOptions,
}
