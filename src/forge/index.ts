import { archive, download, getArtifact } from '@/lib'
import { exec as exe } from 'child_process'
import { promisify } from 'util'

const exec = promisify(exe)

const out = await getArtifact({
    version: '2.458464.5-beta',
    platform: '',
    out: null,
}, {
    type: 'bar',
    style: 'dash',
})

// const dd = (await download('',)).out

exec(`pnpm unzip ${out}`)
