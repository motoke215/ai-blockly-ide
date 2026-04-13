import type { AIProjectSchema, BlocklyNode, ConnectionPlanItem, InterfacePlan } from '../../shared/types/project.schema'

export interface ValidationIssue {
  id: string
  level: 'error' | 'warn' | 'info'
  category: 'requirements' | 'roles' | 'interfaces' | 'connections' | 'blockly'
  message: string
}

export interface SchemaValidationResult {
  ok: boolean
  score: number
  issues: ValidationIssue[]
  summary: {
    errors: number
    warnings: number
    infos: number
  }
}

function normalize(text: string) {
  return text.trim().toLowerCase()
}

function words(text: string) {
  return normalize(text)
    .replace(/[()（）,，.。:：;；/\\_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function includesAny(text: string, tokens: string[]) {
  const hay = normalize(text)
  return tokens.some(token => hay.includes(normalize(token)))
}

function collectBlocklyTypes(nodes: BlocklyNode[]): string[] {
  const acc: string[] = []
  const walk = (node?: BlocklyNode) => {
    if (!node) return
    acc.push(node.blockType)
    Object.values(node.inputs ?? {}).forEach(child => walk(child))
    walk(node.next)
  }
  nodes.forEach(node => walk(node))
  return acc
}

function planKey(plan: Pick<ConnectionPlanItem, 'fromComponentId' | 'toComponentId' | 'sourcePin' | 'targetPin'>) {
  const a = `${plan.fromComponentId}:${plan.sourcePin}`
  const b = `${plan.toComponentId}:${plan.targetPin}`
  return [a, b].sort().join('->')
}

function interfaceSignalCount(interfaces: InterfacePlan[]) {
  return interfaces.reduce((sum, item) => sum + item.signals.length, 0)
}

export function validateProjectSchema(schema: AIProjectSchema): SchemaValidationResult {
  const issues: ValidationIssue[] = []
  const add = (level: ValidationIssue['level'], category: ValidationIssue['category'], message: string) => {
    issues.push({ id: `${category}_${issues.length + 1}`, level, category, message })
  }

  const isPowerPin = (name: string) => /VCC|VIN|3V3|5V/i.test(name)
  const isGroundPin = (name: string) => /GND/i.test(name)
  const isI2cPin = (name: string) => /SDA|SCL/i.test(name)
  const isUartPin = (name: string) => /TX|RX/i.test(name)
  const isI2sPin = (name: string) => /BCLK|SCK|WS|LRCK|LRC|DIN|DOUT|SD/i.test(name)

  const requirementTexts = [
    schema.requirements.summary,
    ...schema.requirements.coreFunctions,
    ...schema.requirements.inputs.map(item => `${item.name} ${item.purpose}`),
    ...schema.requirements.outputs.map(item => `${item.name} ${item.purpose}`),
    ...schema.requirements.interactions,
    ...schema.requirements.communication,
    ...schema.requirements.power,
    ...schema.requirements.constraints,
  ].filter(Boolean)

  if (!schema.requirements.summary.trim()) {
    add('error', 'requirements', '缺少 requirements.summary，无法说明产品说明被如何结构化。')
  }

  if (schema.requirements.coreFunctions.length === 0) {
    add('error', 'requirements', '缺少 coreFunctions，产品核心功能未形成结构化列表。')
  }

  if (schema.functionalRoles.length === 0) {
    add('error', 'roles', '缺少 functionalRoles，元件没有被赋予明确职责。')
  }

  const roleComponentIds = new Set(schema.functionalRoles.map(role => role.componentId))
  schema.components.forEach(component => {
    if (!roleComponentIds.has(component.id)) {
      add('warn', 'roles', `元件 ${component.label} 未在 functionalRoles 中出现，可能仍是“只入清单不入逻辑”的孤立元件。`)
    }
  })

  schema.functionalRoles.forEach(role => {
    const component = schema.components.find(item => item.id === role.componentId)
    if (!component) {
      add('error', 'roles', `functionalRole ${role.id} 指向不存在的元件 ${role.componentId}。`)
      return
    }
    if (!role.requiredSignals.length) {
      add('warn', 'roles', `${component.label} 的功能角色未声明 requiredSignals。`)
    }
    const roleText = `${role.role} ${role.responsibility} ${role.requiredSignals.join(' ')}`
    if (requirementTexts.length > 0 && !requirementTexts.some(text => includesAny(roleText, words(text).slice(0, 8)))) {
      add('info', 'roles', `${component.label} 的职责描述与需求文本关联较弱，建议人工确认是否真由产品说明推出。`)
    }
  })

  if (schema.interfacePlan.length === 0) {
    add('error', 'interfaces', '缺少 interfacePlan，尚未形成接口规划。')
  }

  schema.interfacePlan.forEach(plan => {
    if (plan.participants.length < 2) {
      add('warn', 'interfaces', `接口计划 ${plan.id} 参与方不足 2 个。`)
    }
    if (plan.signals.length === 0) {
      add('error', 'interfaces', `接口计划 ${plan.id} 未声明任何 signal。`)
    }
    plan.signals.forEach(signal => {
      const fromComp = schema.components.find(item => item.id === signal.fromComponentId)
      const toComp = schema.components.find(item => item.id === signal.toComponentId)
      if (!fromComp || !toComp) {
        add('error', 'interfaces', `接口计划 ${plan.id} 存在指向不存在元件的 signal ${signal.name}。`)
        return
      }
      if (!fromComp.pins.some(pin => pin.name === signal.fromPin)) {
        add('error', 'interfaces', `${fromComp.label} 不存在接口计划中引用的引脚 ${signal.fromPin}。`)
      }
      if (!toComp.pins.some(pin => pin.name === signal.toPin)) {
        add('error', 'interfaces', `${toComp.label} 不存在接口计划中引用的引脚 ${signal.toPin}。`)
      }
    })
  })

  if (schema.connectionPlan.length === 0) {
    add('error', 'connections', '缺少 connectionPlan，接线没有逻辑计划层。')
  }

  const concreteConnectionKeys = new Set(schema.connections.map(conn => {
    const a = `${conn.source.componentId}:${conn.source.pinName}`
    const b = `${conn.target.componentId}:${conn.target.pinName}`
    return [a, b].sort().join('->')
  }))

  schema.connectionPlan.forEach(plan => {
    const fromComp = schema.components.find(item => item.id === plan.fromComponentId)
    const toComp = schema.components.find(item => item.id === plan.toComponentId)
    if (!fromComp || !toComp) {
      add('error', 'connections', `connectionPlan ${plan.id} 指向不存在的元件。`)
      return
    }
    if (!fromComp.pins.some(pin => pin.name === plan.sourcePin)) {
      add('error', 'connections', `${fromComp.label} 不存在连接计划中引用的引脚 ${plan.sourcePin}。`)
    }
    if (!toComp.pins.some(pin => pin.name === plan.targetPin)) {
      add('error', 'connections', `${toComp.label} 不存在连接计划中引用的引脚 ${plan.targetPin}。`)
    }
    if (!concreteConnectionKeys.has(planKey(plan))) {
      add(plan.required ? 'error' : 'warn', 'connections', `连接计划 ${plan.id} 未落实为最终 connections。`)
    }
  })

  if (schema.connections.length === 0) {
    add('error', 'connections', '最终 connections 为空，无法形成接线图。')
  }

  const blockTypes = collectBlocklyTypes(schema.blocklyWorkspace)
  if (schema.blocklyWorkspace.length === 0) {
    add('warn', 'blockly', 'blocklyWorkspace 为空，尚未形成程序逻辑。')
  }

  if (schema.requirements.outputs.some(item => includesAny(`${item.name} ${item.purpose}`, ['oled', 'display'])) && !blockTypes.some(type => type.startsWith('oled_'))) {
    add('warn', 'blockly', '需求中存在显示输出，但 Blockly 中未发现 OLED 相关积木。')
  }

  if (schema.requirements.inputs.some(item => includesAny(`${item.name} ${item.purpose}`, ['dht', 'temperature', 'humidity'])) && !blockTypes.some(type => type.startsWith('dht_'))) {
    add('warn', 'blockly', '需求中存在温湿度采集，但 Blockly 中未发现 DHT 相关积木。')
  }

  const coveredComponents = new Set<string>()
  schema.interfacePlan.forEach(plan => plan.participants.forEach(id => coveredComponents.add(id)))
  schema.connectionPlan.forEach(plan => { coveredComponents.add(plan.fromComponentId); coveredComponents.add(plan.toComponentId) })

  schema.components.filter(comp => comp.type !== 'mcu').forEach(comp => {
    if (!coveredComponents.has(comp.id)) {
      add('warn', 'connections', `${comp.label} 未出现在 interfacePlan 或 connectionPlan 中，说明它没有进入完整逻辑链。`)
    }

    const planPins = new Set(
      schema.connectionPlan.flatMap(plan => {
        if (plan.fromComponentId === comp.id) return [plan.sourcePin]
        if (plan.toComponentId === comp.id) return [plan.targetPin]
        return []
      })
    )

    const pinNames = comp.pins.map(pin => pin.name)
    const hasPower = pinNames.some(isPowerPin)
    const hasGround = pinNames.some(isGroundPin)
    if (hasPower && !pinNames.filter(isPowerPin).every(name => planPins.has(name))) {
      add('error', 'connections', `${comp.label} 的电源引脚未被完整展开到 connectionPlan。`)
    }
    if (hasGround && !pinNames.filter(isGroundPin).every(name => planPins.has(name))) {
      add('error', 'connections', `${comp.label} 的地线引脚未被完整展开到 connectionPlan。`)
    }

    const i2cPins = pinNames.filter(isI2cPin)
    if (i2cPins.length > 0 && !i2cPins.every(name => planPins.has(name))) {
      add('error', 'interfaces', `${comp.label} 存在 I2C 引脚但未完整展开 SDA/SCL。`)
    }

    const uartPins = pinNames.filter(isUartPin)
    if (uartPins.length >= 2 && !uartPins.every(name => planPins.has(name))) {
      add('warn', 'interfaces', `${comp.label} 存在 UART 引脚但未完整展开 TX/RX。`)
    }

    const i2sPins = pinNames.filter(isI2sPin)
    if (i2sPins.length >= 2 && !i2sPins.every(name => planPins.has(name))) {
      add('warn', 'interfaces', `${comp.label} 存在音频/I2S 引脚但未完整展开时钟/数据线。`)
    }
  })

  if (schema.interfacePlan.length > 0 && schema.connectionPlan.length > 0 && interfaceSignalCount(schema.interfacePlan) > schema.connectionPlan.length) {
    add('info', 'interfaces', 'interfacePlan 的 signal 数量多于 connectionPlan，建议检查是否有部分接口约束未下沉为接线计划。')
  }

  const errors = issues.filter(issue => issue.level === 'error').length
  const warnings = issues.filter(issue => issue.level === 'warn').length
  const infos = issues.filter(issue => issue.level === 'info').length
  const score = Math.max(0, 100 - errors * 18 - warnings * 7 - infos * 2)

  return {
    ok: errors === 0,
    score,
    issues,
    summary: { errors, warnings, infos },
  }
}

