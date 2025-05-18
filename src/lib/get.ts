import { DownloadOptions, download } from './download'
import { echo, Joiner, toVersion } from '@/utils'
import { platform, arch } from 'os'
import { resolve } from 'path'

const joinSlash = Joiner('/')
const joinDash = Joiner('-')

async function getArtifact(options?: ArtifactOptions, downloadOpts?: DownloadOptions) {
    const { url, version, name, type, platform, arch, out } = { ...artifactOpts, ...options }

    const _version = toVersion(version)
    const outDir = out ? resolve(out, `${name}@${_version.slice(1)}`) + '.zip' : null
    const downloadURL = joinSlash(url, _version, joinDash(name, _version, platform, arch, type)) + '.zip'

    echo.inf(downloadURL + ' -> ' + (outDir ?? '[Buffer]'))
    const res = await download(downloadURL, outDir, downloadOpts)

    return res.out
}

const artifactOpts = {
    url: 'https://github.com/electron/electron/releases/download',
    platform: platform(),
    arch: arch(),
    version: 'latest',
    name: 'electron',
    out: 'artifact',
    type: '',
} as const satisfies ArtifactOptions

// --- Types ---

type Version = NonNullable<ArtifactOptions['version']>
interface ArtifactOptions {

    /**
     * Artifact base URL (default: *`github.com/electron`*)
     */
    url?: string

    /**
     * Artifact Type (default: *`undefined`*)
     */
    type?: string

    /**
     * Artifact Name (default: `electron`)
     */
    name?: string

    /**
     * Artifact Version (default: `latest`)
     */
    version?: LooseUnion<
        | 'latest'
        | `${d}`
        | `${d}.${d}`
        | `${d}.${d}.${d}`,
        | `${d}.${d}.${d}${w}`
    >

    /**
     * Artifact Platform (default: *`sys_os`*)
     */
    platform?: LooseUnion<
        | 'mas'
        | 'win32'
        | 'linux'
        | 'darwin',
        | string
    >

    /**
     * Artifact Arch (default: *`sys_arch`*)
     */
    arch?: LooseUnion<
        | 'x64'
        | 'ia32'
        | 'arm64'
        | 'armv7l',
        | string
    >

    /**
     * Path to save the zip file (default: `./artifact`)
     */
    out?: string | null
}

type d = Obfuscate<number>
type w = Obfuscate<string>

export {
    getArtifact,
    artifactOpts,
    Version,
    ArtifactOptions,
}
