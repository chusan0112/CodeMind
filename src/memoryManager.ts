import * as vscode from 'vscode';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { MemoryStorage, Memory, MemoryCategory, ImportanceLevel } from './memoryStorage';
import { ProjectScanner } from './projectScanner';
import { CodeValidator, ValidationResult } from './codeValidator';
import { CodeAnalyzer } from './codeAnalyzer';

// 记忆管理器类
export class MemoryManager {
    private storage: MemoryStorage;
    private bestPracticeLibrary?: any; // 最佳实践库（可选）;

    constructor(storage: MemoryStorage, bestPracticeLibrary?: any) {
        this.storage = storage;
        this.bestPracticeLibrary = bestPracticeLibrary;
    }

    // 生成唯一 ID
    private generateId(): string {
        return crypto.randomBytes(16).toString('hex');
    }

    // 初始化项目记忆
    async initProject(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('请先打开一个工作区');
            return;
        }

        // 显示进度提示
        vscode.window.showInformationMessage('正在扫描项目...');

        try {
            // 创建项目扫描器
            const scanner = new ProjectScanner(workspaceFolder);
            
            // 扫描项目
            const projectInfo = await scanner.scan();
            
            // 生成记忆
            const memories = scanner.generateMemories(projectInfo);
            
            // 保存记忆
            for (const memory of memories) {
                await this.storage.addMemory(memory);
            }

            // 自动应用最佳实践（如果可用）
            let practicesApplied = 0;
            if (this.bestPracticeLibrary) {
                try {
                    const practiceResult = await this.bestPracticeLibrary.applyPracticesToProject(projectInfo.language);
                    if (practiceResult.success) {
                        practicesApplied = practiceResult.practicesApplied;
                    }
                } catch (error) {
                    console.error('应用最佳实践失败:', error);
                }
            }

            const totalMemories = memories.length + practicesApplied;
            vscode.window.showInformationMessage(
                `项目记忆初始化完成！已生成 ${memories.length} 条记忆${practicesApplied > 0 ? `，应用了 ${practicesApplied} 条最佳实践` : ''}`
            );
        } catch (error) {
            console.error('初始化项目记忆失败:', error);
            vscode.window.showErrorMessage('初始化项目记忆失败: ' + (error as Error).message);
        }
    }

    // 添加记忆
    async addMemory(): Promise<void> {
        // 让用户输入记忆内容
        const content = await vscode.window.showInputBox({
            prompt: '请输入要记住的内容',
            placeHolder: '例如：项目使用 Go 1.21，代码风格遵循 gofmt'
        });

        if (!content) {
            return;
        }

        // 让用户选择分类
        const categoryItems = Object.values(MemoryCategory).map(cat => ({
            label: this.getCategoryLabel(cat),
            category: cat
        }));

        const selectedCategory = await vscode.window.showQuickPick(categoryItems, {
            placeHolder: '选择记忆分类'
        });

        if (!selectedCategory) {
            return;
        }

        // 让用户选择重要性
        const importanceItems = Object.values(ImportanceLevel).map(imp => ({
            label: this.getImportanceLabel(imp),
            importance: imp
        }));

        const selectedImportance = await vscode.window.showQuickPick(importanceItems, {
            placeHolder: '选择重要性等级'
        });

        if (!selectedImportance) {
            return;
        }

        // 创建记忆对象
        const memory: Memory = {
            id: this.generateId(),
            content: content,
            category: selectedCategory.category,
            timestamp: Date.now(),
            tags: [],
            importance: selectedImportance.importance,
            confidence: 1.0 // 用户手动添加的置信度为 1.0
        };

        // 保存记忆
        await this.storage.addMemory(memory);
        vscode.window.showInformationMessage('记忆已保存！');
    }

    // 保存选中内容为记忆
    async saveSelection(text: string, filePath: string): Promise<void> {
        // 获取当前文档的语言
        const editor = vscode.window.activeTextEditor;
        const language = editor?.document.languageId || '';

        // 智能分析代码
        const analysis = CodeAnalyzer.analyzeCode(text, filePath, language);

        // 构建记忆内容（包含分析信息）
        let memoryContent = text;
        if (analysis.extractedInfo.name) {
            memoryContent = `[${analysis.extractedInfo.description || analysis.extractedInfo.name}]\n\n${text}`;
        }

        // 创建记忆对象
        const memory: Memory = {
            id: this.generateId(),
            content: memoryContent,
            category: analysis.category,
            timestamp: Date.now(),
            tags: analysis.tags,
            importance: analysis.importance,
            relatedFiles: [filePath],
            confidence: 0.9 // 智能分析的置信度较高
        };

        // 保存记忆
        await this.storage.addMemory(memory);
        
        // 显示保存成功消息，包含分析结果
        const typeLabel = this.getCodeTypeLabel(analysis.type);
        vscode.window.showInformationMessage(
            `✅ 已保存为记忆！类型: ${typeLabel} | 分类: ${this.getCategoryLabel(analysis.category)}`
        );
    }

    // 获取代码类型标签（中文）
    private getCodeTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            'function': '函数',
            'struct': '结构体',
            'interface': '接口',
            'class': '类',
            'constant': '常量',
            'variable': '变量',
            'comment': '注释',
            'config': '配置',
            'api_endpoint': 'API 端点',
            'business_logic': '业务逻辑',
            'unknown': '未知'
        };
        return labels[type] || type;
    }

    // 查看所有记忆
    async viewMemories(): Promise<void> {
        const memories = await this.storage.loadMemories();
        
        if (memories.length === 0) {
            vscode.window.showInformationMessage('还没有保存任何记忆');
            return;
        }

        // 显示 WebView（如果已注册）
        // 否则使用 QuickPick 作为后备方案
        try {
            await vscode.commands.executeCommand('memoryManager.memoryView.focus');
        } catch (error) {
            // WebView 不可用时，使用 QuickPick
            const items = memories.map(m => ({
                label: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''),
                description: `${this.getCategoryLabel(m.category)} | ${this.getImportanceLabel(m.importance)}`,
                memory: m
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: '选择要查看的记忆'
            });

            if (selected) {
                // 显示记忆详情
                const detail = `内容: ${selected.memory.content}\n` +
                              `分类: ${this.getCategoryLabel(selected.memory.category)}\n` +
                              `重要性: ${this.getImportanceLabel(selected.memory.importance)}\n` +
                              `时间: ${new Date(selected.memory.timestamp).toLocaleString()}`;
                
                vscode.window.showInformationMessage(detail);
            }
        }
    }

    // 验证代码是否符合记忆
    async verifyCode(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('请先打开一个文件');
            return;
        }

        const document = editor.document;
        const code = document.getText();
        const filePath = document.fileName;
        const language = document.languageId;
        
        // 显示进度提示
        vscode.window.showInformationMessage('正在验证代码...');

        try {
            // 加载所有记忆
            const memories = await this.storage.loadMemories();
            
            if (memories.length === 0) {
                vscode.window.showInformationMessage('还没有保存任何记忆，无法验证代码');
                return;
            }

            // 创建验证器（传入 storage 以启用架构检查）
            const validator = new CodeValidator(memories, this.storage);
            
            // 执行验证
            const result = await validator.validateCode(code, filePath, language);
            
            // 显示验证结果
            await this.showValidationResult(result, editor);
            
        } catch (error) {
            console.error('代码验证失败:', error);
            vscode.window.showErrorMessage('代码验证失败: ' + (error as Error).message);
        }
    }

    // 显示验证结果
    private async showValidationResult(result: ValidationResult, editor: vscode.TextEditor): Promise<void> {
        // 创建诊断集合
        const diagnostics: vscode.Diagnostic[] = [];
        
        for (const issue of result.issues) {
            // 确定诊断严重程度
            let severity: vscode.DiagnosticSeverity;
            switch (issue.type) {
                case 'error':
                    severity = vscode.DiagnosticSeverity.Error;
                    break;
                case 'warning':
                    severity = vscode.DiagnosticSeverity.Warning;
                    break;
                default:
                    severity = vscode.DiagnosticSeverity.Information;
            }

            // 创建诊断
            const range = issue.line !== undefined
                ? new vscode.Range(
                    issue.line - 1,
                    issue.column || 0,
                    issue.line - 1,
                    (issue.column || 0) + 100
                  )
                : new vscode.Range(0, 0, 0, 0);

            const diagnostic = new vscode.Diagnostic(range, issue.message, severity);
            
            // 添加相关记忆信息
            if (issue.memoryId) {
                diagnostic.source = 'Memory Manager';
                diagnostic.code = issue.memoryId;
                if (issue.memoryContent) {
                    diagnostic.relatedInformation = [
                        new vscode.DiagnosticRelatedInformation(
                            new vscode.Location(editor.document.uri, range),
                            `相关记忆: ${issue.memoryContent.substring(0, 50)}...`
                        )
                    ];
                }
            }

            diagnostics.push(diagnostic);
        }

        // 创建诊断集合并显示
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('memoryManager');
        diagnosticCollection.set(editor.document.uri, diagnostics);

        // 显示验证摘要
        const action = await vscode.window.showInformationMessage(
            result.summary,
            '查看详情',
            '关闭'
        );

        if (action === '查看详情') {
            // 显示详细报告
            const report = this.generateValidationReport(result);
            const doc = await vscode.workspace.openTextDocument({
                content: report,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        }

        // 如果验证失败，显示错误提示
        if (!result.passed) {
            const errorCount = result.issues.filter(i => i.type === 'error').length;
            if (errorCount > 0) {
                vscode.window.showErrorMessage(`发现 ${errorCount} 个错误，请检查代码`);
            }
        }
    }

    // 生成验证报告
    private generateValidationReport(result: ValidationResult): string {
        let report = '# 📋 代码验证报告\n\n';
        report += `## 📊 验证结果\n\n`;
        report += `- **状态**: ${result.passed ? '✅ 通过' : '❌ 失败'}\n`;
        report += `- **摘要**: ${result.summary}\n\n`;

        if (result.issues.length === 0) {
            report += `## ✅ 验证通过\n\n`;
            report += `🎉 恭喜！代码完全符合项目记忆要求，没有发现任何问题。\n\n`;
            report += `### 验证内容\n`;
            report += `- ✅ 架构约束检查\n`;
            report += `- ✅ 命名规范检查\n`;
            report += `- ✅ 代码风格检查\n`;
            report += `- ✅ 业务规则检查\n`;
            report += `- ✅ 约束检查\n`;
            return report;
        }

        report += `## 🔍 问题详情\n\n`;
        report += `共发现 ${result.issues.length} 个问题，请仔细检查并修复。\n\n`;

        // 按类型分组
        const errors = result.issues.filter(i => i.type === 'error');
        const warnings = result.issues.filter(i => i.type === 'warning');
        const infos = result.issues.filter(i => i.type === 'info');

        if (errors.length > 0) {
            report += `### ❌ 错误 (${errors.length})\n\n`;
            report += `> ⚠️ 这些是必须修复的问题，违反了强制级记忆要求。\n\n`;
            for (let i = 0; i < errors.length; i++) {
                const issue = errors[i];
                report += `#### 错误 #${i + 1}\n\n`;
                report += `- **位置**: 第 ${issue.line || '?'} 行，第 ${issue.column || '?'} 列\n`;
                report += `- **问题**: ${issue.message}\n`;
                if (issue.memoryContent) {
                    report += `- **相关记忆**:\n`;
                    report += `  \`\`\`\n`;
                    report += `  ${issue.memoryContent}\n`;
                    report += `  \`\`\`\n`;
                }
                report += `\n`;
            }
        }

        if (warnings.length > 0) {
            report += `### ⚠️ 警告 (${warnings.length})\n\n`;
            report += `> 💡 这些是建议修复的问题，违反了推荐级记忆要求。\n\n`;
            for (let i = 0; i < warnings.length; i++) {
                const issue = warnings[i];
                report += `#### 警告 #${i + 1}\n\n`;
                report += `- **位置**: 第 ${issue.line || '?'} 行，第 ${issue.column || '?'} 列\n`;
                report += `- **问题**: ${issue.message}\n`;
                if (issue.memoryContent) {
                    report += `- **相关记忆**:\n`;
                    report += `  \`\`\`\n`;
                    report += `  ${issue.memoryContent}\n`;
                    report += `  \`\`\`\n`;
                }
                report += `\n`;
            }
        }

        if (infos.length > 0) {
            report += `### ℹ️ 提示 (${infos.length})\n\n`;
            report += `> 📝 这些是参考性建议，可以帮助改进代码质量。\n\n`;
            for (let i = 0; i < infos.length; i++) {
                const issue = infos[i];
                report += `#### 提示 #${i + 1}\n\n`;
                report += `- **位置**: 第 ${issue.line || '?'} 行\n`;
                report += `- **建议**: ${issue.message}\n`;
                if (issue.memoryContent) {
                    report += `- **相关记忆**: ${issue.memoryContent}\n`;
                }
                report += `\n`;
            }
        }

        report += `---\n\n`;
        report += `## 💡 修复建议\n\n`;
        if (errors.length > 0) {
            report += `1. **优先修复错误**：错误违反了强制级记忆，必须修复才能通过验证。\n`;
        }
        if (warnings.length > 0) {
            report += `2. **处理警告**：警告违反了推荐级记忆，建议修复以保持代码质量。\n`;
        }
        if (infos.length > 0) {
            report += `3. **参考提示**：提示是改进建议，可以根据实际情况决定是否采纳。\n`;
        }
        report += `\n`;
        report += `> 💬 如需查看或修改相关记忆，请使用命令面板中的 "Memory Manager: 查看所有记忆" 命令。\n`;

        return report;
    }

    // 刷新记忆
    async refreshMemory(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('请先打开一个工作区');
            return;
        }

        // 显示进度提示
        const progressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: '刷新项目记忆',
            cancellable: false
        };

        await vscode.window.withProgress(progressOptions, async (progress) => {
            try {
                progress.report({ increment: 0, message: '正在重新扫描项目...' });

                // 1. 重新扫描项目
                const scanner = new ProjectScanner(workspaceFolder);
                const projectInfo = await scanner.scan();
                
                progress.report({ increment: 30, message: '正在分析现有记忆...' });

                // 2. 加载现有记忆
                const existingMemories = await this.storage.loadMemories();
                
                progress.report({ increment: 50, message: '正在更新记忆...' });

                // 3. 生成新记忆
                const newMemories = scanner.generateMemories(projectInfo);
                
                // 4. 合并和更新记忆
                const updatedMemories = this.mergeMemories(existingMemories, newMemories);
                
                progress.report({ increment: 80, message: '正在保存记忆...' });

                // 5. 保存更新后的记忆
                await this.storage.saveMemories(updatedMemories);
                
                progress.report({ increment: 100, message: '刷新完成！' });

                const addedCount = newMemories.length;
                const updatedCount = updatedMemories.length - existingMemories.length;
                
                vscode.window.showInformationMessage(
                    `记忆刷新完成！新增 ${addedCount} 条记忆，共 ${updatedMemories.length} 条记忆`
                );
            } catch (error) {
                console.error('刷新记忆失败:', error);
                vscode.window.showErrorMessage('刷新记忆失败: ' + (error as Error).message);
            }
        });
    }

    // 合并记忆（智能更新）
    private mergeMemories(existing: Memory[], newMemories: Memory[]): Memory[] {
        const merged: Memory[] = [...existing];
        const existingMap = new Map<string, Memory>();
        
        // 建立现有记忆的索引（按内容和分类）
        for (const memory of existing) {
            const key = `${memory.category}_${memory.content.substring(0, 50)}`;
            existingMap.set(key, memory);
        }

        // 处理新记忆
        for (const newMemory of newMemories) {
            const key = `${newMemory.category}_${newMemory.content.substring(0, 50)}`;
            const existingMemory = existingMap.get(key);

            if (existingMemory) {
                // 更新现有记忆（更新时间戳，保留用户自定义的标签和重要性）
                existingMemory.timestamp = Date.now();
                existingMemory.confidence = Math.max(existingMemory.confidence || 0, newMemory.confidence || 0);
                // 合并相关文件
                if (newMemory.relatedFiles) {
                    if (!existingMemory.relatedFiles) {
                        existingMemory.relatedFiles = [];
                    }
                    for (const file of newMemory.relatedFiles) {
                        if (!existingMemory.relatedFiles.includes(file)) {
                            existingMemory.relatedFiles.push(file);
                        }
                    }
                }
            } else {
                // 添加新记忆
                merged.push(newMemory);
            }
        }

        // 清理过时的记忆（可选：删除超过一定时间未更新的低重要性记忆）
        const now = Date.now();
        const maxAge = 90 * 24 * 60 * 60 * 1000; // 90天

        const filtered = merged.filter(memory => {
            // 保留强制级和推荐级记忆
            if (memory.importance === ImportanceLevel.CRITICAL || 
                memory.importance === ImportanceLevel.HIGH) {
                return true;
            }
            // 保留最近更新的记忆
            if (now - memory.timestamp < maxAge) {
                return true;
            }
            // 删除过时的低重要性记忆
            return false;
        });

        return filtered;
    }

    // 获取分类标签（中文）
    private getCategoryLabel(category: MemoryCategory): string {
        const labels: Record<MemoryCategory, string> = {
            [MemoryCategory.ARCHITECTURE]: '架构',
            [MemoryCategory.CODE_STYLE]: '代码风格',
            [MemoryCategory.BUSINESS_RULE]: '业务规则',
            [MemoryCategory.API_SPEC]: 'API 规范',
            [MemoryCategory.DATABASE]: '数据库',
            [MemoryCategory.CONFIG]: '配置',
            [MemoryCategory.CONSTRAINT]: '约束',
            [MemoryCategory.DOCUMENTATION]: '文档',
            [MemoryCategory.OTHER]: '其他'
        };
        return labels[category] || category;
    }

    // 获取重要性标签（中文）
    private getImportanceLabel(importance: ImportanceLevel): string {
        const labels: Record<ImportanceLevel, string> = {
            [ImportanceLevel.CRITICAL]: '强制级',
            [ImportanceLevel.HIGH]: '推荐级',
            [ImportanceLevel.MEDIUM]: '参考级',
            [ImportanceLevel.LOW]: '低优先级'
        };
        return labels[importance] || importance;
    }

    // 获取相关记忆（根据当前文件）
    async getRelevantMemories(filePath?: string): Promise<Memory[]> {
        const memories = await this.storage.loadMemories();
        
        if (!filePath) {
            // 返回所有强制级和推荐级记忆
            return memories.filter(m => 
                m.importance === ImportanceLevel.CRITICAL || 
                m.importance === ImportanceLevel.HIGH
            );
        }

        // 返回与文件相关的记忆
        return memories.filter(m => 
            m.relatedFiles?.includes(filePath) ||
            m.importance === ImportanceLevel.CRITICAL
        );
    }

    // 导出记忆
    async exportMemories(): Promise<void> {
        const memories = await this.storage.loadMemories();
        
        if (memories.length === 0) {
            vscode.window.showWarningMessage('没有可导出的记忆');
            return;
        }

        // 让用户选择保存位置
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('memories.json'),
            filters: {
                'JSON': ['json'],
                'All Files': ['*']
            },
            saveLabel: '导出记忆'
        });

        if (!uri) {
            return;
        }

        try {
            // 创建导出数据（包含元数据）
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                count: memories.length,
                memories: memories
            };

            // 写入文件
            fs.writeFileSync(uri.fsPath, JSON.stringify(exportData, null, 2), 'utf-8');
            
            vscode.window.showInformationMessage(
                `✅ 成功导出 ${memories.length} 条记忆到 ${uri.fsPath}`
            );
        } catch (error) {
            console.error('导出记忆失败:', error);
            vscode.window.showErrorMessage('导出记忆失败: ' + (error as Error).message);
        }
    }

    // 导入记忆
    async importMemories(): Promise<void> {
        // 让用户选择要导入的文件
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'JSON': ['json'],
                'All Files': ['*']
            },
            openLabel: '导入记忆'
        });

        if (!uris || uris.length === 0) {
            return;
        }

        const uri = uris[0];

        try {
            // 读取文件
            const fileContent = fs.readFileSync(uri.fsPath, 'utf-8');
            const importData = JSON.parse(fileContent);

            // 验证数据格式
            let memoriesToImport: Memory[];
            if (Array.isArray(importData)) {
                // 旧格式：直接是数组
                memoriesToImport = importData;
            } else if (importData.memories && Array.isArray(importData.memories)) {
                // 新格式：包含元数据的对象
                memoriesToImport = importData.memories;
            } else {
                throw new Error('无效的记忆文件格式');
            }

            if (memoriesToImport.length === 0) {
                vscode.window.showWarningMessage('导入文件中没有记忆数据');
                return;
            }

            // 验证记忆数据
            const validMemories = memoriesToImport.filter(m => 
                m.id && m.content && m.category && m.importance
            );

            if (validMemories.length === 0) {
                vscode.window.showErrorMessage('导入文件中没有有效的记忆数据');
                return;
            }

            // 询问用户如何处理重复的记忆
            const action = await vscode.window.showQuickPick(
                [
                    { label: '跳过重复', value: 'skip' },
                    { label: '覆盖重复', value: 'overwrite' },
                    { label: '全部添加（可能重复）', value: 'add' }
                ],
                {
                    placeHolder: `找到 ${validMemories.length} 条有效记忆，如何处理重复项？`
                }
            );

            if (!action) {
                return;
            }

            // 加载现有记忆
            const existingMemories = await this.storage.loadMemories();
            const existingIds = new Set(existingMemories.map(m => m.id));

            let addedCount = 0;
            let skippedCount = 0;
            let overwrittenCount = 0;

            if (action.value === 'skip') {
                // 跳过重复
                const newMemories = validMemories.filter(m => !existingIds.has(m.id));
                for (const memory of newMemories) {
                    await this.storage.addMemory(memory);
                    addedCount++;
                }
                skippedCount = validMemories.length - newMemories.length;
            } else if (action.value === 'overwrite') {
                // 覆盖重复
                for (const memory of validMemories) {
                    if (existingIds.has(memory.id)) {
                        await this.storage.updateMemory(memory.id, memory);
                        overwrittenCount++;
                    } else {
                        await this.storage.addMemory(memory);
                        addedCount++;
                    }
                }
            } else {
                // 全部添加（生成新ID避免重复）
                for (const memory of validMemories) {
                    const newMemory = { ...memory, id: this.generateId() };
                    await this.storage.addMemory(newMemory);
                    addedCount++;
                }
            }

            const summary = `导入完成！新增: ${addedCount}` +
                (skippedCount > 0 ? `, 跳过: ${skippedCount}` : '') +
                (overwrittenCount > 0 ? `, 覆盖: ${overwrittenCount}` : '');
            
            vscode.window.showInformationMessage(summary);
        } catch (error) {
            console.error('导入记忆失败:', error);
            vscode.window.showErrorMessage('导入记忆失败: ' + (error as Error).message);
        }
    }

    // 获取记忆统计信息
    async getMemoryStatistics(): Promise<{
        total: number;
        byCategory: Record<string, number>;
        byImportance: Record<string, number>;
        oldest: Memory | null;
        newest: Memory | null;
    }> {
        const memories = await this.storage.loadMemories();
        
        const byCategory: Record<string, number> = {};
        const byImportance: Record<string, number> = {};
        
        let oldest: Memory | null = null;
        let newest: Memory | null = null;

        for (const memory of memories) {
            // 统计分类
            byCategory[memory.category] = (byCategory[memory.category] || 0) + 1;
            
            // 统计重要性
            byImportance[memory.importance] = (byImportance[memory.importance] || 0) + 1;
            
            // 找最旧和最新的
            if (!oldest || memory.timestamp < oldest.timestamp) {
                oldest = memory;
            }
            if (!newest || memory.timestamp > newest.timestamp) {
                newest = memory;
            }
        }

        return {
            total: memories.length,
            byCategory,
            byImportance,
            oldest,
            newest
        };
    }

    // 增强搜索记忆
    async searchMemories(query: string, fuzzy: boolean = false): Promise<Memory[]> {
        if (fuzzy) {
            return await this.storage.fuzzySearchMemories(query);
        } else {
            return await this.storage.searchMemories(query);
        }
    }

    // 获取所有标签
    async getAllTags(): Promise<string[]> {
        return await this.storage.getAllTags();
    }

    // 根据标签获取记忆
    async getMemoriesByTags(tags: string[]): Promise<Memory[]> {
        return await this.storage.getMemoriesByTags(tags);
    }

    // 更新记忆标签
    async updateMemoryTags(id: string, tags: string[]): Promise<void> {
        await this.storage.updateMemoryTags(id, tags);
        vscode.window.showInformationMessage('标签已更新');
    }

    // 批量更新重要性
    async batchUpdateImportance(ids: string[], importance: ImportanceLevel): Promise<void> {
        await this.storage.batchUpdateImportance(ids, importance);
        vscode.window.showInformationMessage(`已更新 ${ids.length} 条记忆的重要性`);
    }

    // 清理过期记忆
    async cleanExpiredMemories(maxAgeDays: number = 90): Promise<void> {
        const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
        const deletedCount = await this.storage.cleanExpiredMemories(maxAge);
        
        if (deletedCount > 0) {
            vscode.window.showInformationMessage(`已清理 ${deletedCount} 条过期记忆`);
        } else {
            vscode.window.showInformationMessage('没有需要清理的过期记忆');
        }
    }

    // 自动调整记忆重要性（基于使用频率）
    async autoAdjustImportance(): Promise<void> {
        const memories = await this.storage.loadMemories();
        const now = Date.now();
        const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
        
        let adjustedCount = 0;
        
        for (const memory of memories) {
            // 如果记忆最近更新过，提升重要性
            if (memory.timestamp > oneMonthAgo) {
                if (memory.importance === ImportanceLevel.LOW) {
                    memory.importance = ImportanceLevel.MEDIUM;
                    adjustedCount++;
                } else if (memory.importance === ImportanceLevel.MEDIUM && 
                          memory.confidence && memory.confidence > 0.8) {
                    memory.importance = ImportanceLevel.HIGH;
                    adjustedCount++;
                }
            } else {
                // 如果记忆很久没更新，降低重要性（但不会降到强制级以下）
                if (memory.importance === ImportanceLevel.HIGH && 
                    memory.timestamp < oneMonthAgo - 60 * 24 * 60 * 60 * 1000) {
                    memory.importance = ImportanceLevel.MEDIUM;
                    adjustedCount++;
                }
            }
        }
        
        if (adjustedCount > 0) {
            await this.storage.saveMemories(memories);
            vscode.window.showInformationMessage(`已自动调整 ${adjustedCount} 条记忆的重要性`);
        } else {
            vscode.window.showInformationMessage('没有需要调整的记忆');
        }
    }
}

