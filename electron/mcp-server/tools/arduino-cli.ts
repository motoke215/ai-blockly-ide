// electron/mcp-server/tools/arduino-cli.ts
import { spawn, type ChildProcess } from 'node:child_process'
import { EventEmitter }             from 'node:events'
import { existsSync }               from 'node:fs'
import { writeFile, mkdir }         from 'node:fs/promises'
import { join }                     from 'node:path'
import { app }                      from 'electron'

export type LogLevel = 'info'|'warn'|'error'|'success'|'system'
export interface LogLine { level: LogLevel; text: string; timestamp: number }
export interface BoardInfo { port: string; fqbn: string; name: string; protocol: string }

const FQBN: Record<string, string> = {
  'esp32':'esp32:esp32:esp32', 'esp32s3':'esp32:esp32:esp32s3dev',
  'arduino-uno':'arduino:avr:uno', 'arduino-nano':'arduino:avr:nano',
}
const ESP32_INDEX = 'https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json'

export class ArduinoCliService extends EventEmitter {
  private readonly bin: string
  private readonly sketchDir: string
  private activeProc: ChildProcess | null = null
  private aborted = false

  constructor() {
    super()
    const bundled = join(app.isPackaged ? process.resourcesPath : join(__dirname, '../../'),
      process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli')
    this.bin       = existsSync(bundled) ? bundled : 'arduino-cli'
    this.sketchDir = join(app.getPath('userData'), 'sketches')
  }

  private log(level: LogLevel, text: string) {
    this.emit('event', { type: 'log', data: { level, text, timestamp: Date.now() } })
  }

  async getVersion(): Promise<string | null> {
    try { const o = await this.capture(['version', '--format', 'json']); return JSON.parse(o).VersionString ?? null }
    catch { return null }
  }

  async listBoards(): Promise<BoardInfo[]> {
    try {
      const raw = JSON.parse(await this.capture(['board', 'list', '--format', 'json']))
      const ports: any[] = raw.detected_ports ?? raw ?? []
      return ports.map(e => ({
        port: e.port?.address ?? e.address,
        fqbn: e.matching_boards?.[0]?.fqbn ?? '',
        name: e.matching_boards?.[0]?.name ?? 'Unknown',
        protocol: e.port?.protocol ?? 'serial',
      })).filter(b => b.port)
    } catch { return [] }
  }

  async ensureCore(board: string): Promise<boolean> {
    const fqbn = FQBN[board]; if (!fqbn) { this.log('error', `Unknown board: ${board}`); return false }
    const core = fqbn.split(':').slice(0, 2).join(':')
    this.log('system', `Checking core: ${core}`)
    try {
      const list = JSON.parse(await this.capture(['core', 'list', '--format', 'json']))
      const platforms: any[] = list.platforms ?? list ?? []
      if (platforms.some((p: any) => p.id === core)) { this.log('success', `Core ${core} already installed`); return true }
    } catch {/* fallthrough */}
    this.log('info', `Installing core ${core}...`)
    const ok = await this.stream(['core', 'install', core], 'compile')
    if (ok) this.log('success', `Core ${core} installed`)
    return ok
  }

  async compileAndUpload(opts: { sketchName: string; sourceCode: string; board: string; port?: string }): Promise<any> {
    this.aborted = false
    const fqbn = FQBN[opts.board]; if (!fqbn) throw new Error(`Unknown board: ${opts.board}`)

    const dir = join(this.sketchDir, opts.sketchName)
    const ino = join(dir, `${opts.sketchName}.ino`)
    await mkdir(dir, { recursive: true })
    await writeFile(ino, opts.sourceCode, 'utf-8')
    this.log('system', `Sketch → ${ino}`)

    const buildDir = join(dir, 'build')
    this.log('info', `▶ Compiling for ${fqbn}...`)
    const t0 = Date.now()

    const { ok, stderr } = await this.streamCapture(
      ['compile', '--fqbn', fqbn, '--build-path', buildDir, '--format', 'json', dir], 'compile')

    const errors: string[] = []
    for (const l of stderr.split('\n')) { if (l.toLowerCase().includes('error:')) errors.push(l.trim()) }

    const compileResult = { success: ok && errors.length === 0, errors, durationMs: Date.now() - t0 }
    this.emit('event', { type: 'compile_done', data: compileResult })

    if (!compileResult.success) { this.log('error', `✗ Compile failed`); return { compile: compileResult } }
    this.log('success', `✓ Compiled ${compileResult.durationMs}ms`)

    if (!opts.port || this.aborted) return { compile: compileResult }

    this.log('info', `▶ Uploading to ${opts.port}...`)
    const t1 = Date.now()
    const { ok: upOk, stderr: upErr } = await this.streamCapture(
      ['upload', '--fqbn', fqbn, '--port', opts.port, '--build-path', buildDir, dir], 'upload')

    const upErrors = upErr.split('\n').filter(l => l.toLowerCase().includes('error:'))
    const uploadResult = { success: upOk && upErrors.length === 0, port: opts.port, durationMs: Date.now() - t1, errors: upErrors }
    this.emit('event', { type: 'upload_done', data: uploadResult })
    if (uploadResult.success) this.log('success', `✓ Uploaded ${uploadResult.durationMs}ms`)
    else this.log('error', `✗ Upload failed`)
    return { compile: compileResult, upload: uploadResult }
  }

  abort() {
    this.aborted = true
    if (this.activeProc && !this.activeProc.killed) { this.activeProc.kill('SIGTERM'); this.log('warn', '⚠ Aborted') }
  }

  private capture(args: string[]): Promise<string> {
    return new Promise((res, rej) => {
      let out = ''
      const p = spawn(this.bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
      p.stdout.on('data', (d: Buffer) => out += d); p.on('close', c => c === 0 ? res(out) : rej(new Error(out))); p.on('error', rej)
    })
  }

  private stream(args: string[], phase: 'compile'|'upload'): Promise<boolean> {
    return this.streamCapture(args, phase).then(r => r.ok)
  }

  private streamCapture(args: string[], phase: 'compile'|'upload'): Promise<{ ok: boolean; stdout: string; stderr: string }> {
    return new Promise(resolve => {
      if (this.aborted) { resolve({ ok: false, stdout: '', stderr: 'aborted' }); return }
      const p = spawn(this.bin, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ARDUINO_BOARD_MANAGER_ADDITIONAL_URLS: ESP32_INDEX } })
      this.activeProc = p
      let stdout = '', stderr = ''

      p.stdout.on('data', (d: Buffer) => {
        const t = d.toString(); stdout += t
        for (const line of t.split('\n')) {
          const l = line.trim(); if (!l) continue
          const m = l.match(/(\d+)%/)
          if (m) this.emit('event', { type: 'progress', data: { phase, percent: parseInt(m[1]) } })
          this.log('info', l)
        }
      })
      p.stderr.on('data', (d: Buffer) => {
        const t = d.toString(); stderr += t
        for (const line of t.split('\n')) {
          const l = line.trim(); if (!l) continue
          this.log(l.toLowerCase().includes('error') ? 'error' : l.toLowerCase().includes('warning') ? 'warn' : 'info', l)
        }
      })
      p.on('close', code => { this.activeProc = null; resolve({ ok: code === 0, stdout, stderr }) })
      p.on('error', err => { this.activeProc = null; this.log('error', err.message); resolve({ ok: false, stdout, stderr: err.message }) })
    })
  }
}

export const arduinoService = new ArduinoCliService()
