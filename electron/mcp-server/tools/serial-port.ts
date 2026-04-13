// electron/mcp-server/tools/serial-port.ts
// 串口功能暂未启用（移除了 serialport 依赖以避免 C++ 编译要求）
// 需要串口功能时：npm install serialport @serialport/parser-readline 并还原此文件

import { EventEmitter } from 'node:events'

export class SerialService extends EventEmitter {
  async open(_path: string, _baud = 115200): Promise<void> {
    this.emit('error', new Error('Serial port not available in this build'))
  }
  async close(): Promise<void> {}
  async write(_data: string): Promise<void> {
    throw new Error('Serial port not available in this build')
  }
  async listPorts(): Promise<string[]> { return [] }
  isOpen(): boolean { return false }
}

export const serialService = new SerialService()
