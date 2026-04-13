// src/modules/ai-chat/pipeline-guard.ts
import type { AIProjectSchema } from '../../shared/types/project.schema'

const BLOCKED = [
  /nuclear/i, /reactor/i, /fission/i, /fusion/i, /plutonium/i,
  /explosive/i, /detonator/i, /weapon/i, /missile/i, /bomb/i,
  /核/,/反应堆/,/炸弹/,/武器/,/导弹/,/雷管/,/爆炸物/,
]

export interface GuardResult { ok: boolean; reason?: string }

export function validateAnalystOutput(schema: Partial<AIProjectSchema>): GuardResult {
  const comps = schema.components ?? []

  if (comps.length === 0) {
    const hint = schema.meta?.name
      ? ` 元器件列表为空（meta.name="${schema.meta.name}"）。`
      : ` AI 返回的 JSON 中 components 数组为空。请检查 AI 是否正确理解了需求。`
    return { ok: false, reason: `Analyst 未返回任何元器件，无法确定硬件需求。${hint}` }
  }

  if (!comps.some(c => c.type === 'mcu'))
    return { ok: false, reason: '未检测到主控芯片（MCU），每个项目至少需要一个 MCU。' }

  if (comps.length > 20)
    return { ok: false, reason: `元器件数量 (${comps.length}) 超过上限 20。` }

  for (const comp of comps) {
    for (const pat of BLOCKED) {
      if (pat.test(comp.label) || pat.test(comp.model)) {
        return {
          ok: false,
          reason: `检测到受限元器件："${comp.label}" (${comp.model})。本系统仅支持标准嵌入式电子元器件。`,
        }
      }
    }
  }

  return { ok: true }
}
