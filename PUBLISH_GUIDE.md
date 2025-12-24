# CodeMind 发布指南

## 📦 发布到 VS Code Marketplace

由于 Cursor IDE 基于 VS Code，CodeMind 可以通过 VS Code Marketplace 发布，Cursor 用户可以从中安装。

---

## 🚀 发布步骤（详细版）

### 步骤 1: 准备工作

#### 1.1 安装发布工具

```bash
npm install -g @vscode/vsce
```

#### 1.2 创建 Azure DevOps 账号

1. 访问 [Azure DevOps](https://dev.azure.com/)
2. 注册账号（免费）
3. 创建一个组织（Organization）

#### 1.3 创建 Personal Access Token (PAT)

1. 登录 Azure DevOps
2. 点击右上角用户头像 → **Personal access tokens**
3. 点击 **New Token**
4. 配置：
   - **Name**: `CodeMind Publishing`
   - **Organization**: 选择你的组织
   - **Expiration**: 选择过期时间（建议 1 年）
   - **Scopes**: 选择 **Custom defined**
     - ✅ **Marketplace** → **Manage**
5. 点击 **Create**
6. **重要**：复制生成的 Token（只显示一次！）

---

### 步骤 2: 配置 package.json

#### 2.1 更新发布者信息

编辑 `package.json`，将 `your-publisher-name` 改为你的发布者名称：

```json
{
  "publisher": "你的发布者名称",  // 例如: "codemind" 或 "yourname"
  ...
}
```

**发布者名称规则**：
- 只能包含小写字母、数字、连字符
- 不能包含空格或特殊字符
- 例如：`codemind`、`yourname`、`codemind-team`

#### 2.2 更新仓库信息

编辑 `package.json` 中的仓库信息：

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/你的用户名/codemind.git"
  },
  "bugs": {
    "url": "https://github.com/你的用户名/codemind/issues"
  },
  "homepage": "https://github.com/你的用户名/codemind#readme"
}
```

---

### 步骤 3: 创建图标（可选但推荐）

创建 `icon.png`（128x128 像素）：
- 放在项目根目录
- PNG 格式
- 128x128 像素
- 透明背景（可选）

如果没有图标，可以暂时跳过这一步。

---

### 步骤 4: 打包扩展

#### 4.1 编译项目

```bash
npm run compile
```

#### 4.2 打包为 .vsix 文件

```bash
vsce package
```

这将生成 `codemind-1.1.0.vsix` 文件。

**如果遇到错误**：
- 如果提示需要登录，先执行：`vsce login <你的发布者名称>`
- 然后输入之前创建的 Personal Access Token

---

### 步骤 5: 发布到 Marketplace

#### 方式 1: 使用命令行发布

```bash
vsce publish
```

**或者**，如果已经打包了 `.vsix` 文件：

```bash
vsce publish -p <你的Personal Access Token>
```

#### 方式 2: 通过网页上传

1. 访问 [VS Code Marketplace Publisher](https://marketplace.visualstudio.com/manage)
2. 登录（使用 Microsoft 账号）
3. 点击 **New extension**
4. 上传 `.vsix` 文件
5. 填写扩展信息
6. 点击 **Publish**

---

### 步骤 6: 验证发布

1. 等待几分钟（通常 1-5 分钟）
2. 访问 [VS Code Marketplace](https://marketplace.visualstudio.com/)
3. 搜索 "CodeMind"
4. 确认扩展已发布
5. 在 Cursor IDE 中测试安装：
   - 打开 Cursor IDE
   - `Ctrl+Shift+X` 打开扩展面板
   - 搜索 "CodeMind"
   - 点击安装

---

## 🔄 更新版本

### 更新版本号

编辑 `package.json`：

```json
{
  "version": "1.1.1"  // 递增版本号（遵循语义化版本）
}
```

### 更新 CHANGELOG.md

在 `CHANGELOG.md` 顶部添加新版本：

```markdown
## [1.1.1] - 2024-12-25

### 🐛 Bug 修复
- 修复了某个问题

### ✨ 新功能
- 添加了新功能
```

### 重新发布

```bash
npm run compile
vsce publish
```

---

## 📋 发布检查清单

### 发布前检查

- [ ] `package.json` 中的版本号已更新
- [ ] `package.json` 中的 `publisher` 已设置（不是 `your-publisher-name`）
- [ ] `package.json` 中的 `repository`、`bugs`、`homepage` 已更新
- [ ] `CHANGELOG.md` 已更新
- [ ] `README.md` 完整且准确
- [ ] 所有代码已编译通过（`npm run compile`）
- [ ] 已测试扩展功能
- [ ] 已创建 `icon.png`（可选，但推荐）
- [ ] 已创建 Personal Access Token

### 发布后检查

- [ ] 扩展在 Marketplace 中可见
- [ ] 扩展描述和截图正确
- [ ] 可以在 Cursor IDE 中搜索到
- [ ] 可以正常安装和使用

---

## 🎯 其他发布方式

### 方式 1: GitHub Releases（推荐用于测试）

如果不想立即发布到 Marketplace，可以先发布到 GitHub：

1. **打包扩展**：
   ```bash
   vsce package
   ```

2. **在 GitHub 创建 Release**：
   - 访问你的仓库
   - 点击 **Releases** → **Create a new release**
   - 标签版本：`v1.1.0`
   - 标题：`CodeMind v1.1.0`
   - 上传 `codemind-1.1.0.vsix` 文件
   - 添加发布说明（从 CHANGELOG.md 复制）
   - 点击 **Publish release**

3. **用户安装**：
   - 下载 `.vsix` 文件
   - 在 Cursor IDE 中：`Ctrl+Shift+P` → `Extensions: Install from VSIX...`
   - 选择下载的 `.vsix` 文件

### 方式 2: 直接分发

1. 打包扩展
2. 通过网站、邮件等方式分发 `.vsix` 文件
3. 用户手动安装

---

## ⚠️ 常见问题

### Q: 发布时提示 "Extension name already exists"

**A**: 更改 `package.json` 中的 `name` 字段，使用唯一的名称。扩展名称格式：`<publisher>.<name>`

### Q: 发布时提示 "Invalid publisher"

**A**: 
1. 确保发布者名称符合规则（小写字母、数字、连字符）
2. 确保已登录：`vsce login <发布者名称>`
3. 确保发布者名称在 Azure DevOps 中已创建

### Q: 如何更新已发布的扩展？

**A**: 
1. 更新 `package.json` 中的版本号（必须递增）
2. 更新 `CHANGELOG.md`
3. 运行 `npm run compile`
4. 运行 `vsce publish`
5. 新版本会自动替换旧版本

### Q: 可以在 Cursor 中使用 VS Code Marketplace 的扩展吗？

**A**: 是的！Cursor IDE 完全兼容 VS Code Marketplace，用户可以直接从 Marketplace 安装。

### Q: 发布后多久可以在 Marketplace 看到？

**A**: 通常 1-5 分钟，有时可能需要更长时间。

### Q: 如何撤销发布？

**A**: 
1. 访问 [Marketplace Publisher](https://marketplace.visualstudio.com/manage)
2. 找到你的扩展
3. 点击 **Unpublish**

---

## 📚 参考资源

- [VS Code Extension Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VS Code Extension Marketplace](https://marketplace.visualstudio.com/)
- [vsce CLI Documentation](https://github.com/microsoft/vscode-vsce)
- [语义化版本规范](https://semver.org/lang/zh-CN/)

---

## 🎉 发布成功后的推广

### 1. 更新 GitHub README

添加 Marketplace 徽章：

```markdown
[![VS Code Marketplace](https://img.shields.io/vscode-marketplace/v/your-publisher-name.codemind.svg)](https://marketplace.visualstudio.com/items?itemName=your-publisher-name.codemind)
[![Downloads](https://img.shields.io/vscode-marketplace/d/your-publisher-name.codemind.svg)](https://marketplace.visualstudio.com/items?itemName=your-publisher-name.codemind)
```

### 2. 社交媒体宣传

- Twitter/X：发布扩展链接
- Reddit：在 r/vscode、r/cursor 等社区分享
- 技术社区：V2EX、掘金、CSDN 等

### 3. 收集反馈

- 鼓励用户提交 Issue
- 收集使用反馈
- 持续改进

---

## 🚀 快速发布命令总结

```bash
# 1. 安装工具
npm install -g @vscode/vsce

# 2. 登录（首次）
vsce login <你的发布者名称>
# 输入 Personal Access Token

# 3. 编译
npm run compile

# 4. 打包
vsce package

# 5. 发布
vsce publish
```

---

**祝你发布顺利！** 🎉

如有问题，请查看 [VS Code 官方文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) 或提交 Issue。
