import { spawn } from 'node:child_process'
import console from 'node:console'
import http from 'node:http'
import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { performance } from 'node:perf_hooks'
import process from 'node:process'
import { clearTimeout, setTimeout } from 'node:timers'
import { setTimeout as delay } from 'node:timers/promises'

// Runs an isolated Vite server and checks that HTML, dependencies and the
// workspace remain responsive after the initial file-watcher scan.
const label = process.argv[2] || 'current'
if (!/^[a-z-]+$/.test(label)) throw new Error('Use a lowercase report label')
const started = performance.now()
const child = spawn(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    `
  import { createServer } from 'vite'
  const server = await createServer({
    cacheDir: ${JSON.stringify(resolve(`node_modules/.vite-measure-${label}`))},
    server: { host: '127.0.0.1', port: 4451, strictPort: true },
  })
  await server.listen()
  console.log('MEASURE_READY')
`,
  ],
  { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] },
)
let logs = ''
let readyMs
const watchdog = setTimeout(() => child.kill(), 30_000)
const ready = new Promise((resolve, reject) => {
  child.stdout.on('data', (data) => {
    logs += data.toString()
    if (logs.includes('MEASURE_READY') && readyMs === undefined) {
      readyMs = Math.round(performance.now() - started)
      resolve()
    }
  })
  child.stderr.on('data', (data) => {
    logs += data.toString()
  })
  child.once('error', reject)
  child.once('exit', (code) => {
    if (readyMs === undefined) reject(new Error(`Vite exited: ${code}`))
  })
})
function get(path) {
  const started = performance.now()
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:4451${path}`, { timeout: 8_000 }, (res) => {
      let bytes = 0
      res.on('data', (chunk) => {
        bytes += chunk.length
      })
      res.on('end', () =>
        resolve({
          path,
          status: res.statusCode,
          ms: Math.round(performance.now() - started),
          bytes,
        }),
      )
    })
    req.on('timeout', () => req.destroy(new Error('request timed out')))
    req.on('error', (error) =>
      resolve({ path, error: error.message, ms: Math.round(performance.now() - started) }),
    )
  })
}
try {
  await ready
  const requests = []
  const paths = [
    '/',
    '/src/main.ts',
    `/node_modules/.vite-measure-${label}/deps/vue.js`,
    '/src/App.vue',
    '/src/views/MatchdayView.vue',
    '/src/components/matchday/MatchdayWorkspace.vue',
  ]
  for (const path of paths) {
    const response = await get(path)
    requests.push(response)
    if (response.error || response.status !== 200) {
      process.exitCode = 1
      break
    }
  }
  await delay(1_000)
  const repeat = await get('/')
  requests.push(repeat)
  if (repeat.error || repeat.status !== 200) process.exitCode = 1
  console.log(JSON.stringify({ label, readyMs, requests }, null, 2))
} finally {
  clearTimeout(watchdog)
  child.kill()
  await writeFile(resolve(tmpdir(), `matchday-vite-${label}.log`), logs)
}
