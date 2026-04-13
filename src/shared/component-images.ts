// src/shared/component-images.ts
// 元器件产品图片映射表
// 使用 Seeed Studio / 各厂商官方 CDN 图片，加载失败自动降级为 CSS 节点

export const COMPONENT_IMAGES: Record<string, string> = {
  // ── MCU ──────────────────────────────────────────────────────────────
  'ESP32-WROOM-32':
    'https://files.seeedstudio.com/wiki/esp32/ESP32-WROOM-32D.jpg',
  'ESP32-S3':
    'https://files.seeedstudio.com/wiki/SeeedStudio-XIAO-ESP32S3/img/xiaoesp32s3.jpg',
  'XIAO ESP32S3':
    'https://files.seeedstudio.com/wiki/SeeedStudio-XIAO-ESP32S3/img/xiaoesp32s3.jpg',
  'Arduino Uno':
    'https://store.arduino.cc/cdn/shop/products/A000066_03.front_1000x750.jpg',
  'Arduino Nano':
    'https://store.arduino.cc/cdn/shop/products/A000005_03.front_1000x750.jpg',

  // ── 传感器 ────────────────────────────────────────────────────────────
  'DHT22':
    'https://files.seeedstudio.com/wiki/Grove-Temperature_and_Humidity_Sensor_Pro/img/Temperature_humidity_sensor_pro.jpg',
  'DHT22 / AM2302':
    'https://files.seeedstudio.com/wiki/Grove-Temperature_and_Humidity_Sensor_Pro/img/Temperature_humidity_sensor_pro.jpg',
  'DHT11':
    'https://files.seeedstudio.com/wiki/Grove-TemperatureAndHumidity_Sensor/img/list.jpg',
  'DS18B20':
    'https://files.seeedstudio.com/wiki/One-Wire-Temperature/img/One-Wire-Temperature-wiki.jpg',
  'HC-SR04':
    'https://files.seeedstudio.com/wiki/Grove_Ultrasonic_Ranger/img/Ultrasonic_Ranger.jpg',
  'MPU-6050':
    'https://files.seeedstudio.com/wiki/Grove-6-Axis_AccelerometerAndGyroscope/img/Grove-6-Axis_AccelerometerAndGyroscope_product_view_1200_s.jpg',
  'BMP280':
    'https://files.seeedstudio.com/wiki/Grove-Barometer_Sensor-BMP280/img/Grove-Barometer_Sensor-BMP280-700_S.jpg',
  'MQ-2':
    'https://files.seeedstudio.com/wiki/Grove-Gas_Sensor-MQ2/img/Twig-Gas_Sensor.bmp',
  'PIR':
    'https://files.seeedstudio.com/wiki/Grove_PIR_Motion_Sensor/img/Grove_-_PIR_Motion_Sensor.jpg',
  'LDR':
    'https://files.seeedstudio.com/wiki/Grove-Light_Sensor/img/cover.jpg',

  // ── 显示屏 ────────────────────────────────────────────────────────────
  'SSD1306 0.96"':
    'https://files.seeedstudio.com/wiki/Grove-OLED-Display-0.96-SSD1306/img/Grove-OLED-Display-0.96-SSD1306-wiki.jpg',
  'SSD1306':
    'https://files.seeedstudio.com/wiki/Grove-OLED-Display-0.96-SSD1306/img/Grove-OLED-Display-0.96-SSD1306-wiki.jpg',
  'ST7735':
    'https://files.seeedstudio.com/wiki/1.8-Inch-LCD-Display-Module/img/wiki.png',

  // ── 执行器 ────────────────────────────────────────────────────────────
  'Servo SG90':
    'https://files.seeedstudio.com/wiki/Grove-Servo/img/Grove_Servo_01.jpg',
  'Relay':
    'https://files.seeedstudio.com/wiki/Grove-Relay/img/Twig-Relay.jpg',
  'LED':
    'https://files.seeedstudio.com/wiki/Grove-Red_LED/img/Grove-LED_Photo.jpg',
  'Buzzer':
    'https://files.seeedstudio.com/wiki/Grove_Buzzer/img/buzzer_s.jpg',
  'L298N':
    'https://files.seeedstudio.com/wiki/Grove-I2C_Motor_Driver_V1.3/img/I2CMotorDriver_01.jpg',
}

/**
 * 根据组件 model 字段查找图片 URL
 * 支持模糊匹配（包含关系）
 */
export function getComponentImage(model: string): string | null {
  // 精确匹配
  if (COMPONENT_IMAGES[model]) return COMPONENT_IMAGES[model]

  // 模糊匹配：查找 model 包含 key 或 key 包含 model
  const modelUpper = model.toUpperCase()
  for (const [key, url] of Object.entries(COMPONENT_IMAGES)) {
    if (modelUpper.includes(key.toUpperCase()) || key.toUpperCase().includes(modelUpper)) {
      return url
    }
  }
  return null
}
