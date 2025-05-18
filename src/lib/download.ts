import { ansi256, echo, fallback, write } from '@/utils'
import { createWriteStream, mkdirSync } from 'fs'
import { dirname } from 'path'

const downloadOpts: DownloadOptions = {
    silent: false,
    type: 'bar',
    style: 'block',
}

enum cursor {
    hide = '\x1b[?25l',
    show = '\x1b[?25h',
    end = '\x1b[K',
    start = '\r',
}

const spinners = {
    moon: '',
    dots: '⡇⠏⠛⠹⢸⣰⣤⣆',
    line: '|/─\\',
}

const bars = {
    line: ['', '━', '━', '━', ''],
    dash: ['', '━', '╍', '┅', ''],
    block: '│█▒░│',
    equal: '[==-]'
}

const evts = [
    'uncaughtException',
    'SIGTERM',
    'SIGINT',
    'exit',
]

const units = ['B', 'KB', 'MB', 'GB', 'TB']

let i = 0

write(cursor.hide)
evts.forEach(evt => process.on(evt, (err) => {
    write(cursor.show)
    if (err instanceof Error) echo.err(err)
}))

async function download(
    url: string,
    out: string | null = 'download',
    options?: DownloadOptions
) {
    const { type, silent, style } = { ...downloadOpts, ...options }
    const res = await fetch(url)

    if (!res.ok || !res.body)
        throw new Error(`Failed to download: ${res.status} ${res.statusText}`)

    const { writer, buffer, end } = createStream(out)
    const reader = res.body.getReader()
    const spinner = type === 'spinner'
    const then = Date.now()
    const status: InStatus = {
        get took() { return formatTime((Date.now() - status.startTime) / 1000) },
        totalBytes: +(res.headers.get('content-length') || 0),
        delay: spinner ? 50 : 100,
        lastLoggedTime: then,
        downloadedBytes: 0,
        startTime: then,
        lastBytes: 0,
        ok: false,
        spinner,
        silent,
        style,
        url,
        out,
    }

    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) { status.ok = true; break }

            status.downloadedBytes += value.length
            writer(value)

            const now = Date.now()
            if (now - status.lastLoggedTime < status.delay) continue

            printProgress(status, now)
            status.lastBytes = status.downloadedBytes
            status.lastLoggedTime = now

        }
        /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    } catch (e) { }

    await end()
    printProgress(status, Date.now())

    echo('\n\n' + (status.ok
        ? `✅ Download complete! to: ${status.out ?? '[Buffer]'}`
        : '❌ Download failed!')
        + ` (Took: ${status.took})`
    )

    return status.out = buffer(), status as Status
}

function printProgress(status: InStatus, now: number) {
    if (status.silent) return
    const { downloadedBytes, totalBytes, lastBytes, spinner, style } = status

    //* Progress Bar/Spinner
    const barLength = 30
    const percent = totalBytes ? downloadedBytes / totalBytes : 0
    const filled = Math.round(barLength * percent)
    const unfilled = barLength - filled
    const progress = (spinner || !totalBytes)
        ? printSpinner(style)
        : printBar(filled, unfilled, style)

    //* Download Speed
    const bytesSinceLast = downloadedBytes - lastBytes
    const speed = bytesSinceLast / (1024 ** 2 * ((now - status.lastLoggedTime) / 1000))

    //* Remaining Time
    const remainingBytes = totalBytes - downloadedBytes
    const etaSec = speed > 0 ? (remainingBytes / 1024 ** 2) / speed : 0

    //* Humanize Values
    const humanDownloaded = formatBytes(downloadedBytes)
    const humanTotal = totalBytes ? formatBytes(totalBytes) : 'Unknown'
    const etaStr = etaSec ? formatTime(etaSec) : '...'

    //* Echo Progress
    write(
        cursor.start +
        `${progress} ${(percent * 100).toFixed(1)}% ` +
        `(${humanDownloaded}/${humanTotal}) ` +
        `Speed: ${speed.toFixed(2)} MB/s ` +
        `ETA: ${etaStr}` +
        cursor.end
    )
}

function formatBytes(bytes: number) {
    if (!bytes) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

function formatTime(seconds: number) {
    seconds = Math.round(seconds)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
}

function printSpinner(style?: string) {
    const spinner = fallback(spinners, style)
    return ansi256(25, spinner[i++ % spinner.length])
}

function printBar(filled: number, unfilled: number, style?: string) {
    const bar = fallback(bars, style)
    return (
        ansi256(24, bar[0]) +
        ansi256(34, bar[1]).repeat(filled) +
        ansi256(28, bar[2]).repeat(unfilled && 1) +
        ansi256(52, bar[3]).repeat((unfilled || 1) - 1) +
        ansi256(24, bar[4])
    )
}

function createStream(out: string | null | undefined) {
    if (out) {
        mkdirSync(dirname(out), { recursive: true })
        const stream = createWriteStream(out)
            .on('error', (err) => {
                echo('\n❌ File write error:', err.message)
                stream.close()
            })

        return {
            buffer: () => null,
            writer: (chunk: Uint8Array) => stream.write(chunk),
            end: () => new Promise<void>(res => stream.end(res)),
        }
    }

    const chunks: Uint8Array[] = []
    return {
        buffer: () => Buffer.concat(chunks),
        writer: (chunk: Uint8Array) => chunks.push(chunk),
        end: () => Promise.resolve(),
    }
}

// --- Types ---

type InStatus = MutateProps<Status, { out: null | string | Buffer }>

type Status = {
    downloadedBytes: number
    lastLoggedTime: number
    totalBytes: number
    lastBytes: number
    startTime: number
    delay: number
    ok: boolean
    spinner: boolean
    silent?: boolean
    style?: string
    took: string
    url: string
    out: string | Buffer
}

type DownloadOptions = {
    silent?: boolean
} & ({
    type?: 'spinner'
    /**
     * moon -> Requires nerd-font
     */
    style?: Spinners
} | {
    type?: 'bar'
    style?: Bars
})

type Bars = LooseUnion<keyof typeof bars, string>
type Spinners = LooseUnion<keyof typeof spinners, string>
type Styles = Dictionary<string | string[]>

export {
    download,
    Bars,
    Styles,
    Status,
    Spinners,
    DownloadOptions,
}