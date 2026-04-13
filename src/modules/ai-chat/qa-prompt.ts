// src/modules/ai-chat/qa-prompt.ts
// Q&A 答疑模式系统提示词
import type { AIProjectSchema } from '../../shared/types/project.schema'
import type { AgentStatus } from '../../store/app.store'
import type { AgentRole } from '../../shared/event-bus'

export interface QAContext {
  // 当前 Pipeline 状态
  pipelineRunning: boolean
  pipelinePhase: 'idle' | 'analyst' | 'architect' | 'programmer' | 'done' | 'error'
  lastError: string | null

  // 当前项目数据
  schema: AIProjectSchema | null
  arduinoCode: string
  sketchName: string

  // 编译状态
  compileRunning: boolean
  compileLogs: { level: string; text: string; ts: number }[]
  lastCompileOk: boolean | null
  lastUploadOk: boolean | null

  // Agent 耗时
  agentDurations: Partial<Record<AgentRole, number | null>>
}

function formatSchema(schema: AIProjectSchema): string {
  if (!schema) return '（当前无项目数据）'
  const comps = schema.components.map(c => {
    const pins = c.pins.map(p =>
      `  - ${p.name} (${p.type}${p.gpioNum !== undefined ? `, GPIO${p.gpioNum}` : ''})`
    ).join('\n')
    return `【${c.label}】${c.model}\n${pins}`
  }).join('\n\n')

  const conns = schema.connections.map(conn => {
    const src = schema.components.find(c => c.id === conn.source.componentId)
    const tgt = schema.components.find(c => c.id === conn.target.componentId)
    return `${src?.label ?? conn.source.componentId}:${conn.source.pinName} → ${tgt?.label ?? conn.target.componentId}:${conn.target.pinName} [${conn.wireColor ?? 'yellow'}]`
  }).join('\n')

  return `
【项目信息】
名称: ${schema.meta.name}
目标板: ${schema.meta.targetBoard}
描述: ${schema.meta.description}

【元器件清单】(${schema.components.length}个)
${comps}

【连接定义】(${schema.connections.length}条)
${conns}

【Blockly积木】(${schema.blocklyWorkspace.length}组)
`
}

function formatCompileLogs(logs: QAContext['compileLogs']): string {
  if (!logs.length) return '（无编译日志）'
  return logs.slice(-20).map(l =>
    `[${new Date(l.ts).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false })}] ${l.text}`
  ).join('\n')
}

function formatAgentStatus(phase: QAContext['pipelinePhase'], durations: QAContext['agentDurations']): string {
  if (phase === 'idle') return '当前无任务执行'
  if (phase === 'analyst') return '硬件分析师工作中...'
  if (phase === 'architect') return '电路架构师工作中...'
  if (phase === 'programmer') return '固件程序员工作中...'
  if (phase === 'done') {
    const parts = Object.entries(durations)
      .filter(([,v]) => v !== null)
      .map(([k, v]) => `${k}: ${v}ms`)
    return `Pipeline已完成 [${parts.join(', ')}]`
  }
  if (phase === 'error') return 'Pipeline执行出错'
  return '未知状态'
}

export function buildQASystemPrompt(): string {
  return `## 角色：硬件开发技术顾问

你是一个专业的硬件开发和嵌入式系统技术顾问，服务于 AI-Blockly-IDE 桌面 IDE 的用户。

## 能力范围

**你擅长的领域：**
- 电子元器件选型（ESP32/Arduino/传感器/执行器/显示器等）
- 硬件接线与引脚连接（I2C/SPI/UART/GPIO）
- Arduino/ESP32 固件编程（C++/Blockly）
- 电路原理图阅读与理解
- 面包板布局与实际接线
- 嘉立创 JLCPCB PCB 定制
- KiCad 原理图和 PCB 设计
- 编译错误诊断和修复
- AI-Blockly-IDE 系统使用指导

## 回答原则

1. **专业且实用**：给出具体引脚编号、代码示例、接线方案
2. **结合当前项目**：回答时参考用户当前项目的元器件和连接
3. **鼓励探索**：当用户想要扩展功能时，积极推荐合适的方案
4. **遇到不确定时**：明确说明，并给出最可能的建议

## 界面布局说明（供参考）

系统界面分四个区域：
- **左侧面板**：AI 对话 + Pipeline 状态栏（三个 Agent 阶段）
- **中间画布**：布线图（ReactFlow 功能视图）或 面包板视图（SVG 物理视图）
- **右侧面板**：编译状态 + BOM Tab（元件清单）+ 原理图 Tab（引脚连接）
- **顶部标题栏**：导入/导出 + 模型配置

## 重要规则

- 当用户描述接线问题时，要求知道具体的两个元器件、引脚名称、连接类型（I2C/SPI/电源等）
- 当用户问编译错误时，先看编译日志给出诊断
- 回答使用中文，保持专业但易懂
- 如果问题涉及具体代码，给出完整的代码片段
- 推荐元器件时，给出具体型号和购买关键词`
}

export interface QAUserPrompt {
  context: QAContext
  question: string
}

export function buildQAUserPrompt({ context, question }: QAUserPrompt): string {
  const schemaStr   = formatSchema(context.schema)
  const logsStr     = formatCompileLogs(context.compileLogs)
  const agentStatus = formatAgentStatus(context.pipelinePhase, context.agentDurations)
  const phaseLabel: Record<string, string> = {
    idle: '空闲', analyst: '分析元器件', architect: '设计连线',
    programmer: '编写代码', done: '已完成', error: '出错'
  }

  const compileStatus = context.compileRunning ? '编译中...'
    : context.lastCompileOk === true ? '最近：编译成功'
    : context.lastCompileOk === false ? '最近：编译失败'
    : '未编译'

  return `## 当前项目上下文

${schemaStr}

## 当前固件代码（Arduino/ESP32）
\`\`\`cpp
${context.arduinoCode || '（暂无代码）'}
\`\`\`

## Pipeline 状态
- 状态：${agentStatus}
- 阶段：${phaseLabel[context.pipelinePhase] ?? context.pipelinePhase}
- 当前任务：${context.pipelineRunning ? '执行中' : '空闲'}
${context.lastError ? `- 错误信息：${context.lastError}` : ''}

## 编译状态
- 状态：${compileStatus}
- 上传：${context.lastUploadOk === true ? '成功' : context.lastUploadOk === false ? '失败' : '未上传'}
${logsStr !== '（无编译日志）' ? `\n## 编译日志（最近20条）\n${logsStr}` : ''}

## 用户问题

${question}
`
}
