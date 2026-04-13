// electron/menu.ts
// 自定义中文应用菜单

import { Menu, BrowserWindow, app, shell } from 'electron'

export function buildMenu(win: BrowserWindow): Menu {
  const tmpl: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '新建项目', accelerator: 'CmdOrCtrl+N', click: () => win.webContents.send('menu:new') },
        { type: 'separator' },
        { label: '导出代码', accelerator: 'CmdOrCtrl+E', click: () => win.webContents.send('menu:export') },
        { label: '导出布线图', click: () => win.webContents.send('menu:export-wiring') },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '切换开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'F11', role: 'togglefullscreen' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: '关于', click: () => {
          const { dialog } = require('electron')
          dialog.showMessageBox(win, {
            type: 'info',
            title: '关于 AI-BLOCKLY-IDE',
            message: 'AI-BLOCKLY-IDE v0.1.0',
            detail: '基于 Blockly 的 Arduino AI 生成工具\n\n支持多模型：SiliconFlow、DeepSeek、Qwen 等',
          })
        }},
        { type: 'separator' },
        { label: '访问 GitHub', click: () => shell.openExternal('https://github.com') },
      ],
    },
  ]

  return Menu.buildFromTemplate(tmpl)
}
