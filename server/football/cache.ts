import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface JsonCache {
  read(key: string): Promise<unknown>
  write(key: string, value: unknown): Promise<void>
}

export function fileCache(): JsonCache {
  return {
    async read(key) {
      return JSON.parse(await readFile(key, 'utf8')) as unknown
    },
    async write(key, value) {
      await mkdir(dirname(key), { recursive: true })
      await writeFile(`${key}.tmp`, JSON.stringify(value), 'utf8')
      await rename(`${key}.tmp`, key)
    },
  }
}
