// electron/updater.ts
// 自动更新模块 - 检查、下载、安装更新
// 使用 electron-updater，发布到 GitHub Releases

import { autoUpdater, type UpdateInfo } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

// 日志输出
function log(msg: string, ...args: unknown[]) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[UPdater ${ts}] ${msg}`, ...args)
}

// 上次检查时间（避免频繁检查）
let lastCheck = 0
const CHECK_INTERVAL = 30 * 60 * 1000 // 30分钟

// 更新状态广播到渲染进程
function notifyRenderer(win: BrowserWindow | null, status: string, data?: unknown) {
  if (!win || win.isDestroyed()) return
  win.webContents.send('updater:status', { status, data, ts: Date.now() })
}

export function setupUpdater(win: BrowserWindow) {
  // ── autoUpdater 事件 ─────────────────────────────────────────────────────
  autoUpdater.logger = {
    info:  (msg: string) => log('[INFO]', msg),
    warn:  (msg: string) => log('[WARN]', msg),
    error: (msg: string) => log('[ERR]', msg),
    debug: (msg: string) => log('[DEBUG]', msg),
  } as any

  autoUpdater.autoDownload   = false   // 用户点击按钮才下载
  autoUpdater.autoInstallOnAppQuit = true

  // 检查更新
  autoUpdater.on('checking-for-update', () => {
    log('检查更新中...')
    notifyRenderer(win, 'checking')
  })

  // 发现新版本
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log('发现新版本:', info.version)
    notifyRenderer(win, 'available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: (info as any).releaseNotes || '',
    })
  })

  // 没有可用更新
  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    log('已是最新版本:', info.version)
    notifyRenderer(win, 'not-available', { version: info.version })
  })

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    notifyRenderer(win, 'progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: Math.round(progress.bytesPerSecond / 1024) + ' KB/s',
      transferred: Math.round(progress.transferred / 1024) + ' KB',
      total: Math.round(progress.total / 1024) + ' KB',
    })
  })

  // 下载完成，准备安装
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log('更新已下载，准备安装:', info.version)
    notifyRenderer(win, 'ready', {
      version: info.version,
      isMandatory: (info as any).mandatory,
    })
  })

  // 下载出错
  autoUpdater.on('error', (err) => {
    log('更新出错:', err.message)
    notifyRenderer(win, 'error', { message: err.message })
  })

  // ── IPC 事件 ─────────────────────────────────────────────────────────────
  ipcMain.handle('updater:check', async () => {
    const now = Date.now()
    if (now - lastCheck < CHECK_INTERVAL) {
      log('跳过检查（距上次检查不足30分钟）')
      return { skipped: true, reason: 'too soon' }
    }
    lastCheck = now
    try {
      const result = await autoUpdater.checkForUpdates()
      return { checked: true, updateInfo: result?.updateInfo }
    } catch (err: any) {
      log('检查失败:', err.message)
      return { checked: false, error: err.message }
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      log('开始下载更新...')
      await autoUpdater.downloadUpdate()
      return { downloading: true }
    } catch (err: any) {
      log('下载失败:', err.message)
      return { error: err.message }
    }
  })

  ipcMain.handle('updater:install', () => {
    log('退出并安装更新...')
    autoUpdater.quitAndInstall(false, true) // showDialog=false, forceRunAfter=true
  })

  // 首次启动时自动检查（延迟2分钟）
  setTimeout(() => {
    log('启动时检查更新...')
    autoUpdater.checkForUpdates().catch((err: any) => {
      log('启动时检查失败（非致命）:', err.message)
    })
  }, 2 * 60 * 1000)
}
