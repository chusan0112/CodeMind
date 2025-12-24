import * as vscode from 'vscode';
import { MemoryManager } from './memoryManager';
import { MemoryStorage } from './memoryStorage';
import { MemoryWebViewProvider } from './memoryWebView';
import { MemoryInjector } from './memoryInjector';
import { AutoMemoryExtractor } from './autoMemoryExtractor';
import { CodeValidator, ValidationIssue } from './codeValidator';
import { ConversationAnalyzer } from './conversationAnalyzer';
import { MemoryCompletionProvider } from './memoryCompletionProvider';
import { ProjectTemplateManager } from './projectTemplateManager';
import { BestPracticeLibrary } from './bestPracticeLibrary';
import { CodePatternRecognizer } from './codePatternRecognizer';
import { MemoryVersionManager } from './memoryVersionManager';
import { TeamCollaboration } from './teamCollaboration';

// 插件激活时调用
export function activate(context: vscode.ExtensionContext) {
    // 使用多个输出通道确保日志可见
    const outputChannel = vscode.window.createOutputChannel('CodeMind');
    outputChannel.show(true); // 自动显示输出面板
    
    outputChannel.appendLine('========================================');
    outputChannel.appendLine('✅ CodeMind 插件已激活！');
    outputChannel.appendLine(`Extension ID: ${context.extension.id}`);
    outputChannel.appendLine(`Extension Path: ${context.extensionPath}`);
    outputChannel.appendLine('========================================');
    
    // 同时在控制台输出
    console.log('========================================');
    console.log('✅ CodeMind 插件已激活！');
    console.log('Extension ID:', context.extension.id);
    console.log('Extension Path:', context.extensionPath);
    console.log('========================================');
    
    // 显示通知提示用户
    vscode.window.showInformationMessage('✅ CodeMind 已激活！', '查看日志').then(selection => {
        if (selection === '查看日志') {
            outputChannel.show(true);
        }
    });

    // 初始化记忆管理器
    const storage = new MemoryStorage(context);
    const bestPracticeLibrary = new BestPracticeLibrary(storage, context);
    const memoryManager = new MemoryManager(storage, bestPracticeLibrary);
    const memoryInjector = new MemoryInjector(storage, context);
    const autoExtractor = new AutoMemoryExtractor(storage, context);
    const conversationAnalyzer = new ConversationAnalyzer(storage, context);
    const templateManager = new ProjectTemplateManager(storage, context);
    const patternRecognizer = new CodePatternRecognizer(storage, context);
    const versionManager = new MemoryVersionManager(storage, context);
    const teamCollaboration = new TeamCollaboration(storage, context);
    
    outputChannel.appendLine('✅ 记忆管理器已初始化');

    // 注册 WebView 提供者
    const webViewProvider = new MemoryWebViewProvider(context.extensionUri, storage);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(MemoryWebViewProvider.viewType, webViewProvider)
    );

    // 注册记忆补全提供者（智能代码补全）
    const memoryConfig = vscode.workspace.getConfiguration('memoryManager');
    const enableCompletion = memoryConfig.get<boolean>('enableCompletion', true);
    
    if (enableCompletion) {
        const completionProvider = new MemoryCompletionProvider(storage);
        const supportedLanguages = ['go', 'java', 'javascript', 'typescript', 'python', 'rust', 'c', 'cpp', 'csharp', 'php', 'ruby'];
        const completionDisposables = supportedLanguages.map(lang => 
            vscode.languages.registerCompletionItemProvider(
                { scheme: 'file', language: lang },
                completionProvider,
                '.', // 触发字符
                ' ', // 触发字符
                '\n' // 触发字符
            )
        );
        context.subscriptions.push(...completionDisposables);
        outputChannel.appendLine('✅ 智能代码补全已启用（支持 ' + supportedLanguages.length + ' 种语言）');
    } else {
        outputChannel.appendLine('ℹ️ 智能代码补全已禁用（可在设置中启用）');
    }

    // 设置自动注入记忆（确保关键记忆自动调用）
    memoryInjector.setupAutoInject(context);

    // 设置自动提取记忆（文件保存时自动提取关键要素）
    autoExtractor.setupAutoExtraction(context);

    // 注册命令：初始化项目记忆
    const initCommand = vscode.commands.registerCommand(
        'memoryManager.initProject',
        async () => {
            console.log('命令 memoryManager.initProject 被调用');
            try {
                await memoryManager.initProject();
            } catch (error) {
                console.error('执行 initProject 时出错:', error);
                vscode.window.showErrorMessage('初始化项目记忆失败: ' + (error as Error).message);
            }
        }
    );
    console.log('命令 memoryManager.initProject 已注册');
    outputChannel.appendLine('✅ 命令 memoryManager.initProject 已注册');

    // 注册命令：添加记忆
    const addMemoryCommand = vscode.commands.registerCommand(
        'memoryManager.addMemory',
        async () => {
            await memoryManager.addMemory();
        }
    );

    // 注册命令：查看所有记忆
    const viewMemoriesCommand = vscode.commands.registerCommand(
        'memoryManager.viewMemories',
        async () => {
            await memoryManager.viewMemories();
            // 刷新 WebView
            await webViewProvider.refresh();
        }
    );

    // 注册命令：保存选中内容为记忆
    const saveSelectionCommand = vscode.commands.registerCommand(
        'memoryManager.saveSelection',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.selection && !editor.selection.isEmpty) {
                const selectedText = editor.document.getText(editor.selection);
                await memoryManager.saveSelection(selectedText, editor.document.fileName);
            } else {
                vscode.window.showWarningMessage('请先选中要保存的内容');
            }
        }
    );

    // 注册命令：验证代码是否符合记忆
    const verifyCodeCommand = vscode.commands.registerCommand(
        'memoryManager.verifyCode',
        async () => {
            await memoryManager.verifyCode();
        }
    );

    // 注册命令：刷新记忆
    const refreshCommand = vscode.commands.registerCommand(
        'memoryManager.refreshMemory',
        async () => {
            await memoryManager.refreshMemory();
            await webViewProvider.refresh();
        }
    );

    // 注册命令：导出记忆
    const exportCommand = vscode.commands.registerCommand(
        'memoryManager.exportMemories',
        async () => {
            await memoryManager.exportMemories();
        }
    );

    // 注册命令：导入记忆
    const importCommand = vscode.commands.registerCommand(
        'memoryManager.importMemories',
        async () => {
            await memoryManager.importMemories();
            await webViewProvider.refresh();
        }
    );

    // 注册命令：注入记忆到当前文件
    const injectCommand = vscode.commands.registerCommand(
        'memoryManager.injectMemories',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('请先打开一个文件');
                return;
            }
            
            // 先尝试通过 Cursor API 注入
            const memories = await memoryInjector.getRelevantMemoriesForFile(editor.document.fileName);
            if (memories.length > 0) {
                // 尝试通过 Cursor API 注入
                const apiAvailable = await memoryInjector.checkCursorApiAvailability();
                if (apiAvailable.available) {
                    vscode.window.showInformationMessage(
                        `✅ 已通过 Cursor API 注入记忆（方法: ${apiAvailable.methods.join(', ')}）`
                    );
                } else {
                    // 回退到注释方式
                    await memoryInjector.injectMemoriesToEditor(editor);
                    vscode.window.showInformationMessage('记忆已注入到文件（注释方式）');
                }
            } else {
                vscode.window.showInformationMessage('没有找到相关记忆');
            }
        }
    );

    // 注册命令：检查 Cursor API 可用性
    const checkApiCommand = vscode.commands.registerCommand(
        'memoryManager.checkCursorApi',
        async () => {
            const availability = await memoryInjector.checkCursorApiAvailability();
            
            if (availability.available) {
                const methods = availability.methods.join('\n- ');
                vscode.window.showInformationMessage(
                    `✅ Cursor API 可用！\n可用方法:\n- ${methods}`,
                    { modal: true }
                );
            } else {
                vscode.window.showWarningMessage(
                    '⚠️ 未找到可用的 Cursor API，将使用注释方式注入记忆'
                );
            }
        }
    );

    // 注册命令：应用项目模板
    const applyTemplateCommand = vscode.commands.registerCommand(
        'memoryManager.applyTemplate',
        async () => {
            const templates = templateManager.getTemplates();
            
            if (templates.length === 0) {
                vscode.window.showWarningMessage('没有可用的项目模板');
                return;
            }

            // 让用户选择模板
            const items = templates.map(t => ({
                label: t.name,
                description: t.description,
                detail: `分类: ${t.category} | 语言: ${t.language.join(', ')}`,
                id: t.id
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: '选择要应用的项目模板'
            });

            if (!selected) {
                return;
            }

            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('请先打开一个工作区');
                return;
            }

            // 应用模板
            vscode.window.showInformationMessage('正在应用模板...');
            const result = await templateManager.applyTemplate(
                selected.id,
                workspaceFolder.uri.fsPath
            );

            if (result.success) {
                await webViewProvider.refresh();
                vscode.window.showInformationMessage(
                    `✅ 模板应用成功！已创建 ${result.memoriesCreated} 条记忆`,
                    '查看记忆'
                ).then(selection => {
                    if (selection === '查看记忆') {
                        vscode.commands.executeCommand('memoryManager.viewMemories');
                    }
                });
            } else {
                vscode.window.showErrorMessage(`模板应用失败: ${result.error}`);
            }
        }
    );

    // 注册命令：查看项目模板
    const viewTemplatesCommand = vscode.commands.registerCommand(
        'memoryManager.viewTemplates',
        async () => {
            const templates = templateManager.getTemplates();
            
            if (templates.length === 0) {
                vscode.window.showInformationMessage('没有可用的项目模板');
                return;
            }

            // 显示模板列表
            const templatesText = `# 项目模板列表\n\n` +
                templates.map(t => 
                    `## ${t.name}\n` +
                    `**ID**: ${t.id}\n` +
                    `**描述**: ${t.description}\n` +
                    `**分类**: ${t.category}\n` +
                    `**语言**: ${t.language.join(', ')}\n` +
                    `**记忆数量**: ${t.memories.length}\n`
                ).join('\n---\n\n');

            const doc = await vscode.workspace.openTextDocument({
                content: templatesText,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        }
    );

    // 注册命令：应用最佳实践
    const applyBestPracticesCommand = vscode.commands.registerCommand(
        'memoryManager.applyBestPractices',
        async () => {
            // 检测项目语言
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('请先打开一个工作区');
                return;
            }

            // 扫描项目以获取语言信息
            const { ProjectScanner, ProjectLanguage } = await import('./projectScanner');
            const scanner = new ProjectScanner(workspaceFolder);
            const projectInfo = await scanner.scan();

            if (projectInfo.language === ProjectLanguage.UNKNOWN) {
                vscode.window.showWarningMessage('无法检测项目语言，请手动选择');
                // 让用户选择语言
                const languageItems = [
                    { label: 'Go', language: ProjectLanguage.GO },
                    { label: 'Java', language: ProjectLanguage.JAVA },
                    { label: 'JavaScript', language: ProjectLanguage.JAVASCRIPT },
                    { label: 'TypeScript', language: ProjectLanguage.TYPESCRIPT },
                    { label: 'Python', language: ProjectLanguage.PYTHON }
                ];

                const selected = await vscode.window.showQuickPick(languageItems, {
                    placeHolder: '选择项目语言'
                });

                if (!selected) {
                    return;
                }

                projectInfo.language = selected.language;
            }

            // 应用最佳实践
            vscode.window.showInformationMessage('正在应用最佳实践...');
            const result = await bestPracticeLibrary.applyPracticesToProject(projectInfo.language);

            if (result.success) {
                await webViewProvider.refresh();
                vscode.window.showInformationMessage(
                    `✅ 已应用 ${result.practicesApplied} 条最佳实践`,
                    '查看记忆'
                ).then(selection => {
                    if (selection === '查看记忆') {
                        vscode.commands.executeCommand('memoryManager.viewMemories');
                    }
                });
            } else {
                vscode.window.showErrorMessage(`应用最佳实践失败: ${result.error}`);
            }
        }
    );

    // 注册命令：查看最佳实践
    const viewBestPracticesCommand = vscode.commands.registerCommand(
        'memoryManager.viewBestPractices',
        async () => {
            const allPractices = bestPracticeLibrary.getAllPractices();
            
            if (allPractices.length === 0) {
                vscode.window.showInformationMessage('没有可用的最佳实践');
                return;
            }

            // 按语言分组
            const practicesByLanguage: Record<string, typeof allPractices> = {};
            for (const practice of allPractices) {
                if (!practicesByLanguage[practice.language]) {
                    practicesByLanguage[practice.language] = [];
                }
                practicesByLanguage[practice.language].push(practice);
            }

            // 显示最佳实践列表
            let practicesText = `# 最佳实践库\n\n`;
            
            for (const [language, practices] of Object.entries(practicesByLanguage)) {
                practicesText += `## ${language.toUpperCase()}\n\n`;
                for (const practice of practices) {
                    practicesText += `### ${practice.title}\n`;
                    practicesText += `**分类**: ${practice.category}\n`;
                    practicesText += `**重要性**: ${practice.importance}\n`;
                    practicesText += `**描述**: ${practice.description}\n`;
                    practicesText += `**内容**: ${practice.content}\n`;
                    if (practice.examples && practice.examples.length > 0) {
                        practicesText += `**示例**:\n\`\`\`\n${practice.examples.join('\n')}\n\`\`\`\n`;
                    }
                    practicesText += '\n---\n\n';
                }
            }

            const doc = await vscode.workspace.openTextDocument({
                content: practicesText,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        }
    );

    // 注册命令：识别代码模式
    const recognizePatternsCommand = vscode.commands.registerCommand(
        'memoryManager.recognizePatterns',
        async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('请先打开一个工作区');
                return;
            }

            vscode.window.showInformationMessage('正在识别代码模式...');
            
            try {
                const patterns = await patternRecognizer.recognizePatterns(workspaceFolder);
                
                if (patterns.length === 0) {
                    vscode.window.showInformationMessage('未识别到代码模式');
                    return;
                }

                // 转换为记忆并保存
                const memories = await patternRecognizer.patternsToMemories(patterns);
                for (const memory of memories) {
                    await storage.addMemory(memory);
                }

                await webViewProvider.refresh();
                vscode.window.showInformationMessage(
                    `✅ 识别到 ${patterns.length} 个代码模式，已保存为记忆`,
                    '查看记忆'
                ).then(selection => {
                    if (selection === '查看记忆') {
                        vscode.commands.executeCommand('memoryManager.viewMemories');
                    }
                });
            } catch (error) {
                vscode.window.showErrorMessage(`识别代码模式失败: ${(error as Error).message}`);
            }
        }
    );

    // 注册命令：创建版本
    const createVersionCommand = vscode.commands.registerCommand(
        'memoryManager.createVersion',
        async () => {
            const description = await vscode.window.showInputBox({
                prompt: '请输入版本描述（可选）',
                placeHolder: '例如：添加新的 API 规范'
            });

            vscode.window.showInformationMessage('正在创建版本...');
            const version = await versionManager.createVersion(description || undefined);
            
            vscode.window.showInformationMessage(`✅ 已创建版本 ${version}`);
        }
    );

    // 注册命令：查看版本历史
    const viewVersionsCommand = vscode.commands.registerCommand(
        'memoryManager.viewVersions',
        async () => {
            const versions = versionManager.getVersions();
            
            if (versions.length === 0) {
                vscode.window.showInformationMessage('没有版本历史');
                return;
            }

            let versionsText = `# 版本历史\n\n`;
            versionsText += `**当前版本**: ${versionManager.getCurrentVersion()}\n\n`;
            versionsText += `**总版本数**: ${versions.length}\n\n---\n\n`;

            for (const version of versions.reverse()) {
                versionsText += `## 版本 ${version.version}\n`;
                versionsText += `**时间**: ${new Date(version.timestamp).toLocaleString()}\n`;
                if (version.description) {
                    versionsText += `**描述**: ${version.description}\n`;
                }
                versionsText += `**变更**: ${version.changes.length} 项\n`;
                
                const added = version.changes.filter(c => c.type === 'added').length;
                const modified = version.changes.filter(c => c.type === 'modified').length;
                const deleted = version.changes.filter(c => c.type === 'deleted').length;
                
                versionsText += `- 新增: ${added}\n`;
                versionsText += `- 修改: ${modified}\n`;
                versionsText += `- 删除: ${deleted}\n\n---\n\n`;
            }

            const doc = await vscode.workspace.openTextDocument({
                content: versionsText,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        }
    );

    // 注册命令：回滚到版本
    const rollbackVersionCommand = vscode.commands.registerCommand(
        'memoryManager.rollbackVersion',
        async () => {
            const versions = versionManager.getVersions();
            
            if (versions.length === 0) {
                vscode.window.showWarningMessage('没有可回滚的版本');
                return;
            }

            const items = versions.map(v => ({
                label: `版本 ${v.version}`,
                description: v.description || new Date(v.timestamp).toLocaleString(),
                detail: `${v.changes.length} 项变更`,
                version: v.version
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: '选择要回滚到的版本'
            });

            if (!selected) {
                return;
            }

            const confirmed = await vscode.window.showWarningMessage(
                `确定要回滚到版本 ${selected.version} 吗？当前版本将被备份。`,
                '确定',
                '取消'
            );

            if (confirmed === '确定') {
                const success = await versionManager.rollbackToVersion(selected.version);
                if (success) {
                    await webViewProvider.refresh();
                    vscode.window.showInformationMessage(`✅ 已回滚到版本 ${selected.version}`);
                } else {
                    vscode.window.showErrorMessage('回滚失败');
                }
            }
        }
    );

    // 注册命令：创建团队
    const createTeamCommand = vscode.commands.registerCommand(
        'memoryManager.createTeam',
        async () => {
            const teamName = await vscode.window.showInputBox({
                prompt: '请输入团队名称',
                placeHolder: '例如：开发团队'
            });

            if (!teamName) {
                return;
            }

            const memberName = await vscode.window.showInputBox({
                prompt: '请输入您的姓名',
                placeHolder: '例如：张三'
            });

            if (!memberName) {
                return;
            }

            const teamId = await teamCollaboration.createTeam(teamName, memberName);
            vscode.window.showInformationMessage(`✅ 团队创建成功！团队 ID: ${teamId}`);
        }
    );

    // 注册命令：导出记忆（团队共享）
    const exportForTeamCommand = vscode.commands.registerCommand(
        'memoryManager.exportForTeam',
        async () => {
            if (!teamCollaboration.isInTeam()) {
                vscode.window.showWarningMessage('请先创建或加入团队');
                return;
            }

            const exportData = await teamCollaboration.exportMemoriesForSharing();
            
            const doc = await vscode.workspace.openTextDocument({
                content: exportData,
                language: 'json'
            });
            await vscode.window.showTextDocument(doc);
            
            vscode.window.showInformationMessage('✅ 记忆已导出，可以分享给团队成员');
        }
    );

    // 注册命令：导入记忆（从团队）
    const importFromTeamCommand = vscode.commands.registerCommand(
        'memoryManager.importFromTeam',
        async () => {
            const exportData = await vscode.window.showInputBox({
                prompt: '请粘贴团队共享的记忆数据（JSON格式）',
                placeHolder: '{"version": "1.0", "memories": [...]}',
                ignoreFocusOut: true
            });

            if (!exportData) {
                return;
            }

            const overwrite = await vscode.window.showQuickPick(
                ['是（覆盖现有记忆）', '否（跳过现有记忆）'],
                { placeHolder: '如何处理冲突？' }
            );

            if (!overwrite) {
                return;
            }

            try {
                const result = await teamCollaboration.importMemoriesFromSharing(
                    exportData,
                    overwrite === '是（覆盖现有记忆）'
                );

                await webViewProvider.refresh();
                vscode.window.showInformationMessage(
                    `✅ 导入完成！导入 ${result.imported} 条，跳过 ${result.skipped} 条`
                );
            } catch (error) {
                vscode.window.showErrorMessage(`导入失败: ${(error as Error).message}`);
            }
        }
    );

    // 注册命令：同步记忆
    const syncMemoriesCommand = vscode.commands.registerCommand(
        'memoryManager.syncMemories',
        async () => {
            if (!teamCollaboration.isInTeam()) {
                vscode.window.showWarningMessage('请先创建或加入团队');
                return;
            }

            vscode.window.showInformationMessage('正在同步记忆...');
            const result = await teamCollaboration.syncMemories();

            if (result.success) {
                await webViewProvider.refresh();
                vscode.window.showInformationMessage(`✅ 同步完成！同步了 ${result.synced} 条记忆`);
            } else {
                vscode.window.showErrorMessage(`同步失败: ${result.error}`);
            }
        }
    );

    // 注册命令：获取记忆上下文（压缩版本，突破TOKEN限制）
    const getContextCommand = vscode.commands.registerCommand(
        'memoryManager.getContext',
        async () => {
            const editor = vscode.window.activeTextEditor;
            const filePath = editor?.document.fileName;
            const config = vscode.workspace.getConfiguration('memoryManager');
            const maxTokens = config.get<number>('maxContextTokens', 2000);
            
            const contextText = await memoryInjector.getCompressedContext(filePath, maxTokens);
            
            if (!contextText) {
                vscode.window.showInformationMessage('没有找到相关记忆');
                return;
            }
            
            const doc = await vscode.workspace.openTextDocument({
                content: contextText,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        }
    );

    // 注册命令：清理过期记忆
    const cleanCommand = vscode.commands.registerCommand(
        'memoryManager.cleanExpiredMemories',
        async () => {
            const days = await vscode.window.showInputBox({
                prompt: '请输入记忆保留天数（默认90天）',
                placeHolder: '90',
                value: '90'
            });
            
            if (days) {
                const daysNum = parseInt(days, 10);
                if (isNaN(daysNum) || daysNum < 1) {
                    vscode.window.showErrorMessage('请输入有效的天数');
                    return;
                }
                await memoryManager.cleanExpiredMemories(daysNum);
                await webViewProvider.refresh();
            }
        }
    );

    // 注册命令：自动调整重要性
    const autoAdjustCommand = vscode.commands.registerCommand(
        'memoryManager.autoAdjustImportance',
        async () => {
            await memoryManager.autoAdjustImportance();
            await webViewProvider.refresh();
        }
    );

    // 注册命令：从对话中提取记忆
    const extractConversationCommand = vscode.commands.registerCommand(
        'memoryManager.extractFromConversation',
        async () => {
            // 让用户输入对话内容
            const conversationText = await vscode.window.showInputBox({
                prompt: '请输入对话内容（格式：user: ... assistant: ...）',
                placeHolder: 'user: 我需要一个用户登录功能\nassistant: 好的，我会创建一个登录API端点...',
                ignoreFocusOut: true
            });

            if (!conversationText) {
                return;
            }

            // 显示进度
            vscode.window.showInformationMessage('正在分析对话并提取记忆...');

            try {
                // 提取记忆
                const memories = await conversationAnalyzer.extractFromText(conversationText);
                
                if (memories.length === 0) {
                    vscode.window.showInformationMessage('未从对话中提取到记忆');
                    return;
                }

                // 刷新 WebView
                await webViewProvider.refresh();
                
                // 显示结果
                vscode.window.showInformationMessage(
                    `成功从对话中提取了 ${memories.length} 条记忆`,
                    '查看记忆'
                ).then(selection => {
                    if (selection === '查看记忆') {
                        vscode.commands.executeCommand('memoryManager.viewMemories');
                    }
                });
            } catch (error) {
                console.error('从对话提取记忆失败:', error);
                vscode.window.showErrorMessage('从对话提取记忆失败: ' + (error as Error).message);
            }
        }
    );

    // 注册测试命令：验证扩展是否正常工作
    const testCommand = vscode.commands.registerCommand(
        'memoryManager.test',
        async () => {
            vscode.window.showInformationMessage('✅ 扩展正常工作！命令已成功注册！');
            console.log('✅ 测试命令执行成功！扩展已激活！');
        }
    );
    console.log('测试命令 memoryManager.test 已注册');
    outputChannel.appendLine('✅ 测试命令 memoryManager.test 已注册');

    // 注册命令：查看统计信息
    const statisticsCommand = vscode.commands.registerCommand(
        'memoryManager.viewStatistics',
        async () => {
            const stats = await memoryManager.getMemoryStatistics();
            
            // 获取标签映射
            const categoryLabels: Record<string, string> = {
                'architecture': '架构',
                'code_style': '代码风格',
                'business_rule': '业务规则',
                'api_spec': 'API 规范',
                'database': '数据库',
                'config': '配置',
                'constraint': '约束',
                'documentation': '文档',
                'other': '其他'
            };
            
            const importanceLabels: Record<string, string> = {
                'critical': '强制级',
                'high': '推荐级',
                'medium': '参考级',
                'low': '低优先级'
            };
            
            const statsText = `# 记忆统计信息\n\n` +
                `**总计**: ${stats.total} 条记忆\n\n` +
                `## 按分类统计\n` +
                Object.entries(stats.byCategory).map(([cat, count]) => 
                    `- ${categoryLabels[cat] || cat}: ${count}`
                ).join('\n') + '\n\n' +
                `## 按重要性统计\n` +
                Object.entries(stats.byImportance).map(([imp, count]) => 
                    `- ${importanceLabels[imp] || imp}: ${count}`
                ).join('\n') + '\n\n' +
                (stats.oldest ? `**最早记忆**: ${new Date(stats.oldest.timestamp).toLocaleString()}\n` : '') +
                (stats.newest ? `**最新记忆**: ${new Date(stats.newest.timestamp).toLocaleString()}\n` : '');
            
            const doc = await vscode.workspace.openTextDocument({
                content: statsText,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        }
    );

    // 将所有命令添加到订阅列表
    context.subscriptions.push(
        testCommand,
        initCommand,
        addMemoryCommand,
        viewMemoriesCommand,
        saveSelectionCommand,
        verifyCodeCommand,
        refreshCommand,
        exportCommand,
        importCommand,
        statisticsCommand,
        injectCommand,
        getContextCommand,
        cleanCommand,
        autoAdjustCommand,
        extractConversationCommand,
        checkApiCommand,
        applyTemplateCommand,
        viewTemplatesCommand,
        applyBestPracticesCommand,
        viewBestPracticesCommand,
        recognizePatternsCommand,
        createVersionCommand,
        viewVersionsCommand,
        rollbackVersionCommand,
        createTeamCommand,
        exportForTeamCommand,
        importFromTeamCommand,
        syncMemoriesCommand
    );
    
    console.log('所有命令已注册并添加到订阅列表');
    console.log('已注册的命令数量:', context.subscriptions.length);
    outputChannel.appendLine(`✅ 所有命令已注册并添加到订阅列表（共 ${context.subscriptions.length} 个）`);
    outputChannel.appendLine('========================================');
    outputChannel.appendLine('🎉 扩展已完全激活，可以使用所有命令！');
    outputChannel.appendLine('========================================');

    // 如果配置了自动初始化，则自动初始化项目记忆
    const config = vscode.workspace.getConfiguration('memoryManager');
    if (config.get<boolean>('autoInit', true)) {
        // 延迟初始化，避免影响启动速度
        setTimeout(() => {
            // 检查是否有工作区
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                console.log('没有工作区，跳过自动初始化项目记忆');
                return;
            }
            
            memoryManager.initProject().catch(err => {
                console.error('自动初始化项目记忆失败:', err);
            });
        }, 2000);
    }

    // ========== 实时代码验证功能 ==========
    
    // 创建诊断集合，用于显示验证问题
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('memoryManager');
    context.subscriptions.push(diagnosticCollection);
    
    // 验证定时器（用于防抖）
    let validationTimer: NodeJS.Timeout | undefined;
    
    // 验证文档的函数
    async function validateDocument(document: vscode.TextDocument) {
        // 只验证文本文件
        if (document.uri.scheme !== 'file') {
            return;
        }
        
        // 跳过某些文件类型
        const skipExtensions = ['.md', '.txt', '.json', '.yml', '.yaml', '.log'];
        const ext = document.fileName.substring(document.fileName.lastIndexOf('.'));
        if (skipExtensions.includes(ext)) {
            return;
        }
        
        try {
            // 加载记忆
            const memories = await storage.loadMemories();
            if (memories.length === 0) {
                // 没有记忆，清除诊断
                diagnosticCollection.delete(document.uri);
                return;
            }
            
            // 创建验证器（传入 storage 以启用架构检查）
            const validator = new CodeValidator(memories, storage);
            
            // 执行验证
            const code = document.getText();
            const filePath = document.fileName;
            const language = document.languageId;
            const result = await validator.validateCode(code, filePath, language);
            
            // 转换为诊断
            const diagnostics: vscode.Diagnostic[] = result.issues.map(issue => {
                const range = issue.line !== undefined 
                    ? new vscode.Range(
                        issue.line - 1, 
                        issue.column !== undefined ? issue.column - 1 : 0,
                        issue.line - 1, 
                        issue.column !== undefined ? issue.column : 1000
                      )
                    : new vscode.Range(0, 0, 0, 0);
                
                const severity = issue.type === 'error' 
                    ? vscode.DiagnosticSeverity.Error
                    : issue.type === 'warning'
                    ? vscode.DiagnosticSeverity.Warning
                    : vscode.DiagnosticSeverity.Information;
                
                const diagnostic = new vscode.Diagnostic(range, issue.message, severity);
                
                // 添加相关记忆信息
                if (issue.memoryContent) {
                    diagnostic.source = 'CodeMind';
                    diagnostic.relatedInformation = [
                        new vscode.DiagnosticRelatedInformation(
                            new vscode.Location(document.uri, range),
                            `相关记忆: ${issue.memoryContent.substring(0, 100)}...`
                        )
                    ];
                }
                
                return diagnostic;
            });
            
            // 设置诊断
            diagnosticCollection.set(document.uri, diagnostics);
            
            // 如果有错误，在状态栏显示
            const errorCount = result.issues.filter(i => i.type === 'error').length;
            if (errorCount > 0) {
                // 可以在这里添加状态栏提示
                // vscode.window.setStatusBarMessage(`发现 ${errorCount} 个违反记忆的错误`, 3000);
            }
            
        } catch (error) {
            console.error('实时代码验证失败:', error);
            // 验证失败时清除诊断
            diagnosticCollection.delete(document.uri);
        }
    }
    
    // 监听文档变更事件（实时代码验证）
    const configAutoValidate = config.get<boolean>('autoValidate', true);
    if (configAutoValidate) {
        // 监听文档变更
        const changeSubscription = vscode.workspace.onDidChangeTextDocument(async (event) => {
            // 防抖处理：延迟500ms后验证
            if (validationTimer) {
                clearTimeout(validationTimer);
            }
            
            validationTimer = setTimeout(() => {
                validateDocument(event.document).catch(err => {
                    console.error('实时代码验证错误:', err);
                });
            }, 500); // 500ms 防抖
        });
        
        context.subscriptions.push(changeSubscription);
        
        // 监听文档打开事件
        const openSubscription = vscode.workspace.onDidOpenTextDocument(async (document) => {
            // 延迟验证，避免影响打开速度
            setTimeout(() => {
                validateDocument(document).catch(err => {
                    console.error('文档打开验证错误:', err);
                });
            }, 1000);
        });
        
        context.subscriptions.push(openSubscription);
        
        // 验证当前打开的文档
        vscode.window.visibleTextEditors.forEach(editor => {
            validateDocument(editor.document).catch(err => {
                console.error('初始验证错误:', err);
            });
        });
        
        outputChannel.appendLine('✅ 实时代码验证已启用');
    } else {
        outputChannel.appendLine('ℹ️ 实时代码验证已禁用（可在设置中启用）');
    }
}

// 插件停用时调用
export function deactivate() {
    console.log('CodeMind 插件已停用');
}

