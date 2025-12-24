import * as vscode from 'vscode';
import { MemoryStorage, Memory, ImportanceLevel } from './memoryStorage';
import * as path from 'path';
import { CursorApiResearch } from './cursorApiResearch';

// 代码特征接口
interface CodeFeatures {
    filePath: string;
    fileName: string;
    fileDir: string;
    language: string;
    functions: string[];
    classes: string[];
    imports: string[];
    keywords: string[];
    content: string;
}

// 记忆相关性评分
interface MemoryRelevance {
    memory: Memory;
    score: number;
}

// 记忆注入器类
export class MemoryInjector {
    private storage: MemoryStorage;
    private context: vscode.ExtensionContext;
    private injectedMemories: Set<string> = new Set(); // 已注入的记忆ID
    private cursorApiResearch: CursorApiResearch; // Cursor API 研究模块

    constructor(storage: MemoryStorage, context: vscode.ExtensionContext) {
        this.storage = storage;
        this.context = context;
        this.cursorApiResearch = new CursorApiResearch(storage, context);
    }

    // 提取代码特征
    private async extractCodeFeatures(filePath: string): Promise<CodeFeatures> {
        const fileName = path.basename(filePath);
        const fileDir = path.dirname(filePath);
        const language = this.detectLanguage(filePath);
        
        // 尝试读取文件内容
        let content = '';
        let functions: string[] = [];
        let classes: string[] = [];
        let imports: string[] = [];
        let keywords: string[] = [];
        
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            content = document.getText();
            
            // 提取函数名、类名、导入等
            functions = this.extractFunctions(content, language);
            classes = this.extractClasses(content, language);
            imports = this.extractImports(content, language);
            keywords = this.extractKeywords(content, language);
        } catch (error) {
            // 如果无法读取文件，使用文件名和路径作为特征
            const pathParts = filePath.split(/[/\\]/);
            keywords = [...pathParts, fileName];
        }
        
        return {
            filePath,
            fileName,
            fileDir,
            language,
            functions,
            classes,
            imports,
            keywords,
            content
        };
    }

    // 检测语言
    private detectLanguage(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const langMap: { [key: string]: string } = {
            '.go': 'go',
            '.java': 'java',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.py': 'python',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.php': 'php',
            '.rb': 'ruby'
        };
        return langMap[ext] || 'unknown';
    }

    // 提取函数名
    private extractFunctions(content: string, language: string): string[] {
        const functions: string[] = [];
        
        // Go: func FunctionName
        if (language === 'go') {
            const matches = content.match(/func\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g);
            if (matches) {
                matches.forEach(m => {
                    const name = m.match(/func\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
                    if (name) functions.push(name);
                });
            }
        }
        
        // JavaScript/TypeScript: function name or const name =
        if (language === 'javascript' || language === 'typescript') {
            const matches = content.match(/(?:function\s+([A-Za-z_][A-Za-z0-9_]*)|const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s+)?\(|([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?:async\s+)?\(/g);
            if (matches) {
                matches.forEach(m => {
                    const name = m.match(/(?:function\s+([A-Za-z_][A-Za-z0-9_]*)|const\s+([A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)\s*:)/)?.[1] || 
                                m.match(/(?:function\s+([A-Za-z_][A-Za-z0-9_]*)|const\s+([A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)\s*:)/)?.[2] ||
                                m.match(/(?:function\s+([A-Za-z_][A-Za-z0-9_]*)|const\s+([A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)\s*:)/)?.[3];
                    if (name) functions.push(name);
                });
            }
        }
        
        // Java: public/private returnType methodName
        if (language === 'java') {
            const matches = content.match(/(?:public|private|protected)\s+\w+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g);
            if (matches) {
                matches.forEach(m => {
                    const name = m.match(/(?:public|private|protected)\s+\w+\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
                    if (name) functions.push(name);
                });
            }
        }
        
        // Python: def function_name
        if (language === 'python') {
            const matches = content.match(/def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g);
            if (matches) {
                matches.forEach(m => {
                    const name = m.match(/def\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
                    if (name) functions.push(name);
                });
            }
        }
        
        return functions.slice(0, 20); // 最多20个
    }

    // 提取类名
    private extractClasses(content: string, language: string): string[] {
        const classes: string[] = [];
        
        // Go: type StructName struct
        if (language === 'go') {
            const matches = content.match(/type\s+([A-Z][A-Za-z0-9_]*)\s+struct/g);
            if (matches) {
                matches.forEach(m => {
                    const name = m.match(/type\s+([A-Z][A-Za-z0-9_]*)/)?.[1];
                    if (name) classes.push(name);
                });
            }
        }
        
        // JavaScript/TypeScript: class ClassName
        if (language === 'javascript' || language === 'typescript') {
            const matches = content.match(/class\s+([A-Z][A-Za-z0-9_]*)/g);
            if (matches) {
                matches.forEach(m => {
                    const name = m.match(/class\s+([A-Z][A-Za-z0-9_]*)/)?.[1];
                    if (name) classes.push(name);
                });
            }
        }
        
        // Java: public class ClassName
        if (language === 'java') {
            const matches = content.match(/(?:public\s+)?class\s+([A-Z][A-Za-z0-9_]*)/g);
            if (matches) {
                matches.forEach(m => {
                    const name = m.match(/(?:public\s+)?class\s+([A-Z][A-Za-z0-9_]*)/)?.[1];
                    if (name) classes.push(name);
                });
            }
        }
        
        // Python: class ClassName
        if (language === 'python') {
            const matches = content.match(/class\s+([A-Z][A-Za-z0-9_]*)/g);
            if (matches) {
                matches.forEach(m => {
                    const name = m.match(/class\s+([A-Z][A-Za-z0-9_]*)/)?.[1];
                    if (name) classes.push(name);
                });
            }
        }
        
        return classes.slice(0, 20); // 最多20个
    }

    // 提取导入
    private extractImports(content: string, language: string): string[] {
        const imports: string[] = [];
        
        // Go: import "package"
        if (language === 'go') {
            const matches = content.match(/import\s+(?:"([^"]+)"|\(([^)]+)\))/g);
            if (matches) {
                matches.forEach(m => {
                    const pkg = m.match(/"([^"]+)"/)?.[1] || m.match(/\(([^)]+)\)/)?.[1];
                    if (pkg) imports.push(pkg.split(/\s+/)[0]);
                });
            }
        }
        
        // JavaScript/TypeScript: import ... from "package"
        if (language === 'javascript' || language === 'typescript') {
            const matches = content.match(/import\s+.*from\s+["']([^"']+)["']/g);
            if (matches) {
                matches.forEach(m => {
                    const pkg = m.match(/from\s+["']([^"']+)["']/)?.[1];
                    if (pkg) imports.push(pkg);
                });
            }
        }
        
        // Java: import package.Class
        if (language === 'java') {
            const matches = content.match(/import\s+([a-z][a-z0-9_.]*)/g);
            if (matches) {
                matches.forEach(m => {
                    const pkg = m.match(/import\s+([a-z][a-z0-9_.]*)/)?.[1];
                    if (pkg) imports.push(pkg);
                });
            }
        }
        
        // Python: import package
        if (language === 'python') {
            const matches = content.match(/import\s+([A-Za-z0-9_.]+)/g);
            if (matches) {
                matches.forEach(m => {
                    const pkg = m.match(/import\s+([A-Za-z0-9_.]+)/)?.[1];
                    if (pkg) imports.push(pkg.split('.')[0]);
                });
            }
        }
        
        return imports.slice(0, 20); // 最多20个
    }

    // 提取关键词
    private extractKeywords(content: string, language: string): string[] {
        const keywords: string[] = [];
        const contentLower = content.toLowerCase();
        
        // 提取常见的编程关键词
        const commonKeywords = [
            'api', 'endpoint', 'route', 'handler', 'controller', 'service',
            'model', 'entity', 'database', 'db', 'query', 'sql',
            'config', 'setting', 'environment', 'env',
            'error', 'exception', 'validation', 'validate',
            'auth', 'authentication', 'authorization', 'security',
            'cache', 'redis', 'session', 'cookie',
            'async', 'await', 'promise', 'callback',
            'test', 'unit', 'integration', 'mock'
        ];
        
        commonKeywords.forEach(keyword => {
            if (contentLower.includes(keyword)) {
                keywords.push(keyword);
            }
        });
        
        return keywords.slice(0, 20); // 最多20个
    }

    // 计算记忆相关性评分
    private calculateRelevance(memory: Memory, features: CodeFeatures): number {
        let score = 0;
        
        // 1. 强制级记忆总是包含（高分）
        if (memory.importance === ImportanceLevel.CRITICAL) {
            score += 100;
        }
        
        // 2. 检查文件路径匹配
        if (memory.relatedFiles && memory.relatedFiles.length > 0) {
            const isRelated = memory.relatedFiles.some(relatedFile => {
                return features.filePath.includes(relatedFile) || relatedFile.includes(features.filePath);
            });
            if (isRelated) {
                score += 50;
            }
        }
        
        // 3. 检查标签匹配
        const matchingTags = memory.tags.filter(tag => {
            const tagLower = tag.toLowerCase();
            return features.fileName.toLowerCase().includes(tagLower) ||
                   features.fileDir.toLowerCase().includes(tagLower) ||
                   features.functions.some(f => f.toLowerCase().includes(tagLower)) ||
                   features.classes.some(c => c.toLowerCase().includes(tagLower)) ||
                   features.keywords.some(k => k.toLowerCase().includes(tagLower));
        });
        score += matchingTags.length * 10;
        
        // 4. 检查函数名匹配
        const matchingFunctions = features.functions.filter(f => {
            const fLower = f.toLowerCase();
            return memory.content.toLowerCase().includes(fLower) ||
                   memory.tags.some(t => t.toLowerCase().includes(fLower));
        });
        score += matchingFunctions.length * 5;
        
        // 5. 检查类名匹配
        const matchingClasses = features.classes.filter(c => {
            const cLower = c.toLowerCase();
            return memory.content.toLowerCase().includes(cLower) ||
                   memory.tags.some(t => t.toLowerCase().includes(cLower));
        });
        score += matchingClasses.length * 5;
        
        // 6. 检查导入匹配
        const matchingImports = features.imports.filter(imp => {
            const impLower = imp.toLowerCase();
            return memory.content.toLowerCase().includes(impLower);
        });
        score += matchingImports.length * 3;
        
        // 7. 检查关键词匹配
        const matchingKeywords = features.keywords.filter(k => {
            const kLower = k.toLowerCase();
            return memory.content.toLowerCase().includes(kLower) ||
                   memory.tags.some(t => t.toLowerCase().includes(kLower));
        });
        score += matchingKeywords.length * 2;
        
        // 8. 内容相似度（简单匹配）
        const contentLower = memory.content.toLowerCase();
        const featuresText = [
            ...features.functions,
            ...features.classes,
            ...features.keywords
        ].join(' ').toLowerCase();
        
        const commonWords = featuresText.split(/\s+/).filter(word => 
            word.length > 3 && contentLower.includes(word)
        );
        score += commonWords.length * 1;
        
        // 9. 重要性加权
        if (memory.importance === ImportanceLevel.HIGH) {
            score *= 1.5;
        } else if (memory.importance === ImportanceLevel.MEDIUM) {
            score *= 1.2;
        }
        
        return score;
    }

    // 获取当前文件相关的记忆（智能选择）
    async getRelevantMemoriesForFile(filePath?: string): Promise<Memory[]> {
        const memories = await this.storage.loadMemories();
        
        if (!filePath) {
            // 如果没有文件路径，返回所有强制级和推荐级记忆
            return memories.filter(m => 
                m.importance === ImportanceLevel.CRITICAL || 
                m.importance === ImportanceLevel.HIGH
            );
        }

        // 提取代码特征
        const features = await this.extractCodeFeatures(filePath);
        
        // 计算每个记忆的相关性评分
        const memoryRelevances: MemoryRelevance[] = memories.map(memory => ({
            memory,
            score: this.calculateRelevance(memory, features)
        }));
        
        // 按评分排序（高分在前）
        memoryRelevances.sort((a, b) => b.score - a.score);
        
        // 选择相关记忆：
        // 1. 强制级记忆总是包含
        // 2. 评分 > 10 的记忆
        // 3. 最多返回 20 条记忆
        const relevantMemories: Memory[] = [];
        const criticalMemories = memoryRelevances.filter(mr => mr.memory.importance === ImportanceLevel.CRITICAL);
        const otherMemories = memoryRelevances.filter(mr => mr.memory.importance !== ImportanceLevel.CRITICAL && mr.score > 10);
        
        // 先添加所有强制级记忆
        relevantMemories.push(...criticalMemories.map(mr => mr.memory));
        
        // 再添加其他相关记忆，直到达到限制
        const remaining = 20 - relevantMemories.length;
        relevantMemories.push(...otherMemories.slice(0, remaining).map(mr => mr.memory));
        
        return relevantMemories;
    }

    // 格式化记忆为上下文文本（压缩版本，突破TOKEN限制）
    formatMemoriesAsContext(memories: Memory[], maxTokens: number = 2000): string {
        if (memories.length === 0) {
            return '';
        }

        // 压缩记忆内容，只保留关键信息
        const compressedMemories = this.compressMemories(memories, maxTokens);
        
        // 使用更清晰的格式，确保 AI 能识别
        let context = '\n\n';
        context += '========================================\n';
        context += 'CURSOR MEMORY CONTEXT - PROJECT RULES\n';
        context += '========================================\n';
        context += 'These are the project memories and rules that MUST be followed.\n';
        context += 'DO NOT modify or ignore these rules.\n';
        context += '========================================\n\n';
        
        // 按重要性分组
        const critical = compressedMemories.filter(m => m.importance === ImportanceLevel.CRITICAL);
        const high = compressedMemories.filter(m => m.importance === ImportanceLevel.HIGH);
        const medium = compressedMemories.filter(m => m.importance === ImportanceLevel.MEDIUM);
        
        // 强制级记忆（必须遵守，限制数量以节省TOKEN）
        if (critical.length > 0) {
            context += '[CRITICAL] MUST FOLLOW - DO NOT VIOLATE:\n';
            context += '----------------------------------------\n';
            for (const memory of critical.slice(0, 10)) { // 最多10条
                context += `✓ ${memory.content}\n`;
            }
            context += '\n';
        }
        
        // 推荐级记忆（建议遵守）
        if (high.length > 0 && critical.length < 10) {
            context += '[HIGH] STRONGLY RECOMMENDED:\n';
            context += '----------------------------------------\n';
            const remaining = 10 - critical.length;
            for (const memory of high.slice(0, remaining)) {
                context += `• ${memory.content}\n`;
            }
            context += '\n';
        }
        
        // 中等重要性记忆（如果还有空间）
        if (medium.length > 0 && critical.length + high.length < 10) {
            context += '[MEDIUM] RECOMMENDED:\n';
            context += '----------------------------------------\n';
            const remaining = 10 - critical.length - high.length;
            for (const memory of medium.slice(0, remaining)) {
                context += `- ${memory.content}\n`;
            }
            context += '\n';
        }
        
        context += '========================================\n';
        context += 'END OF MEMORY CONTEXT\n';
        context += '========================================\n\n';
        
        return context;
    }

    // 压缩记忆内容，去除冗余，只保留关键信息
    private compressMemories(memories: Memory[], maxTokens: number): Memory[] {
        // 按重要性排序
        const sorted = [...memories].sort((a, b) => {
            const importanceOrder = {
                [ImportanceLevel.CRITICAL]: 0,
                [ImportanceLevel.HIGH]: 1,
                [ImportanceLevel.MEDIUM]: 2,
                [ImportanceLevel.LOW]: 3
            };
            return importanceOrder[a.importance] - importanceOrder[b.importance];
        });

        const compressed: Memory[] = [];
        let tokenCount = 0;

        for (const memory of sorted) {
            // 压缩内容（去除冗余信息）
            const compressedContent = this.compressContent(memory.content);
            const contentTokens = this.estimateTokens(compressedContent);
            
            if (tokenCount + contentTokens <= maxTokens) {
                compressed.push({
                    ...memory,
                    content: compressedContent
                });
                tokenCount += contentTokens;
            } else {
                // 如果超过限制，优先保留强制级记忆
                if (memory.importance === ImportanceLevel.CRITICAL && compressed.length < 20) {
                    compressed.push({
                        ...memory,
                        content: this.compressContent(memory.content, true) // 进一步压缩
                    });
                }
                break;
            }
        }

        return compressed;
    }

    // 压缩内容，去除冗余
    private compressContent(content: string, aggressive: boolean = false): string {
        let compressed = content;

        // 移除重复的空格和换行
        compressed = compressed.replace(/\s+/g, ' ').trim();

        // 移除常见的冗余词汇
        const redundantWords = ['的', '了', '和', '或', '以及', '还有'];
        if (aggressive) {
            for (const word of redundantWords) {
                compressed = compressed.replace(new RegExp(word, 'g'), '');
            }
        }

        // 如果内容太长，截取关键部分
        if (compressed.length > 200 && aggressive) {
            // 保留开头和结尾
            compressed = compressed.substring(0, 100) + '...' + compressed.substring(compressed.length - 100);
        } else if (compressed.length > 300) {
            compressed = compressed.substring(0, 300) + '...';
        }

        return compressed;
    }

    // 估算TOKEN数量（简单估算：1个中文字符≈1.5个token，1个英文单词≈1个token）
    private estimateTokens(text: string): number {
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = text.split(/\s+/).filter(w => /[a-zA-Z]/.test(w)).length;
        return Math.ceil(chineseChars * 1.5 + englishWords);
    }

    // 注入记忆到 AI 上下文（通过注释方式）
    async injectMemoriesToEditor(editor: vscode.TextEditor): Promise<void> {
        const filePath = editor.document.fileName;
        const memories = await this.getRelevantMemoriesForFile(filePath);
        
        if (memories.length === 0) {
            return;
        }

        // 格式化记忆
        const contextText = this.formatMemoriesAsContext(memories);
        
        // 在文件开头插入记忆上下文（作为注释）
        // 注意：这只是一个示例实现，实际可能需要通过 Cursor API 注入
        const firstLine = editor.document.lineAt(0);
        const insertPosition = new vscode.Position(0, 0);
        
        // 检查是否已经注入过（检查新的标记）
        const existingText = editor.document.getText();
        if (existingText.includes('CURSOR MEMORY CONTEXT') || existingText.includes('--- 项目记忆上下文 ---')) {
            // 已经注入过，跳过
            return;
        }

        // 根据文件类型选择注释格式
        const language = editor.document.languageId;
        let commentPrefix = '';
        
        if (language === 'go' || language === 'javascript' || language === 'typescript' || language === 'java' || language === 'c' || language === 'cpp' || language === 'csharp') {
            commentPrefix = '// ';
        } else if (language === 'python' || language === 'ruby' || language === 'shell') {
            commentPrefix = '# ';
        } else if (language === 'html' || language === 'xml') {
            commentPrefix = '<!-- ';
            const commentSuffix = ' -->';
            const commentedText = contextText.split('\n').map(line => 
                line.trim() ? `${commentPrefix}${line}${commentSuffix}` : ''
            ).join('\n');
            
            editor.edit(editBuilder => {
                editBuilder.insert(insertPosition, commentedText + '\n\n');
            });
            return;
        }
        
        // 添加注释前缀
        const commentedText = contextText.split('\n').map(line => 
            line.trim() ? `${commentPrefix}${line}` : ''
        ).join('\n');
        
        // 插入到文件开头
        editor.edit(editBuilder => {
            editBuilder.insert(insertPosition, commentedText + '\n\n');
        }).then(() => {
            // 记录已注入的记忆
            memories.forEach(m => this.injectedMemories.add(m.id));
        });
    }

    // 获取记忆上下文文本（用于 AI 对话）
    async getContextText(filePath?: string): Promise<string> {
        const memories = await this.getRelevantMemoriesForFile(filePath);
        return this.formatMemoriesAsContext(memories);
    }

    // 监听文件变化，自动注入记忆（确保关键记忆自动调用）
    setupAutoInject(context: vscode.ExtensionContext): void {
        const config = vscode.workspace.getConfiguration('memoryManager');
        if (!config.get<boolean>('autoInject', true)) {
            return;
        }

        // 监听文件打开事件
        const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(async (document) => {
            // 只处理源代码文件
            const sourceLanguages = ['go', 'java', 'javascript', 'typescript', 'python', 'rust', 'c', 'cpp', 'csharp', 'php', 'ruby'];
            if (!sourceLanguages.includes(document.languageId)) {
                return;
            }

            // 延迟注入，避免影响打开速度
            setTimeout(async () => {
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document === document) {
                    // 自动获取相关记忆并准备注入
                    const memories = await this.getRelevantMemoriesForFile(document.fileName);
                    if (memories.length > 0) {
                        console.log(`自动准备注入 ${memories.length} 条记忆到文件:`, document.fileName);
                        // 尝试通过 Cursor API 注入（优先使用 .cursorrules）
                        await this.tryInjectViaCursorApi(memories);
                    }
                }
            }, 1000);
        });

        // 监听文件激活事件（切换文件时）
        const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (!editor) {
                return;
            }

            const config = vscode.workspace.getConfiguration('memoryManager');
            if (!config.get<boolean>('autoInject', true)) {
                return;
            }

            const document = editor.document;
            const sourceLanguages = ['go', 'java', 'javascript', 'typescript', 'python', 'rust', 'c', 'cpp', 'csharp', 'php', 'ruby'];
            if (!sourceLanguages.includes(document.languageId)) {
                return;
            }

            // 自动获取相关记忆
            const memories = await this.getRelevantMemoriesForFile(document.fileName);
            if (memories.length > 0) {
                console.log(`文件激活，准备注入 ${memories.length} 条记忆:`, document.fileName);
                
                // 尝试通过 Cursor API 注入（优先使用 .cursorrules）
                await this.tryInjectViaCursorApi(memories);
            }
        });

        context.subscriptions.push(onDidOpenTextDocument);
        context.subscriptions.push(onDidChangeActiveTextEditor);
    }

    // 获取压缩后的记忆上下文（用于AI对话，突破TOKEN限制）
    async getCompressedContext(filePath?: string, maxTokens: number = 2000): Promise<string> {
        const memories = await this.getRelevantMemoriesForFile(filePath);
        return this.formatMemoriesAsContext(memories, maxTokens);
    }

    // 清除已注入的记忆记录
    clearInjectedMemories(): void {
        this.injectedMemories.clear();
    }

    /**
     * 尝试通过 Cursor API 注入记忆
     * 优先使用 .cursorrules 文件，这是最可靠的方式
     */
    private async tryInjectViaCursorApi(memories: Memory[]): Promise<void> {
        try {
            // 方法 1: 通过 .cursorrules 文件注入（最可靠）
            const success = await this.cursorApiResearch.injectViaCursorRules(memories);
            if (success) {
                console.log('✅ 已通过 .cursorrules 文件注入记忆到 Cursor AI 上下文');
                return;
            }

            // 方法 2: 尝试通过命令注入
            const commandSuccess = await this.cursorApiResearch.injectViaCommands(memories);
            if (commandSuccess) {
                console.log('✅ 已通过 Cursor 命令注入记忆');
                return;
            }

            // 方法 3: 尝试通过配置文件注入
            const configSuccess = await this.cursorApiResearch.injectViaConfig(memories);
            if (configSuccess) {
                console.log('✅ 已通过配置文件注入记忆');
                return;
            }

            // 如果所有方法都失败，回退到注释方式
            console.log('ℹ️ Cursor API 注入失败，使用注释方式作为备选');
        } catch (error) {
            console.error('Cursor API 注入失败:', error);
        }
    }

    /**
     * 检查 Cursor API 可用性
     */
    async checkCursorApiAvailability(): Promise<{
        available: boolean;
        methods: string[];
    }> {
        return await this.cursorApiResearch.checkCursorAvailability();
    }
}

