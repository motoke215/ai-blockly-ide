# AI-Blockly-IDE

自然语言 → 硬件选型 → 连线图（产品图片）→ Blockly 代码 → 编译烧录 一站式桌面 IDE。

---

## Windows 快速启动（开发模式）

### 前置要求
- Node.js >= 18：https://nodejs.org
- arduino-cli：`winget install ArduinoSA.ArduinoCLI`

### 启动

```powershell
cd ai-blockly-ide
npm install
npm run dev
```

启动后点击右上角 **⚙ 模型配置** 填入 API Key，保存后即可使用。

---

## 打包成 exe 安装包

### 第一步：准备资源文件（可选但推荐）

```
resources/
├── icon.ico            ← 替换为你的应用图标（256x256 ICO）
└── arduino-cli.exe     ← 从 GitHub Releases 下载后放这里（内置到安装包）
```

arduino-cli 下载地址：
https://github.com/arduino/arduino-cli/releases/latest
下载 `arduino-cli_x.x.x_Windows_64bit.zip`，解压出 `arduino-cli.exe` 放到 `resources/`

### 第二步：执行打包

```powershell
npm run package
```

### 第三步：找到安装包

```
release/
└── AI-Blockly-IDE-Setup-0.1.0.exe   ← 双击安装，有安装向导
```

安装后桌面会生成快捷方式，双击即可启动。

---

## 支持的模型商（10个）

| 模型商 | 获取 Key |
|--------|---------|
| Anthropic Claude | https://console.anthropic.com |
| OpenAI GPT-4o | https://platform.openai.com |
| Google Gemini | https://aistudio.google.com |
| DeepSeek V3/R1 | https://platform.deepseek.com |
| 通义千问 | https://dashscope.console.aliyun.com |
| 智谱 GLM-4 | https://open.bigmodel.cn |
| 月之暗面 Kimi | https://platform.moonshot.cn |
| MiniMax | https://platform.minimaxi.com |
| Groq (超快) | https://console.groq.com |
| 自定义 OpenAI 兼容 | Ollama / LM Studio 本地模型 |

Key 使用 AES-256 加密存储在本地，路径：
`%APPDATA%\AI-Blockly-IDE\config.json`

---

## 如需串口/烧录功能

串口功能默认关闭（避免 C++ 编译依赖）。
启用方法：

```powershell
# 安装 Visual Studio Build Tools（约 4GB）
winget install Microsoft.VisualStudio.2022.BuildTools

# 然后安装串口库
npm install serialport @serialport/parser-readline

# 还原 electron/mcp-server/tools/serial-port.ts 为完整版本
```

---

## 项目结构

```
ai-blockly-ide/
├── resources/                    ← 打包资源（图标、arduino-cli）
├── electron/                     ← Electron 主进程
│   ├── main.ts
│   ├── preload/index.ts
│   ├── store/key-store.ts        ← API Key 加密持久化
│   └── ipc-handlers/
├── src/                          ← React 渲染层
│   ├── shared/
│   │   ├── component-images.ts   ← 元器件产品图片映射
│   │   ├── llm-providers.ts      ← 10个模型商配置
│   │   └── event-bus.ts          ← 全局事件总线
│   ├── store/app.store.ts        ← Zustand 单一数据源
│   └── modules/
│       ├── ai-chat/              ← Multi-Agent Pipeline
│       ├── wiring/               ← 连线图（支持产品图片）
│       ├── hardware/             ← 编译面板
│       └── settings/             ← 模型配置 UI
└── package.json
```
