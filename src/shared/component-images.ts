// src/shared/component-images.ts
// 元器件产品图片映射表
// 使用 Seeed Studio / 各厂商官方 CDN 图片，加载失败自动降级为 CSS 节点

export const COMPONENT_IMAGES: Record<string, string> = {
  // ════════════════════════════════════════════════════════
  // MCU / 主控板
  // ════════════════════════════════════════════════════════
  'ESP32-WROOM-32':
    'https://files.seeedstudio.com/wiki/esp32/ESP32-WROOM-32D.jpg',
  'ESP32-WROOM':
    'https://files.seeedstudio.com/wiki/esp32/ESP32-WROOM-32D.jpg',
  'ESP32-S3':
    'https://files.seeedstudio.com/wiki/SeeedStudio-XIAO-ESP32S3/img/xiaoesp32s3.jpg',
  'XIAO ESP32S3':
    'https://files.seeedstudio.com/wiki/SeeedStudio-XIAO-ESP32S3/img/xiaoesp32s3.jpg',
  'XIAO-ESP32S3':
    'https://files.seeedstudio.com/wiki/SeeedStudio-XIAO-ESP32S3/img/xiaoesp32s3.jpg',
  'ESP32-C3':
    'https://files.seeedstudio.com/wiki/XIAO_ESP32C3/img/esp32c3.jpg',
  'ESP32-C6':
    'https://files.seeedstudio.com/wiki/XIAO_ESP32C6/img/esp32c6.jpg',
  'Seeeduino Lotus':
    'https://files.seeedstudio.com/wiki/Seeeduino_Lotus/img/Lotus.jpg',
  'Arduino Uno':
    'https://store.arduino.cc/cdn/shop/products/A000066_03.front_1000x750.jpg',
  'Arduino Mega':
    'https://store.arduino.cc/cdn/shop/products/A000067_03.front_1000x750.jpg',
  'Arduino Nano':
    'https://store.arduino.cc/cdn/shop/products/A000005_03.front_1000x750.jpg',
  'Arduino Leonardo':
    'https://store.arduino.cc/cdn/shop/products/A000057_03.front_1000x750.jpg',
  'Raspberry Pi Pico':
    'https://cdn-shop.adafruit.com/product-images/1003278.jpg',
  'Raspberry Pi Pico W':
    'https://cdn-shop.adafruit.com/product-images/-light/1003277.jpg',

  // ════════════════════════════════════════════════════════
  // 传感器 — 温湿度 / 气体 / 动作
  // ════════════════════════════════════════════════════════
  'DHT22':
    'https://files.seeedstudio.com/wiki/Grove-Temperature_and_Humidity_Sensor_Pro/img/Temperature_humidity_sensor_pro.jpg',
  'DHT22 / AM2302':
    'https://files.seeedstudio.com/wiki/Grove-Temperature_and_Humidity_Sensor_Pro/img/Temperature_humidity_sensor_pro.jpg',
  'AM2302':
    'https://files.seeedstudio.com/wiki/Grove-Temperature_and_Humidity_Sensor_Pro/img/Temperature_humidity_sensor_pro.jpg',
  'DHT11':
    'https://files.seeedstudio.com/wiki/Grove-TemperatureAndHumidity_Sensor/img/list.jpg',
  'DS18B20':
    'https://files.seeedstudio.com/wiki/One-Wire-Temperature/img/One-Wire-Temperature-wiki.jpg',
  'HC-SR04':
    'https://files.seeedstudio.com/wiki/Grove_Ultrasonic_Ranger/img/Ultrasonic_Ranger.jpg',
  'HC-SR501':
    'https://files.seeedstudio.com/wiki/Grove PIR Motion Sensor/img/Grove_-_PIR_Motion_Sensor.jpg',
  'PIR':
    'https://files.seeedstudio.com/wiki/Grove_PIR_Motion_Sensor/img/Grove_-_PIR_Motion_Sensor.jpg',
  'PIR Motion':
    'https://files.seeedstudio.com/wiki/Grove_PIR_Motion_Sensor/img/Grove_-_PIR_Motion_Sensor.jpg',
  'MPU-6050':
    'https://files.seeedstudio.com/wiki/Grove-6-Axis_AccelerometerAndGyroscope/img/Grove-6-Axis_AccelerometerAndGyroscope_product_view_1200_s.jpg',
  'MPU6050':
    'https://files.seeedstudio.com/wiki/Grove-6-Axis_AccelerometerAndGyroscope/img/Grove-6-Axis_AccelerometerAndGyroscope_product_view_1200_s.jpg',
  'MPU9250':
    'https://files.seeedstudio.com/wiki/Grove-9-Axis_IMU_v1.0/img/Grove-9-Axis_IMU_product.jpg',
  'BMP280':
    'https://files.seeedstudio.com/wiki/Grove-Barometer_Sensor-BMP280/img/Grove-Barometer_Sensor-BMP280-700_S.jpg',
  'BMP180':
    'https://files.seeedstudio.com/wiki/Grove-Barometer_Sensor-BMP180/img/barometer_s.jpg',
  'MQ-2':
    'https://files.seeedstudio.com/wiki/Grove-Gas_Sensor-MQ2/img/Twig-Gas_Sensor.bmp',
  'MQ-3':
    'https://files.seeedstudio.com/wiki/Grove-Gas_Sensor-MQ3/img/Grove-Gas_Sensor-MQ3.jpg',
  'MQ-5':
    'https://files.seeedstudio.com/wiki/Grove-Gas_Sensor-MQ5/img/Grove-Gas_Sensor-MQ5.jpg',
  'MQ-7':
    'https://files.seeedstudio.com/wiki/Grove-Gas_Sensor-MQ7/img/Grove-Gas_Sensor-MQ7.jpg',
  'MQ-135':
    'https://files.seeedstudio.com/wiki/Grove-Gas_Sensor-MQ135/img/MQ135.jpg',
  'LDR':
    'https://files.seeedstudio.com/wiki/Grove-Light_Sensor/img/cover.jpg',
  'Photoresistor':
    'https://files.seeedstudio.com/wiki/Grove-Light_Sensor/img/cover.jpg',
  'Sound Sensor':
    'https://files.seeedstudio.com/wiki/Grove-Sound_Sensor/img/sound.jpg',
  'Sound':
    'https://files.seeedstudio.com/wiki/Grove-Sound_Sensor/img/sound.jpg',
  'Flame Sensor':
    'https://files.seeedstudio.com/wiki/Grove-Flame_Sensor/img/Flame_Sensor.jpg',
  'IR Receiver':
    'https://files.seeedstudio.com/wiki/Grove-Infrared_Receiver/img/infrared_receiver.jpg',
  'IR':
    'https://files.seeedstudio.com/wiki/Grove-Infrared_Emitter/img/IR_Emitter.jpg',
  'Water Sensor':
    'https://files.seeedstudio.com/wiki/Grove-Water_Sensor/img/Water_Sensor.jpg',
  'Soil Moisture':
    'https://files.seeedstudio.com/wiki/Grove-Soil_Moisture_Sensor/img/Soil_Moisture_Sensor.jpg',
  'Soil':
    'https://files.seeedstudio.com/wiki/Grove-Soil_Moisture_Sensor/img/Soil_Moisture_Sensor.jpg',
  'Rain':
    'https://files.seeedstudio.com/wiki/Grove-Rain_Sensor/img/Rain_Sensor.jpg',
  'Hall Sensor':
    'https://files.seeedstudio.com/wiki/Grove-Hall_Sensor/img/Hall_Sensor.jpg',
  'RFID':
    'https://files.seeedstudio.com/wiki/Grove-125KHz_RFID/img/125KHz_RFID.jpg',
  'RC522':
    'https://files.seeedstudio.com/wiki/Grove-125KHz_RFID/img/125KHz_RFID.jpg',
  'GPS':
    'https://files.seeedstudio.com/wiki/Grove-GPS/img/GPS.jpg',
  'Encoder':
    'https://files.seeedstudio.com/wiki/Grove-Encoder/img/encoder.jpg',
  'Joystick':
    'https://files.seeedstudio.com/wiki/Grove-Joystick/img/Joystick.jpg',
  'Button':
    'https://files.seeedstudio.com/wiki/Grove-Button/img/button.jpg',
  'Touch Sensor':
    'https://files.seeedstudio.com/wiki/Grove-Touch_Sensor/img/Touch_Sensor.jpg',

  // ════════════════════════════════════════════════════════
  // 传感器 — I2C / 特殊
  // ════════════════════════════════════════════════════════
  'SHT30':
    'https://files.seeedstudio.com/wiki/Grove-TemperatureHumiditySensor-SHT3x/img/SHT30.jpg',
  'SHT31':
    'https://files.seeedstudio.com/wiki/Grove-TemperatureHumiditySensor-SHT3x/img/SHT30.jpg',
  'BME280':
    'https://files.seeedstudio.com/wiki/Grove-Barometer_Sensor-BME280/img/BME280.jpg',
  'MAX30100':
    'https://files.seeedstudio.com/wiki/Grove-MAX30100/img/MAX30100.jpg',
  'ADS1115':
    'https://files.seeedstudio.com/wiki/Grove-I2C_ADC/img/I2C_ADC_01.jpg',
  'PCF8591':
    'https://files.seeedstudio.com/wiki/Grove-I2C_ADC/img/I2C_ADC_01.jpg',

  // ════════════════════════════════════════════════════════
  // 显示屏
  // ════════════════════════════════════════════════════════
  'SSD1306 0.96"':
    'https://files.seeedstudio.com/wiki/Grove-OLED-Display-0.96-SSD1306/img/Grove-OLED-Display-0.96-SSD1306-wiki.jpg',
  'SSD1306':
    'https://files.seeedstudio.com/wiki/Grove-OLED-Display-0.96-SSD1306/img/Grove-OLED-Display-0.96-SSD1306-wiki.jpg',
  'OLED 0.96':
    'https://files.seeedstudio.com/wiki/Grove-OLED-Display-0.96-SSD1306/img/Grove-OLED-Display-0.96-SSD1306-wiki.jpg',
  'OLED':
    'https://files.seeedstudio.com/wiki/Grove-OLED-Display-0.96-SSD1306/img/Grove-OLED-Display-0.96-SSD1306-wiki.jpg',
  'ST7735':
    'https://files.seeedstudio.com/wiki/1.8-Inch-LCD-Display-Module/img/wiki.png',
  'ILI9341':
    'https://files.seeedstudio.com/wiki/2.4-inch-LCD-Module/img/ILI9341.jpg',
  'LCD1602':
    'https://files.seeedstudio.com/wiki/Grove-LCD_RGB_Backlight/img/LCD_RGB_Backlight_1.jpg',
  'LCD2004':
    'https://files.seeedstudio.com/wiki/Grove-LCD_RGB_Backlight/img/LCD_RGB_Backlight_1.jpg',
  'LCD':
    'https://files.seeedstudio.com/wiki/Grove-LCD_RGB_Backlight/img/LCD_RGB_Backlight_1.jpg',
  'Nokia 5110':
    'https://files.seeedstudio.com/wiki/Nokia_5110_LCD/img/Nokia5110.jpg',
  'MAX7219':
    'https://files.seeedstudio.com/wiki/Grove-4-Digit_Display/img/4-Digit_Display.jpg',
  'TM1637':
    'https://files.seeedstudio.com/wiki/Grove-4-Digit_Display/img/4-Digit_Display.jpg',

  // ════════════════════════════════════════════════════════
  // 执行器 / 电机驱动
  // ════════════════════════════════════════════════════════
  'Servo SG90':
    'https://files.seeedstudio.com/wiki/Grove-Servo/img/Grove_Servo_01.jpg',
  'SG90':
    'https://files.seeedstudio.com/wiki/Grove-Servo/img/Grove_Servo_01.jpg',
  'Servo':
    'https://files.seeedstudio.com/wiki/Grove-Servo/img/Grove_Servo_01.jpg',
  'Servo Motor':
    'https://files.seeedstudio.com/wiki/Grove-Servo/img/Grove_Servo_01.jpg',
  'Relay':
    'https://files.seeedstudio.com/wiki/Grove-Relay/img/Twig-Relay.jpg',
  'Relay Module':
    'https://files.seeedstudio.com/wiki/Grove-Relay/img/Twig-Relay.jpg',
  '5V Relay':
    'https://files.seeedstudio.com/wiki/Grove-Relay/img/Twig-Relay.jpg',
  'LED':
    'https://files.seeedstudio.com/wiki/Grove-Red_LED/img/Grove-LED_Photo.jpg',
  'Buzzer':
    'https://files.seeedstudio.com/wiki/Grove_Buzzer/img/buzzer_s.jpg',
  'Active Buzzer':
    'https://files.seeedstudio.com/wiki/Grove_Buzzer/img/buzzer_s.jpg',
  'Passive Buzzer':
    'https://files.seeedstudio.com/wiki/Grove_Buzzer/img/buzzer_s.jpg',
  'L298N':
    'https://files.seeedstudio.com/wiki/Grove-I2C_Motor_Driver_V1.3/img/I2CMotorDriver_01.jpg',
  'L293D':
    'https://files.seeedstudio.com/wiki/Grove-I2C_Motor_Driver_V1.3/img/I2CMotorDriver_01.jpg',
  'DRV8833':
    'https://files.seeedstudio.com/wiki/Grove-Motor_Driver/img/Motor_Driver.jpg',
  'ULN2003':
    'https://files.seeedstudio.com/wiki/Grove-ULN2003_ stepper_Motor_Driver/img/ULN2003.jpg',
  'Stepper Motor':
    'https://files.seeedstudio.com/wiki/Grove-28YTS48-Stepper-Motor/img/28YTS48.jpg',
  'DC Motor':
    'https://files.seeedstudio.com/wiki/Grove-DC_Motor/img/DC_Motor.jpg',
  'Motor':
    'https://files.seeedstudio.com/wiki/Grove-DC_Motor/img/DC_Motor.jpg',
  'Solenoid':
    'https://files.seeedstudio.com/wiki/Grove-Solenoid/img/Solenoid.jpg',
  'Pump':
    'https://files.seeedstudio.com/wiki/Grove-Water_Pump/img/Water_Pump.jpg',
  'Fan':
    'https://files.seeedstudio.com/wiki/Grove-Fan/img/Fan.jpg',
  'RGB LED':
    'https://files.seeedstudio.com/wiki/Grove-RGB_LED/img/RGB_LED.jpg',
  'WS2812':
    'https://files.seeedstudio.com/wiki/Grove-RGB_LED/img/RGB_LED.jpg',
  'Neopixel':
    'https://files.seeedstudio.com/wiki/Grove-RGB_LED/img/RGB_LED.jpg',

  // ════════════════════════════════════════════════════════
  // 音频模块
  // ════════════════════════════════════════════════════════
  'INMP441':
    'https://files.seeedstudio.com/wiki/INMP441/img/INMP441.jpg',
  'MAX9814':
    'https://files.seeedstudio.com/wiki/MAX9814/img/MAX9814.jpg',
  'WM8960':
    'https://files.seeedstudio.com/wiki/WM8960/img/WM8960.jpg',
  'UDA1334':
    'https://files.seeedstudio.com/wiki/UDA1334/img/UDA1334.jpg',
  'PAM8403':
    'https://files.seeedstudio.com/wiki/PAM8403/img/PAM8403.jpg',
  'MAX98357':
    'https://files.seeedstudio.com/wiki/MAX98357/img/MAX98357.jpg',
  'ES8388':
    'https://files.seeedstudio.com/wiki/ES8388/img/ES8388.jpg',
  'SU-03T':
    'https://files.seeedstudio.com/wiki/SU-03T/img/SU-03T.jpg',
  'JL32M1':
    'https://files.seeedstudio.com/wiki/JL32M1/img/JL32M1.jpg',
  'DNECT-VR':
    'https://files.seeedstudio.com/wiki/DNECT-VR/img/DNECT-VR.jpg',
  'Speaker':
    'https://files.seeedstudio.com/wiki/Grove-Speaker/img/speaker.jpg',
  '3W Speaker':
    'https://files.seeedstudio.com/wiki/Grove-Speaker/img/speaker.jpg',
  '5W Speaker':
    'https://files.seeedstudio.com/wiki/Grove-Speaker/img/speaker.jpg',
  'Amplifier':
    'https://files.seeedstudio.com/wiki/Grove-Amplifier/img/Amplifier.jpg',
  'Audio':
    'https://files.seeedstudio.com/wiki/Grove-Speaker/img/speaker.jpg',

  // ════════════════════════════════════════════════════════
  // 通信模块
  // ════════════════════════════════════════════════════════
  'NRF24L01':
    'https://files.seeedstudio.com/wiki/NRF24L01_Module/img/NRF24L01.jpg',
  'HC-05':
    'https://files.seeedstudio.com/wiki/Grove-Serial_Bluetooth/img/HC-05.jpg',
  'HC-06':
    'https://files.seeedstudio.com/wiki/Grove-Serial_Bluetooth/img/HC-05.jpg',
  'Bluetooth':
    'https://files.seeedstudio.com/wiki/Grove-Serial_Bluetooth/img/HC-05.jpg',
  'ESP8266':
    'https://files.seeedstudio.com/wiki/ESP8266_WiFi_Serial_Port_Module/img/esp8266.jpg',
  'ESP-01':
    'https://files.seeedstudio.com/wiki/ESP8266_WiFi_Serial_Port_Module/img/esp8266.jpg',
  'SIM800L':
    'https://files.seeedstudio.com/wiki/Grove-SIMCom SIM800/img/SIM800.jpg',
  'SIM7600':
    'https://files.seeedstudio.com/wiki/SIM7600-H_PCIE/img/SIM7600.jpg',

  // ════════════════════════════════════════════════════════
  // 扩展模块 / 其他
  // ════════════════════════════════════════════════════════
  'SD Card Module':
    'https://files.seeedstudio.com/wiki/Grove-SD_Card_Module/img/SD_Card_Module.jpg',
  'SD Card':
    'https://files.seeedstudio.com/wiki/Grove-SD_Card_Module/img/SD_Card_Module.jpg',
  'RTC':
    'https://files.seeedstudio.com/wiki/Grove-RTC/img/RTC.jpg',
  'DS3231':
    'https://files.seeedstudio.com/wiki/Grove-RTC/img/RTC.jpg',
  'PCF8563':
    'https://files.seeedstudio.com/wiki/Grove-RTC/img/RTC.jpg',
  'Matrix Keypad':
    'https://files.seeedstudio.com/wiki/Grove-Matrix_Keypad/img/Matrix_Keypad.jpg',
  'Keypad':
    'https://files.seeedstudio.com/wiki/Grove-Matrix_Keypad/img/Matrix_Keypad.jpg',
  '74HC595':
    'https://files.seeedstudio.com/wiki/Grove-Shield_Cape/img/74HC595.jpg',
  'Shift Register':
    'https://files.seeedstudio.com/wiki/Grove-Shield_Cape/img/74HC595.jpg',
  'Multiplexer':
    'https://files.seeedstudio.com/wiki/Grove-I2C_Multiplexer/img/Multiplexer.jpg',
  'I2C Multiplexer':
    'https://files.seeedstudio.com/wiki/Grove-I2C_Multiplexer/img/Multiplexer.jpg',
  'IO Expander':
    'https://files.seeedstudio.com/wiki/Grove-I2C_IO_Expander/img/IO_Expander.jpg',
  'PCF8574':
    'https://files.seeedstudio.com/wiki/Grove-I2C_IO_Expander/img/IO_Expander.jpg',
  'DAC':
    'https://files.seeedstudio.com/wiki/Grove-I2C_DAC/img/DAC.jpg',
  'PWM':
    'https://files.seeedstudio.com/wiki/Grove-Circle_LED/img/Circle_LED.jpg',
  'Power Module':
    'https://files.seeedstudio.com/wiki/Grove-5V_Power_Supply/img/Power_Module.jpg',
  'LM2596':
    'https://files.seeedstudio.com/wiki/Grove-5V_Power_Supply/img/Power_Module.jpg',
  'MP1584':
    'https://files.seeedstudio.com/wiki/Grove-5V_Power_Supply/img/Power_Module.jpg',
  'Battery':
    'https://files.seeedstudio.com/wiki/Grove-Chainable_RGB_LED/img/Chainable_RGB_LED.jpg',
  '18650':
    'https://files.seeedstudio.com/wiki/Grove-Chainable_RGB_LED/img/Chainable_RGB_LED.jpg',
  'Capacitive Touch':
    'https://files.seeedstudio.com/wiki/Grove-Capacitive_Touch_Panel/img/Touch_Panel.jpg',

  // ════════════════════════════════════════════════════════
  // 特定项目类
  // ════════════════════════════════════════════════════════
  'Voice Recognition':
    'https://files.seeedstudio.com/wiki/Grove-Voice_Cognition_Sensor/img/Voice_Recognition.jpg',
  'Speech Synthesis':
    'https://files.seeedstudio.com/wiki/Grove-Speech_Synthesis/img/Speech_Synthesis.jpg',
  'Camera':
    'https://files.seeedstudio.com/wiki/Grove-Serial_Camera/img/Serial_Camera.jpg',
  'OV2640':
    'https://files.seeedstudio.com/wiki/Grove-Serial_Camera/img/Serial_Camera.jpg',
}

/**
 * 根据组件 model 字段查找图片 URL
 * 支持模糊匹配（包含关系）
 */
export function getComponentImage(model: string): string | null {
  if (!model) return null

  // 精确匹配
  if (COMPONENT_IMAGES[model]) return COMPONENT_IMAGES[model]

  // 模糊匹配：查找 model 包含 key 或 key 包含 model
  const modelUpper = model.toUpperCase()
  for (const [key, url] of Object.entries(COMPONENT_IMAGES)) {
    if (
      modelUpper.includes(key.toUpperCase()) ||
      key.toUpperCase().includes(modelUpper)
    ) {
      return url
    }
  }
  return null
}
