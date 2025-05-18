//@ts-nocheck
import { DownloadOptions, Status } from './download'
import { ArtifactOptions } from './get'
import { ArchiveOptions } from './zip'

export * from './download'
export * from './get'
export * from './zip'

export { getArtifact, extract, archive, download }

function getArtifact(
    options?: MutateProps<ArtifactOptions, { out?: string }>,
    downloadOpts?: DownloadOptions
): Promise<string>
function getArtifact(
    options?: MutateProps<ArtifactOptions, { out: null }>,
    downloadOpts?: DownloadOptions
): Promise<Buffer>

function extract(
    archivePath: string,
    outDir?: string
): Promise<void>
function extract(
    archiveContent: Buffer,
    outDir?: string
): Promise<void>

function extract(
    archivePath: string,
    outDir: null
): Promise<Dictionary<string | Buffer>>
function extract(
    archiveContent: Buffer,
    outDir: null
): Promise<Dictionary<string | Buffer>>

function archive(
    filePaths: string[],
    output?: string,
    options?: ArchiveOptions
): Promise<void>
function archive(
    fileObject: Dictionary<string | Buffer>,
    output?: string,
    options?: ArchiveOptions
): Promise<void>
function archive(
    fileEntries: [name: string, content: string | Buffer][],
    output?: string,
    options?: ArchiveOptions
): Promise<void>

function archive(
    filePaths: string[],
    output: null,
    options: ArchiveOptions
): Promise<Buffer>
function archive(
    fileObject: Dictionary<string | Buffer>,
    output: null,
    options: ArchiveOptions
): Promise<Buffer>
function archive(
    fileEntries: [name: string, content: string | Buffer][],
    output: null,
    options: ArchiveOptions
): Promise<Buffer>

function download(
    url: string,
    out?: string,
    options?: DownloadOptions
): Promise<MutateProps<Status, { out: string }>>
function download(
    url: string,
    out: null,
    options?: DownloadOptions
): Promise<MutateProps<Status, { out: Buffer }>>
