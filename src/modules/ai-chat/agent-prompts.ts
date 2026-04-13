// src/modules/ai-chat/agent-prompts.ts
import type { AgentRole } from '../../shared/event-bus'

const SCHEMA_CONTRACT = `
Output ONLY valid JSON matching this structure (no markdown, no preamble):
{
  "meta": { "id":"string","name":"string","description":"string","targetBoard":"esp32"|"esp32s3"|"arduino-uno"|"arduino-nano" },
  "components": [{ "id":"comp_{type}_{n}","type":"mcu"|"sensor"|"actuator"|"display"|"power"|"passive","label":"string","model":"string",
    "pins":[{"name":"string","type":"power"|"ground"|"digital"|"analog"|"i2c_sda"|"i2c_scl"|"spi_mosi"|"spi_miso"|"spi_clk"|"uart_tx"|"uart_rx","gpioNum":number}] }],
  "connections": [{"id":"wire_N","source":{"componentId":"string","pinName":"string"},"target":{"componentId":"string","pinName":"string"},"wireColor":"red"|"black"|"yellow"|"blue"|"orange"|"green"|"white"|"purple"}],
  "blocklyWorkspace": [{"id":"blk_N","blockType":"string","fields":{},"inputs":{},"next":null}]
}`

export const AGENT_META: Record<AgentRole, { label: string; description: string; color: string; icon: string; systemPrompt: string }> = {
  analyst: {
    label: '硬件分析师', description: '解析需求·选型元器件', color: '#60a5fa', icon: '◈',
    systemPrompt: `You are a hardware component selector. Fill ONLY "meta" and "components". Leave "connections":[] and "blocklyWorkspace":[].
Rules: Always include exactly one MCU. Default to ESP32-WROOM-32. Include all required pins (VCC,GND,signal).
${SCHEMA_CONTRACT}`,
  },
  architect: {
    label: '电路架构师', description: '引脚映射·生成连线图', color: '#fb923c', icon: '⬡',
    systemPrompt: `You are a circuit architect. Fill ONLY "connections" based on the existing components. Do NOT modify other fields.
Rules: VCC→3V3/5V, GND→GND. I2C SDA→GPIO21, SCL→GPIO22. UART TX→GPIO1, RX→GPIO3. Digital→GPIO4/5/12/13/25/26.
WireColor: red=VCC, black=GND, yellow=digital, blue=SDA, orange=SCL, green=TX, white=RX, purple=SPI.
${SCHEMA_CONTRACT}`,
  },
  programmer: {
    label: '固件程序员', description: '生成Blockly·编写逻辑', color: '#4ade80', icon: '◉',
    systemPrompt: `You are a firmware programmer. Fill ONLY "blocklyWorkspace". Use only these blockTypes:
controls_setup_loop, gpio_set_mode, gpio_digital_write, gpio_digital_read, gpio_analog_write,
time_delay_ms, serial_begin, serial_print, serial_println,
dht_read_temperature, dht_read_humidity, ds18b20_read_temp,
oled_begin, oled_clear, oled_print, oled_display,
variables_set, variables_get, math_number, controls_if, logic_compare.
Use "next" for sequential blocks, "inputs" for nested blocks.
${SCHEMA_CONTRACT}`,
  },
}
