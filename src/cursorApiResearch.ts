import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { MemoryStorage, Memory, ImportanceLevel } from './memoryStorage';

/**
 * Cursor API 研究模块
 * 
 * 这个模块用于研究和尝试不同的 Cursor API 集成方式
 */
export class CursorApiResearch {
    private storage: MemoryStorage;
    private context: vscode.ExtensionContext;

    constructor(storage: MemoryStorage, context: vscode.ExtensionContext) {
        this.storage = storage;
        this.context = context;
    }

    /**
     * 方法 1: 尝试通过 .cursorrules 文件注入记忆
     * 
     * Cursor 支持 .cursorrules 文件来定义项目规则
     * 我们可以将记忆写入这个文件，让 Cursor AI 读取
     */
    async injectViaCursorRules(memories: Memory[]): Promise<boolean> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return false;
            }

            const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
            
            // 格式化记忆为规则格式
            const rulesContent = this.formatMemoriesAsRules(memories);
            
            // 读取现有规则（如果存在）
            let existingContent = '';
            if (fs.existsSync(cursorRulesPath)) {
                existingContent = fs.readFileSync(cursorRulesPath, 'utf-8');
            }

            // 检查是否已经包含我们的标记
            if (existingContent.includes('=== CodeMind ===')) {
                // 更新现有内容
                const updatedContent = this.updateCursorRules(existingContent, rulesContent);
                fs.writeFileSync(cursorRulesPath, updatedContent, 'utf-8');
            } else {
                // 追加新内容
                const newContent = existingContent + '\n\n' + rulesContent;
                fs.writeFileSync(cursorRulesPath, newContent, 'utf-8');
            }

            console.log('✅ 已通过 .cursorrules 文件注入记忆');
            return true;
        } catch (error) {
            console.error('通过 .cursorrules 注入失败:', error);
            return false;
        }
    }

    /**
     * 方法 2: 尝试通过 VS Code 命令注入
     * 
     * 查找 Cursor 特定的命令
     */
    async injectViaCommands(memories: Memory[]): Promise<boolean> {
        try {
            // 尝试查找 Cursor 特定的命令
            const cursorCommands = [
                'cursor.injectContext',
                'cursor.addContext',
                'cursor.setContext',
                'cursor.updateContext'
            ];

            const contextText = this.formatMemoriesAsContext(memories);

            for (const command of cursorCommands) {
                try {
                    // 尝试执行命令
                    await vscode.commands.executeCommand(command, contextText);
                    console.log(`✅ 成功通过命令 ${command} 注入记忆`);
                    return true;
                } catch (error) {
                    // 命令不存在，继续尝试下一个
                    continue;
                }
            }

            return false;
        } catch (error) {
            console.error('通过命令注入失败:', error);
            return false;
        }
    }

    /**
     * 方法 3: 尝试通过配置文件注入
     * 
     * 查找 Cursor 的配置文件位置
     */
    async injectViaConfig(memories: Memory[]): Promise<boolean> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return false;
            }

            // 可能的配置文件位置
            const configPaths = [
                path.join(workspaceFolder.uri.fsPath, '.cursor', 'config.json'),
                path.join(workspaceFolder.uri.fsPath, '.vscode', 'cursor.json'),
                path.join(workspaceFolder.uri.fsPath, 'cursor.config.json')
            ];

            const contextData = {
                memories: memories.map(m => ({
                    content: m.content,
                    category: m.category,
                    importance: m.importance,
                    tags: m.tags
                })),
                timestamp: Date.now(),
                source: 'CodeMind'
            };

            for (const configPath of configPaths) {
                try {
                    const configDir = path.dirname(configPath);
                    if (!fs.existsSync(configDir)) {
                        fs.mkdirSync(configDir, { recursive: true });
                    }

                    // 读取现有配置
                    let config: any = {};
                    if (fs.existsSync(configPath)) {
                        const existingContent = fs.readFileSync(configPath, 'utf-8');
                        config = JSON.parse(existingContent);
                    }

                    // 添加记忆上下文
                    config.memoryContext = contextData;

                    // 写入配置
                    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
                    console.log(`✅ 已通过配置文件 ${configPath} 注入记忆`);
                    return true;
                } catch (error) {
                    // 继续尝试下一个路径
                    continue;
                }
            }

            return false;
        } catch (error) {
            console.error('通过配置文件注入失败:', error);
            return false;
        }
    }

    /**
     * 方法 4: 尝试通过环境变量注入
     */
    async injectViaEnvironment(memories: Memory[]): Promise<boolean> {
        try {
            // 这个方法可能不太可行，因为环境变量通常不能动态设置
            // 但我们可以尝试通过设置来配置
            const config = vscode.workspace.getConfiguration('cursor');
            
            if (config) {
                const contextText = this.formatMemoriesAsContext(memories);
                // 尝试更新 Cursor 的配置
                await config.update('context', contextText, vscode.ConfigurationTarget.Workspace);
                console.log('✅ 已尝试通过配置注入记忆');
                return true;
            }

            return false;
        } catch (error) {
            console.error('通过环境变量注入失败:', error);
            return false;
        }
    }

    /**
     * 方法 5: 尝试通过 MCP (Model Context Protocol) 集成
     * 
     * Cursor 支持 MCP，我们可以尝试创建一个 MCP 服务器
     */
    async injectViaMCP(memories: Memory[]): Promise<boolean> {
        try {
            // MCP 集成需要创建服务器，这是一个更复杂的方案
            // 目前先记录这个方法，未来可以实现
            
            console.log('ℹ️ MCP 集成方案需要进一步研究');
            return false;
        } catch (error) {
            console.error('通过 MCP 注入失败:', error);
            return false;
        }
    }

    /**
     * 尝试所有方法，找到可用的方案
     */
    async tryAllMethods(memories: Memory[]): Promise<{
        success: boolean;
        method?: string;
        error?: string;
    }> {
        const methods = [
            { name: '.cursorrules', func: () => this.injectViaCursorRules(memories) },
            { name: 'Commands', func: () => this.injectViaCommands(memories) },
            { name: 'Config', func: () => this.injectViaConfig(memories) },
            { name: 'Environment', func: () => this.injectViaEnvironment(memories) },
            { name: 'MCP', func: () => this.injectViaMCP(memories) }
        ];

        for (const method of methods) {
            try {
                const success = await method.func();
                if (success) {
                    return {
                        success: true,
                        method: method.name
                    };
                }
            } catch (error) {
                console.error(`方法 ${method.name} 失败:`, error);
            }
        }

        return {
            success: false,
            error: '所有方法都失败了'
        };
    }

    /**
     * 格式化记忆为 .cursorrules 格式
     */
    private formatMemoriesAsRules(memories: Memory[]): string {
        let content = '\n=== CodeMind ===\n';
        content += '这些是项目的关键记忆和规则，AI 必须遵守。\n\n';

        // 按重要性分组
        const critical = memories.filter(m => m.importance === ImportanceLevel.CRITICAL);
        const high = memories.filter(m => m.importance === ImportanceLevel.HIGH);

        if (critical.length > 0) {
            content += '【强制遵守 - 不可违反】\n';
            for (const memory of critical.slice(0, 20)) {
                content += `- ${memory.content}\n`;
            }
            content += '\n';
        }

        if (high.length > 0) {
            content += '【建议遵守】\n';
            for (const memory of high.slice(0, 20)) {
                content += `- ${memory.content}\n`;
            }
            content += '\n';
        }

        content += '=== 记忆结束 ===\n';
        return content;
    }

    /**
     * 格式化记忆为上下文文本
     */
    private formatMemoriesAsContext(memories: Memory[]): string {
        let content = '=== Cursor Memory Context ===\n\n';
        
        for (const memory of memories.slice(0, 20)) {
            content += `[${memory.importance.toUpperCase()}] ${memory.content}\n`;
        }
        
        content += '\n=== End of Context ===\n';
        return content;
    }

    /**
     * 更新 .cursorrules 文件中的记忆部分
     */
    private updateCursorRules(existingContent: string, newRules: string): string {
        // 查找记忆部分的开始和结束
        const startMarker = '=== CodeMind ===';
        const endMarker = '=== 记忆结束 ===';

        const startIndex = existingContent.indexOf(startMarker);
        const endIndex = existingContent.indexOf(endMarker);

        if (startIndex !== -1 && endIndex !== -1) {
            // 替换现有部分
            const before = existingContent.substring(0, startIndex);
            const after = existingContent.substring(endIndex + endMarker.length);
            return before + newRules + after;
        } else {
            // 追加新部分
            return existingContent + '\n\n' + newRules;
        }
    }

    /**
     * 检查 Cursor 是否可用
     */
    async checkCursorAvailability(): Promise<{
        available: boolean;
        methods: string[];
    }> {
        const availableMethods: string[] = [];

        // 检查 .cursorrules 文件是否可写
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
            try {
                // 尝试写入测试文件
                fs.writeFileSync(cursorRulesPath + '.test', 'test', 'utf-8');
                fs.unlinkSync(cursorRulesPath + '.test');
                availableMethods.push('.cursorrules');
            } catch (error) {
                // 不可写
            }
        }

        // 检查 Cursor 命令是否可用
        const cursorCommands = [
            'cursor.injectContext',
            'cursor.addContext',
            'cursor.setContext'
        ];

        for (const command of cursorCommands) {
            try {
                const commands = await vscode.commands.getCommands();
                if (commands.includes(command)) {
                    availableMethods.push(`Command: ${command}`);
                }
            } catch (error) {
                // 命令不可用
            }
        }

        return {
            available: availableMethods.length > 0,
            methods: availableMethods
        };
    }
}

