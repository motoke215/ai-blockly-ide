export interface AIProjectSchema {
  meta: ProjectMeta; components: Component[]
  connections: Connection[]; blocklyWorkspace: BlocklyNode[]
}
export interface ProjectMeta {
  id: string; name: string; description: string
  targetBoard: 'esp32'|'esp32s3'|'arduino-uno'|'arduino-nano'
}
export interface Component {
  id: string; type: ComponentType; label: string; model: string
  pins: PinDefinition[]; position?: { x: number; y: number }
}
export type ComponentType = 'mcu'|'sensor'|'actuator'|'display'|'power'|'passive'
export interface PinDefinition {
  name: string
  type: 'power'|'ground'|'digital'|'analog'|'i2c_sda'|'i2c_scl'|'spi_mosi'|'spi_miso'|'spi_clk'|'uart_tx'|'uart_rx'
  gpioNum?: number
}
export interface Connection {
  id: string; source: WireEndpoint; target: WireEndpoint; wireColor?: string
}
export interface WireEndpoint { componentId: string; pinName: string }
export interface BlocklyNode {
  id: string; blockType: string
  fields?: Record<string, string|number>
  inputs?: Record<string, BlocklyNode>
  next?: BlocklyNode
}
