export interface AIProjectSchema {
  meta: ProjectMeta
  requirements: ProjectRequirements
  components: Component[]
  functionalRoles: FunctionalRole[]
  interfacePlan: InterfacePlan[]
  connectionPlan: ConnectionPlanItem[]
  connections: Connection[]
  blocklyWorkspace: BlocklyNode[]
}

export interface ProjectMeta {
  id: string
  name: string
  description: string
  targetBoard: 'esp32'|'esp32s3'|'arduino-uno'|'arduino-nano'
}

export interface ProjectRequirements {
  summary: string
  coreFunctions: string[]
  inputs: RequirementItem[]
  outputs: RequirementItem[]
  interactions: string[]
  communication: string[]
  power: string[]
  constraints: string[]
}

export interface RequirementItem {
  name: string
  purpose: string
}

export interface Component {
  id: string
  type: ComponentType
  label: string
  model: string
  pins: PinDefinition[]
  position?: { x: number; y: number }
}

export type ComponentType = 'mcu'|'sensor'|'actuator'|'display'|'power'|'passive'

export interface PinDefinition {
  name: string
  type: 'power'|'ground'|'digital'|'analog'|'i2c_sda'|'i2c_scl'|'spi_mosi'|'spi_miso'|'spi_clk'|'uart_tx'|'uart_rx'
  gpioNum?: number
}

export interface FunctionalRole {
  id: string
  componentId: string
  role: string
  responsibility: string
  requiredSignals: string[]
}

export interface InterfacePlan {
  id: string
  busType: 'power'|'gpio'|'i2c'|'spi'|'uart'|'i2s'|'analog'
  participants: string[]
  signals: InterfaceSignal[]
  rationale: string
}

export interface InterfaceSignal {
  name: string
  fromComponentId: string
  toComponentId: string
  fromPin: string
  toPin: string
  required: boolean
}

export interface ConnectionPlanItem {
  id: string
  kind: 'power'|'ground'|'signal'|'bus'
  fromComponentId: string
  toComponentId: string
  signal: string
  sourcePin: string
  targetPin: string
  required: boolean
  rationale: string
}

export interface Connection {
  id: string
  source: WireEndpoint
  target: WireEndpoint
  wireColor?: string
  derivedFromPlanId?: string
}

export interface WireEndpoint {
  componentId: string
  pinName: string
}

export interface BlocklyNode {
  id: string
  blockType: string
  fields?: Record<string, string|number>
  inputs?: Record<string, BlocklyNode>
  next?: BlocklyNode
}
