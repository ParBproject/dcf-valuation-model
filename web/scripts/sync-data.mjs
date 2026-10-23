// Copies the model output into the web app. public/data is generated: never hand-edit it.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../results/valuations.json')
const dst = resolve(here, '../public/data/valuations.json')
mkdirSync(dirname(dst), { recursive: true })
copyFileSync(src, dst)
console.log(`synced ${src} -> ${dst}`)
