import type { AIProjectSchema, Component, Connection, PinDefinition } from '../../shared/types/project.schema'

type WireColor = NonNullable<Connection['wireColor']>

// 电源管理链路标准元件定义（当检测到电池/供电产品需求时自动注入）
const STANDARD_POWER_CHAIN: Omit<Component, 'id' | 'position'>[] = [
  {
    type: 'power',
    label: '锂电池',
    model: '3.7V LiPo',
    pins: [
      { name: 'VBAT+', type: 'power' },
      { name: 'VBAT-', type: 'ground' },
    ],
  },
  {
    type: 'power',
    label: '充电管理',
    model: 'TP4056',
    pins: [
      { name: 'VBAT+', type: 'power' },
      { name: 'OUT+', type: 'power' },
      { name: 'GND', type: 'ground' },
    ],
  },
  {
    type: 'power',
    label: '稳压器',
    model: 'AMS1117-3.3V',
    pins: [
      { name: 'VIN', type: 'power' },
      { name: 'VOUT', type: 'power' },
      { name: 'GND', type: 'ground' },
    ],
  },
]

let _powerCompIdCounter = 0
function makePowerCompId() {
  return `comp_power_${++_powerCompIdCounter}`
}

type PinMatcher = (pin: PinDefinition) => boolean

const COLOR_BY_GROUP: Record<string, WireColor> = {
  power: 'red',
  ground: 'black',
  sda: 'blue',
  scl: 'orange',
  tx: 'green',
  rx: 'white',
  spi: 'purple',
  signal: 'yellow',
}

function upper(value: string) {
  return value.toUpperCase()
}

function pinUpper(pin: Pick<PinDefinition, 'name'> | undefined) {
  return pin ? upper(pin.name) : ''
}

function componentUpper(component: Component) {
  return `${component.label} ${component.model}`.toUpperCase()
}

function hasText(value: string, words: string[]) {
  return words.some(word => value.includes(word))
}

function isPowerPin(pin: PinDefinition) {
  return pin.type === 'power' || /VCC|VIN|3V3|5V/.test(pinUpper(pin))
}

function isGroundPin(pin: PinDefinition) {
  return pin.type === 'ground' || /GND/.test(pinUpper(pin))
}

function isI2cSda(pin: PinDefinition) {
  return pin.type === 'i2c_sda' || pinUpper(pin).includes('SDA')
}

function isI2cScl(pin: PinDefinition) {
  return pin.type === 'i2c_scl' || pinUpper(pin).includes('SCL')
}

function isUartTx(pin: PinDefinition) {
  return pin.type === 'uart_tx' || pinUpper(pin).includes('TX')
}

function isUartRx(pin: PinDefinition) {
  return pin.type === 'uart_rx' || pinUpper(pin).includes('RX')
}

function isSpiPin(pin: PinDefinition) {
  return ['spi_mosi', 'spi_miso', 'spi_clk'].includes(pin.type)
}

function isSignalPin(pin: PinDefinition) {
  return !isPowerPin(pin) && !isGroundPin(pin)
}

function firstPin(component: Component, matcher: PinMatcher) {
  return component.pins.find(matcher)
}

function bestMcuPin(mcu: Component, matcher: PinMatcher, fallbackMatchers: PinMatcher[] = []) {
  return firstPin(mcu, matcher) ?? fallbackMatchers.map(fn => firstPin(mcu, fn)).find(Boolean)
}

function detectSignalGroup(pin: PinDefinition): keyof typeof COLOR_BY_GROUP {
  if (isPowerPin(pin)) return 'power'
  if (isGroundPin(pin)) return 'ground'
  if (isI2cSda(pin)) return 'sda'
  if (isI2cScl(pin)) return 'scl'
  if (isUartTx(pin)) return 'tx'
  if (isUartRx(pin)) return 'rx'
  if (isSpiPin(pin)) return 'spi'
  return 'signal'
}

function makeKey(sourceId: string, sourcePin: string, targetId: string, targetPin: string) {
  const a = `${sourceId}:${sourcePin}`
  const b = `${targetId}:${targetPin}`
  return [a, b].sort().join('->')
}

function choosePin(component: Component, matchers: PinMatcher[]) {
  for (const matcher of matchers) {
    const pin = firstPin(component, matcher)
    if (pin) return pin
  }
  return undefined
}

function signalMatchersForComponent(component: Component): PinMatcher[] {
  const text = componentUpper(component)

  if (hasText(text, ['OLED', 'SSD1306', 'SCREEN', 'DISPLAY', 'LCD'])) {
    return [isI2cSda, isI2cScl]
  }

  if (hasText(text, ['MIC', 'MICROPHONE', 'INMP441'])) {
    return [
      pin => hasText(pinUpper(pin), ['SD', 'DOUT', 'DATA']),
      pin => hasText(pinUpper(pin), ['SCK', 'BCLK', 'CLK']),
      pin => hasText(pinUpper(pin), ['WS', 'LRCL', 'LRC']),
    ]
  }

  if (hasText(text, ['AMP', 'MAX98357', 'AUDIO', 'DAC'])) {
    return [
      pin => hasText(pinUpper(pin), ['DIN', 'DATA']),
      pin => hasText(pinUpper(pin), ['BCLK', 'SCK', 'CLK']),
      pin => hasText(pinUpper(pin), ['LRC', 'LRCK', 'WS']),
    ]
  }

  if (hasText(text, ['BUTTON', 'KEY', 'SWITCH'])) {
    return [pin => hasText(pinUpper(pin), ['SIG', 'OUT', 'IO']), pin => isSignalPin(pin)]
  }

  return [pin => isSignalPin(pin) && !isI2cSda(pin) && !isI2cScl(pin), isI2cSda, isI2cScl, isUartTx, isUartRx]
}

function mcuMatchersForPeripheralPin(pin: PinDefinition, peripheral: Component): PinMatcher[] {
  const p = pinUpper(pin)
  const c = componentUpper(peripheral)

  if (isI2cSda(pin)) return [isI2cSda, mcuPin => mcuPin.gpioNum === 21]
  if (isI2cScl(pin)) return [isI2cScl, mcuPin => mcuPin.gpioNum === 22]
  if (isUartTx(pin)) return [isUartRx, mcuPin => mcuPin.type === 'digital']
  if (isUartRx(pin)) return [isUartTx, mcuPin => mcuPin.type === 'digital']

  if (hasText(c, ['MIC', 'MICROPHONE', 'INMP441'])) {
    if (hasText(p, ['SD', 'DOUT', 'DATA'])) return [mcuPin => hasText(pinUpper(mcuPin), ['DIN', 'DATA', 'DOUT']), mcuPin => mcuPin.type === 'digital']
    if (hasText(p, ['SCK', 'BCLK', 'CLK'])) return [mcuPin => hasText(pinUpper(mcuPin), ['BCLK', 'SCK', 'CLK']), mcuPin => mcuPin.type === 'digital']
    if (hasText(p, ['WS', 'LRCL', 'LRC'])) return [mcuPin => hasText(pinUpper(mcuPin), ['WS', 'LRCK', 'LRC']), mcuPin => mcuPin.type === 'digital']
  }

  if (hasText(c, ['AMP', 'MAX98357', 'AUDIO', 'DAC'])) {
    if (hasText(p, ['DIN', 'DATA'])) return [mcuPin => hasText(pinUpper(mcuPin), ['DOUT', 'DATA', 'DIN']), mcuPin => mcuPin.type === 'digital']
    if (hasText(p, ['BCLK', 'SCK', 'CLK'])) return [mcuPin => hasText(pinUpper(mcuPin), ['BCLK', 'SCK', 'CLK']), mcuPin => mcuPin.type === 'digital']
    if (hasText(p, ['LRC', 'LRCK', 'WS'])) return [mcuPin => hasText(pinUpper(mcuPin), ['LRC', 'LRCK', 'WS']), mcuPin => mcuPin.type === 'digital']
  }

  if (hasText(c, ['BUTTON', 'KEY', 'SWITCH'])) {
    return [mcuPin => mcuPin.type === 'digital', isUartRx, isUartTx]
  }

  return [
    mcuPin => pinUpper(mcuPin) === p,
    mcuPin => mcuPin.type === pin.type,
    mcuPin => mcuPin.type === 'digital' || mcuPin.type === 'analog',
  ]
}

export function normalizeConnections(schema: AIProjectSchema): AIProjectSchema {
  const mcuBase = schema.components.find(comp => comp.type === 'mcu')
  if (!mcuBase) return schema

  const dedup = new Map<string, Connection>()
  let index = 1
  const planIdByKey = new Map<string, string>()
  let mcu: Component = mcuBase

  const add = (source: Component, sourcePin: PinDefinition, target: Component, targetPin: PinDefinition, preferredColor?: WireColor, planId?: string) => {
    const key = makeKey(source.id, sourcePin.name, target.id, targetPin.name)
    if (dedup.has(key)) return
    const color = preferredColor ?? COLOR_BY_GROUP[detectSignalGroup(sourcePin)] ?? 'yellow'
    if (planId) planIdByKey.set(key, planId)
    dedup.set(key, {
      id: `wire_${index++}`,
      source: { componentId: source.id, pinName: sourcePin.name },
      target: { componentId: target.id, pinName: targetPin.name },
      wireColor: color,
      derivedFromPlanId: planIdByKey.get(key),
    })
  }

  // ── Step 1: 注入缺失的电源管理链路 ──
  const hasPowerChain = schema.components.some(comp =>
    comp.type === 'power' && /tp4056|ams1117|li(po|thium)|battery/i.test(comp.model)
  )

  if (!hasPowerChain) {
    const batteryId = makePowerCompId()
    const tp4056Id = makePowerCompId()
    const ams1117Id = makePowerCompId()

    const battery: Component = { ...STANDARD_POWER_CHAIN[0], id: batteryId }
    const tp4056: Component = { ...STANDARD_POWER_CHAIN[1], id: tp4056Id }
    const ams1117: Component = { ...STANDARD_POWER_CHAIN[2], id: ams1117Id }

    // 电源链路内部连线: 电池→TP4056→AMS1117
    const bVbatPos = battery.pins.find(p => p.name === 'VBAT+')!
    const bVbatNeg = battery.pins.find(p => p.name === 'VBAT-')!
    const tVbat = tp4056.pins.find(p => p.name === 'VBAT+')!
    const tOut = tp4056.pins.find(p => p.name === 'OUT+')!
    const tGnd = tp4056.pins.find(p => p.name === 'GND')!
    const aVin = ams1117.pins.find(p => p.name === 'VIN')!
    const aVout = ams1117.pins.find(p => p.name === 'VOUT')!
    const aGnd = ams1117.pins.find(p => p.name === 'GND')!

    add(battery, bVbatPos, tp4056, tVbat, 'red')
    add(battery, bVbatNeg, tp4056, tGnd, 'black')
    add(tp4056, tOut, ams1117, aVin, 'red')
    add(tp4056, tGnd, ams1117, aGnd, 'black')

    // 将注入的元件加入 schema（电池、TP4056、AMS1117 放在最前面）
    const injected: Component[] = [battery, tp4056, ams1117]
    schema = { ...schema, components: [...injected, ...schema.components] }

    // 为 MCU 扩展 VOUT_AMS1117（主电源轨）/ GND_RAIL（共地）引脚
    // 这样 auto-fill 会把其他元件的 VCC 接入这个电源轨
    const mcuPowerPin: PinDefinition = { name: 'VOUT_AMS1117', type: 'power' }
    const mcuGroundPin: PinDefinition = { name: 'GND_RAIL', type: 'ground' }
    const mcuWithExtPower: Component = {
      ...mcu,
      pins: [...mcu.pins, mcuPowerPin, mcuGroundPin],
    }
    const updatedComponents = schema.components.map(c => c.id === mcu.id ? mcuWithExtPower : c)
    schema = { ...schema, components: updatedComponents }
    mcu = mcuWithExtPower

    // AMS1117 VOUT/GND 正式作为 MCU 的外部电源接口
    add(ams1117, aVout, mcu, mcuPowerPin, 'red')
    add(ams1117, aGnd, mcu, mcuGroundPin, 'black')
  }

  for (const plan of schema.connectionPlan ?? []) {
    const sourceComp = schema.components.find(comp => comp.id === plan.fromComponentId)
    const targetComp = schema.components.find(comp => comp.id === plan.toComponentId)
    const sourcePin = sourceComp?.pins.find(pin => pin.name === plan.sourcePin)
    const targetPin = targetComp?.pins.find(pin => pin.name === plan.targetPin)
    if (!sourceComp || !targetComp || !sourcePin || !targetPin) continue

    const color = plan.kind === 'power'
      ? 'red'
      : plan.kind === 'ground'
        ? 'black'
        : COLOR_BY_GROUP[detectSignalGroup(sourcePin)] ?? 'yellow'

    add(sourceComp, sourcePin, targetComp, targetPin, color, plan.id)
  }

  for (const conn of schema.connections ?? []) {
    const sourceComp = schema.components.find(comp => comp.id === conn.source.componentId)
    const targetComp = schema.components.find(comp => comp.id === conn.target.componentId)
    const sourcePin = sourceComp?.pins.find(pin => pin.name === conn.source.pinName)
    const targetPin = targetComp?.pins.find(pin => pin.name === conn.target.pinName)
    if (!sourceComp || !targetComp || !sourcePin || !targetPin) continue
    add(sourceComp, sourcePin, targetComp, targetPin, conn.wireColor, conn.derivedFromPlanId)
  }

  // ── Always auto-fill ALL missing connections (power + ground + signal) ──
  const mcuPower = bestMcuPin(mcu, isPowerPin)
  const mcuGround = bestMcuPin(mcu, isGroundPin)
  const digitalCandidates = mcu.pins.filter(pin =>
    pin.type === 'digital' || pin.type === 'analog' ||
    pin.type === 'uart_tx' || pin.type === 'uart_rx' ||
    /TX|RX/i.test(pin.name)
  )
  const usedMcuPins = new Set<string>()
  let digitalCursor = 0

  const reservePin = (pin: PinDefinition | undefined) => {
    if (pin) usedMcuPins.add(pin.name)
    return pin
  }

  const nextMcuSignalPin = () => {
    while (digitalCursor < digitalCandidates.length && usedMcuPins.has(digitalCandidates[digitalCursor].name)) {
      digitalCursor += 1
    }
    const pin = digitalCandidates[digitalCursor]
      ?? digitalCandidates.find(candidate => !usedMcuPins.has(candidate.name))
      ?? mcu.pins.find(isSignalPin)
    if (pin) {
      usedMcuPins.add(pin.name)
      digitalCursor += 1
    }
    return pin
  }

  reservePin(mcuPower)
  reservePin(mcuGround)

  for (const comp of schema.components.filter(comp => comp.id !== mcu.id)) {
    const powerPins = comp.pins.filter(isPowerPin)
    const groundPins = comp.pins.filter(isGroundPin)
    const signalPins = comp.pins.filter(isSignalPin)

    // Always add power & ground
    powerPins.forEach(pin => { if (mcuPower) add(comp, pin, mcu, mcuPower, 'red') })
    groundPins.forEach(pin => { if (mcuGround) add(comp, pin, mcu, mcuGround, 'black') })

    // Auto-generate signal connections for ALL signal pins
    const preferredSignalPin = choosePin(comp, signalMatchersForComponent(comp))
    const orderedSignalPins = preferredSignalPin
      ? [preferredSignalPin, ...signalPins.filter(pin => pin.name !== preferredSignalPin.name)]
      : signalPins

    orderedSignalPins.forEach(pin => {
      const preferredMcu = choosePin(mcu, mcuMatchersForPeripheralPin(pin, comp).filter(Boolean))
      const target = preferredMcu && !usedMcuPins.has(preferredMcu.name)
        ? reservePin(preferredMcu)
        : nextMcuSignalPin()
      if (!target) return
      add(comp, pin, mcu, target, COLOR_BY_GROUP[detectSignalGroup(pin)] ?? 'yellow')
    })
  }

  return {
    ...schema,
    connections: Array.from(dedup.values()),
  }
}
