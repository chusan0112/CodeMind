# CodeMind

一个强大的 AI 上下文管理扩展，专为 Cursor IDE 设计，解决大型项目中 AI 忘记上下文的问题。

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/your-username/codemind)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**🌍 Multi-language Support**: [简体中文](README.zh-cn.md) (默认) | English | [繁體中文](README.zh-tw.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

## ✨ 核心特性

### 🧠 智能记忆管理
- **自动提取**：文件保存时自动提取关键要素（架构、API、配置、约束等）
- **自动注入**：文件打开时自动注入相关记忆到 AI 上下文
- **智能选择**：根据代码内容动态选择最相关的记忆
- **实时验证**：代码变更时自动验证是否符合项目记忆

### 🌍 多语言和框架支持
- **14 种编程语言**：Go、Java、JavaScript、TypeScript、Python、Rust、C++、C、C#、PHP、Ruby、**Kotlin**、**Swift**、**Dart**
- **桌面应用框架**：Tauri、Electron、**Flutter**
- **移动应用框架**：**React Native**、**Flutter**
- **Web 框架**：React、Vue、Angular、Express、Next.js、**NestJS**、**SvelteKit**、**SolidJS**、**Remix**、**Nuxt.js**、**Koa**
- **后端框架**：Spring Boot、Django、Flask、FastAPI、**Gin**、**Fiber**、**Echo**、**Rocket**、**Actix-web**、**Laravel**、**Rails**、**ASP.NET Core**

### 📝 多维度分类
- **9 种分类**：架构、代码风格、业务规则、API 规范、数据库、配置、约束、文档、其他
- **4 个重要性等级**：强制级、推荐级、参考级、低优先级

### 🎯 核心功能
- ✅ **项目模板库**：5 种内置模板，一键应用最佳实践
- ✅ **最佳实践库**：4 种语言的最佳实践，自动应用
- ✅ **代码模式识别**：自动识别项目中的代码模式
- ✅ **版本管理**：记录记忆变更历史，支持回滚
- ✅ **团队协作**：团队记忆共享和同步

---

## 🚀 快速开始

### 安装

1. **从源码安装**：
   ```bash
   git clone https://github.com/your-username/codemind.git
   cd codemind
   npm install
   npm run compile
   ```

2. **在 Cursor 中调试**：
   - 按 `F5` 打开扩展开发窗口
   - 在新窗口中打开你的项目

3. **从 Marketplace 安装**：
   - 在 Cursor IDE 中：`Ctrl+Shift+X` 打开扩展面板
   - 搜索 "CodeMind"
   - 点击安装
   - 或访问 [VS Code Marketplace](https://marketplace.visualstudio.com/) 搜索安装

### 首次使用

1. **初始化项目记忆**：
   ```
   Ctrl+Shift+P → CodeMind: Initialize Project Memory
   ```
   - 自动检测项目语言和框架
   - 扫描项目结构和依赖
   - 应用最佳实践
   - 生成初始记忆

2. **开始编码**：
   - 正常编写代码
   - 保存文件时自动提取关键要素
   - AI 自动获取相关记忆
   - 代码自动验证

**就这么简单！无需手动操作，完全自动化！**

---

## 📖 使用指南

### 核心工作流程

```
编写代码 → 保存文件 → 自动提取关键要素 → AI 自动获取记忆 → 代码自动验证
```

### 主要命令

#### 记忆管理
- `CodeMind: Initialize Project Memory` - 首次使用，扫描项目并生成记忆
- `CodeMind: Add Memory` - 手动添加记忆
- `CodeMind: View All Memories` - 打开记忆管理界面
- `CodeMind: Save Selection as Memory` - 右键菜单，保存选中代码

#### 代码验证
- `CodeMind: Verify Code Against Memory` - 手动验证当前文件
- 自动验证：文件变更时自动验证（默认启用）

#### 记忆注入
- `CodeMind: Inject Memories to Current File` - 手动注入记忆（优先使用 Cursor API）
- `CodeMind: Get Memory Context` - 查看压缩后的记忆上下文

#### 项目模板
- `CodeMind: Apply Project Template` - 选择并应用项目模板
- `CodeMind: View Project Templates` - 查看所有可用模板

#### 最佳实践
- `CodeMind: Apply Best Practices` - 根据项目语言应用最佳实践
- `CodeMind: View Best Practices` - 查看所有最佳实践

#### 代码模式
- `CodeMind: Recognize Code Patterns` - 扫描项目并识别常见代码模式

#### 版本管理
- `CodeMind: Create Version` - 创建记忆版本快照
- `CodeMind: View Version History` - 查看所有版本历史
- `CodeMind: Rollback to Version` - 回滚到指定版本

#### 团队协作
- `CodeMind: Create Team` - 创建团队
- `CodeMind: Export Memories (Team Share)` - 导出记忆用于共享
- `CodeMind: Import Memories (From Team)` - 从团队导入记忆
- `CodeMind: Sync Memories` - 同步团队记忆

#### 其他功能
- `CodeMind: Extract Memory from Conversation` - 从 AI 对话中提取记忆
- `CodeMind: Export Memories` - 导出记忆为 JSON
- `CodeMind: Import Memories` - 从 JSON 导入记忆
- `CodeMind: View Statistics` - 查看记忆统计
- `CodeMind: Check Cursor API Availability` - 检查 Cursor API

---

## ⚙️ 配置选项

在 Cursor 设置中配置（`Ctrl+,` → 搜索 "CodeMind" 或 "memoryManager"）：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `memoryManager.autoInit` | `true` | 是否自动初始化项目记忆 |
| `memoryManager.autoInject` | `true` | 是否自动注入记忆到 AI 上下文 |
| `memoryManager.autoExtract` | `true` | 是否自动提取关键要素（文件保存时） |
| `memoryManager.autoValidate` | `true` | 是否自动验证代码（文件变更时） |
| `memoryManager.enableCompletion` | `true` | 是否启用智能代码补全 |
| `memoryManager.maxMemories` | `50` | 最大记忆数量 |
| `memoryManager.maxContextTokens` | `2000` | 记忆上下文最大 TOKEN 数量 |
| `memoryManager.storagePath` | `.cursor-memory` | 记忆存储路径 |

---

## 📁 项目结构

```
codemind/
├── src/                          # 源代码目录
│   ├── extension.ts              # 扩展入口文件
│   ├── memoryStorage.ts          # 记忆存储模块
│   ├── memoryManager.ts          # 记忆管理器核心逻辑
│   ├── memoryInjector.ts         # 记忆注入器（Cursor API 集成）
│   ├── autoMemoryExtractor.ts   # 自动提取器（文件保存时）
│   ├── codeAnalyzer.ts          # 代码分析器
│   ├── codeValidator.ts          # 代码验证器
│   ├── projectScanner.ts         # 项目扫描器（多语言支持）
│   ├── memoryWebView.ts          # WebView 界面
│   ├── conversationAnalyzer.ts   # 对话分析器
│   ├── memoryCompletionProvider.ts # 代码补全提供者
│   ├── architectureChecker.ts    # 架构检查器
│   ├── cursorApiResearch.ts      # Cursor API 研究模块
│   ├── projectTemplateManager.ts # 项目模板管理器
│   ├── bestPracticeLibrary.ts    # 最佳实践库
│   ├── codePatternRecognizer.ts  # 代码模式识别器
│   ├── memoryVersionManager.ts   # 记忆版本管理器
│   └── teamCollaboration.ts      # 团队协作管理器
├── out/                          # 编译输出目录
├── package.json                  # 扩展配置和依赖
├── tsconfig.json                 # TypeScript 配置
├── README.md                     # 本文档
├── CHANGELOG.md                  # 更新日志
├── TROUBLESHOOTING.md           # 故障排除指南
└── LICENSE                       # 许可证文件
```

---

## 🎯 核心功能详解

### 1. 自动提取关键要素

**触发时机**：文件保存时

**提取内容**：
- 架构信息：结构体/类名、关键字段、方法签名
- API 端点：路由路径和 HTTP 方法
- 配置信息：关键配置项和值
- 约束条件：代码中的约束说明
- 业务规则：业务逻辑和规则说明
- 依赖关系：导入的依赖包

**特点**：
- ✅ 只保存关键信息，不保存完整代码
- ✅ 自动过滤工程文件（node_modules、.git 等）
- ✅ 智能压缩，节省存储空间

### 2. 自动注入记忆

**触发时机**：文件打开/激活时

**注入方式**：
1. **优先使用 Cursor API**（`.cursorrules` 文件）
2. 如果不可用，回退到注释方式

**特点**：
- ✅ 智能选择相关记忆
- ✅ 自动压缩，突破 TOKEN 限制
- ✅ 优先级管理，确保关键记忆优先

### 3. 实时代码验证

**触发时机**：文件变更时（500ms 防抖）

**验证内容**：
- ✅ 架构约束检查
- ✅ 命名规范检查
- ✅ 代码风格检查
- ✅ 业务规则检查
- ✅ 约束检查

**显示方式**：
- 编辑器诊断标记（错误、警告、提示）
- 悬停查看详细信息
- 相关记忆信息

### 4. 智能代码补全

**触发时机**：输入代码时（`.`、空格、换行）

**功能**：
- ✅ 根据项目记忆提供补全建议
- ✅ 显示记忆内容和分类
- ✅ 支持多种语言

### 5. 项目模板库

**内置模板**：
- Go Web API
- Go CLI Tool
- JavaScript/TypeScript Web App
- Node.js API
- Python Web API
- **Tauri Desktop App**（Rust + 前端）
- **Electron Desktop App**（Node.js + Web）

**功能**：
- ✅ 一键应用模板
- ✅ 自动创建预定义记忆
- ✅ 支持自定义模板

### 6. 最佳实践库

**支持语言**：
- Go（4 条最佳实践）
- JavaScript/TypeScript（4 条最佳实践）
- Python（4 条最佳实践）
- Java（3 条最佳实践）
- **Rust（4 条最佳实践）**（新增）

**功能**：
- ✅ 项目初始化时自动应用
- ✅ 手动应用和查看
- ✅ 持续更新

### 7. 代码模式识别

**功能**：
- ✅ 扫描项目源代码
- ✅ 识别常见代码模式
- ✅ 提取模式为记忆
- ✅ 检测模式不一致

### 8. 版本管理

**功能**：
- ✅ 创建版本快照
- ✅ 记录变更历史（新增、修改、删除）
- ✅ 查看版本历史
- ✅ 版本回滚（自动备份）

### 9. 团队协作

**功能**：
- ✅ 创建团队
- ✅ 导出记忆（团队共享）
- ✅ 导入记忆（从团队）
- ✅ 记忆同步（基础实现）

---

## 🔧 开发指南

### 环境要求

- Node.js 14+
- TypeScript 4+
- Cursor IDE 或 VS Code 1.74+

### 开发步骤

1. **克隆项目**：
   ```bash
   git clone https://github.com/your-username/codemind.git
   cd codemind
   ```

2. **安装依赖**：
   ```bash
   npm install
   ```

3. **编译项目**：
   ```bash
   npm run compile
   ```

4. **调试扩展**：
   - 在 Cursor 中打开项目
   - 按 `F5` 启动扩展开发窗口
   - 在新窗口中测试扩展

5. **打包扩展**：
   ```bash
   npm install -g @vscode/vsce
   vsce package
   ```

### 代码结构

- **extension.ts**：扩展入口，注册命令和提供者
- **memoryStorage.ts**：记忆存储接口和实现
- **memoryManager.ts**：记忆管理核心逻辑
- **memoryInjector.ts**：记忆注入逻辑（Cursor API 集成）
- **autoMemoryExtractor.ts**：自动提取逻辑
- **codeValidator.ts**：代码验证逻辑
- **projectScanner.ts**：项目扫描逻辑（多语言支持）

---

## 📚 文档

- [更新日志](CHANGELOG.md) - 版本更新历史
- [发布指南](PUBLISH_GUIDE.md) - 如何发布到 Marketplace
- [故障排除](TROUBLESHOOTING.md) - 常见问题解决
- [许可证](LICENSE) - MIT 许可证

## 🚀 快速开始

### 5 分钟快速上手

1. **安装扩展**（从源码或 Marketplace）
2. **初始化项目记忆**：`Ctrl+Shift+P` → `CodeMind: Initialize Project Memory`
3. **开始编码**：正常编写代码，系统自动提取、注入和验证

**就这么简单！无需手动操作，完全自动化！**

### 核心工作流程

```
编写代码 → 保存文件 → 自动提取关键要素 → AI 自动获取记忆 → 代码自动验证
```

## ❓ 常见问题

### Q: 扩展没有激活？
**A**: 确保在扩展开发窗口中（按 `F5` 后打开的新窗口），并已打开工作区。

### Q: 命令找不到？
**A**: 使用命令面板（`Ctrl+Shift+P`），输入 "CodeMind" 查看所有命令。

### Q: 记忆没有自动提取？
**A**: 检查配置 `memoryManager.autoExtract` 是否为 `true`，确保保存的是源代码文件。

### Q: 验证没有显示？
**A**: 检查配置 `memoryManager.autoValidate` 是否为 `true`，确保有相关记忆。

更多问题请查看 [故障排除指南](TROUBLESHOOTING.md)。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南

1. Fork 本项目
2. 创建功能分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 🙏 致谢

感谢所有贡献者和用户的支持！

---

## 📞 联系方式

- **Issues**: [GitHub Issues](https://github.com/your-username/codemind/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/codemind/discussions)

---

**让 AI 记住你的项目，让代码更符合规范！** 🚀

---

## 🌍 多语言支持

CodeMind 支持以下语言界面：

- 🇨🇳 **简体中文** (默认)
- 🇺🇸 English
- 🇹🇼 繁體中文
- 🇯🇵 日本語
- 🇰🇷 한국어
- 🇷🇺 Русский (俄文)

扩展会根据你的 Cursor IDE 语言设置自动切换界面语言。如果 IDE 语言不在支持列表中，将使用简体中文作为默认语言。
