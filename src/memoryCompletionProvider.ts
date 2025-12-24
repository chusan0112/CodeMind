import * as vscode from 'vscode';
import { MemoryStorage, Memory, ImportanceLevel, MemoryCategory } from './memoryStorage';
import { CodeAnalyzer } from './codeAnalyzer';

// 记忆补全项
interface MemoryCompletionItem extends vscode.CompletionItem {
    memory: Memory;
    relevanceScore: number;
}

// 记忆补全提供者
export class MemoryCompletionProvider implements vscode.CompletionItemProvider {
    private storage: MemoryStorage;
    private memories: Memory[] = [];
    private lastUpdateTime: number = 0;
    private updateInterval: number = 5000; // 5秒更新一次

    constructor(storage: MemoryStorage) {
        this.storage = storage;
        this.loadMemories();
    }

    // 加载记忆
    private async loadMemories(): Promise<void> {
        try {
            this.memories = await this.storage.loadMemories();
            this.lastUpdateTime = Date.now();
        } catch (error) {
            console.error('加载记忆失败:', error);
        }
    }

    // 提供补全项
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        // 定期更新记忆
        if (Date.now() - this.lastUpdateTime > this.updateInterval) {
            this.loadMemories();
        }

        // 获取当前行的文本
        const line = document.lineAt(position.line);
        const lineText = line.text;
        const beforeCursor = lineText.substring(0, position.character);

        // 分析当前代码上下文
        const codeContext = this.analyzeCodeContext(document, position);

        // 根据上下文选择相关记忆
        const relevantMemories = this.selectRelevantMemories(codeContext, beforeCursor);

        // 转换为补全项
        const completionItems = this.createCompletionItems(relevantMemories, codeContext);

        return new vscode.CompletionList(completionItems, false);
    }

    // 分析代码上下文
    private analyzeCodeContext(document: vscode.TextDocument, position: vscode.Position): {
        language: string;
        functions: string[];
        classes: string[];
        imports: string[];
        keywords: string[];
        currentLine: string;
        beforeCursor: string;
    } {
        const language = document.languageId;
        const code = document.getText();
        const line = document.lineAt(position.line);
        const currentLine = line.text;
        const beforeCursor = currentLine.substring(0, position.character);

        // 提取函数名、类名、导入等（简化版）
        const functions: string[] = [];
        const classes: string[] = [];
        const imports: string[] = [];
        const keywords: string[] = [];

        // 提取函数名（根据语言）
        if (language === 'go') {
            const funcMatches = code.match(/func\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g);
            if (funcMatches) {
                funcMatches.forEach(m => {
                    const name = m.match(/func\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
                    if (name) functions.push(name);
                });
            }
        } else if (language === 'javascript' || language === 'typescript') {
            const funcMatches = code.match(/(?:function\s+([A-Za-z_][A-Za-z0-9_]*)|const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s+)?\(/g);
            if (funcMatches) {
                funcMatches.forEach(m => {
                    const name = m.match(/(?:function\s+([A-Za-z_][A-Za-z0-9_]*)|const\s+([A-Za-z_][A-Za-z0-9_]*))/)?.[1] || 
                                m.match(/(?:function\s+([A-Za-z_][A-Za-z0-9_]*)|const\s+([A-Za-z_][A-Za-z0-9_]*))/)?.[2];
                    if (name) functions.push(name);
                });
            }
        }

        // 提取类名
        if (language === 'go') {
            const classMatches = code.match(/type\s+([A-Z][A-Za-z0-9_]*)\s+struct/g);
            if (classMatches) {
                classMatches.forEach(m => {
                    const name = m.match(/type\s+([A-Z][A-Za-z0-9_]*)/)?.[1];
                    if (name) classes.push(name);
                });
            }
        } else if (language === 'javascript' || language === 'typescript' || language === 'java') {
            const classMatches = code.match(/(?:class|interface)\s+([A-Z][A-Za-z0-9_]*)/g);
            if (classMatches) {
                classMatches.forEach(m => {
                    const name = m.match(/(?:class|interface)\s+([A-Z][A-Za-z0-9_]*)/)?.[1];
                    if (name) classes.push(name);
                });
            }
        }

        // 提取关键词
        const commonKeywords = ['api', 'endpoint', 'route', 'handler', 'controller', 'service', 'model', 'entity'];
        commonKeywords.forEach(keyword => {
            if (code.toLowerCase().includes(keyword)) {
                keywords.push(keyword);
            }
        });

        return {
            language,
            functions,
            classes,
            imports,
            keywords,
            currentLine,
            beforeCursor
        };
    }

    // 选择相关记忆
    private selectRelevantMemories(
        context: ReturnType<typeof this.analyzeCodeContext>,
        beforeCursor: string
    ): Memory[] {
        const relevantMemories: Array<{ memory: Memory; score: number }> = [];

        for (const memory of this.memories) {
            let score = 0;

            // 1. 强制级记忆总是包含
            if (memory.importance === ImportanceLevel.CRITICAL) {
                score += 100;
            }

            // 2. 检查标签匹配
            const matchingTags = memory.tags.filter(tag => {
                const tagLower = tag.toLowerCase();
                return context.functions.some(f => f.toLowerCase().includes(tagLower)) ||
                       context.classes.some(c => c.toLowerCase().includes(tagLower)) ||
                       context.keywords.some(k => k.toLowerCase().includes(tagLower)) ||
                       beforeCursor.toLowerCase().includes(tagLower);
            });
            score += matchingTags.length * 10;

            // 3. 检查内容匹配
            const contentLower = memory.content.toLowerCase();
            const beforeCursorLower = beforeCursor.toLowerCase();
            
            // 检查当前输入是否匹配记忆内容
            if (beforeCursorLower.length > 0) {
                const words = beforeCursorLower.split(/\s+/);
                for (const word of words) {
                    if (word.length > 2 && contentLower.includes(word)) {
                        score += 5;
                    }
                }
            }

            // 4. 检查分类匹配
            if (context.keywords.length > 0) {
                const keywordLower = context.keywords.join(' ').toLowerCase();
                if (memory.category === MemoryCategory.API_SPEC && keywordLower.includes('api')) {
                    score += 20;
                }
                if (memory.category === MemoryCategory.ARCHITECTURE && keywordLower.includes('architecture')) {
                    score += 20;
                }
                if (memory.category === MemoryCategory.CODE_STYLE && keywordLower.includes('style')) {
                    score += 20;
                }
            }

            // 5. 重要性加权
            if (memory.importance === ImportanceLevel.HIGH) {
                score *= 1.5;
            }

            if (score > 10) {
                relevantMemories.push({ memory, score });
            }
        }

        // 按评分排序，返回前10条
        relevantMemories.sort((a, b) => b.score - a.score);
        return relevantMemories.slice(0, 10).map(m => m.memory);
    }

    // 创建补全项
    private createCompletionItems(
        memories: Memory[],
        context: ReturnType<typeof this.analyzeCodeContext>
    ): MemoryCompletionItem[] {
        const items: MemoryCompletionItem[] = [];

        for (const memory of memories) {
            // 根据记忆类型创建不同的补全项
            const item = this.createCompletionItemFromMemory(memory, context);
            if (item) {
                items.push(item);
            }
        }

        return items;
    }

    // 从记忆创建补全项
    private createCompletionItemFromMemory(
        memory: Memory,
        context: ReturnType<typeof this.analyzeCodeContext>
    ): MemoryCompletionItem | null {
        // 提取记忆中的关键信息
        const content = memory.content;
        
        // 根据记忆分类创建不同的补全项
        let label = '';
        let insertText = '';
        let detail = '';
        let kind = vscode.CompletionItemKind.Text;

        switch (memory.category) {
            case MemoryCategory.API_SPEC:
                // API 规范：提取 API 路径和方法
                const apiMatch = content.match(/(?:GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-]+)|([\/\w\-]+)\s+(?:GET|POST|PUT|DELETE|PATCH)/i);
                if (apiMatch) {
                    label = `API: ${apiMatch[1] || apiMatch[2]}`;
                    insertText = apiMatch[1] || apiMatch[2] || '';
                    detail = content.substring(0, 100);
                    kind = vscode.CompletionItemKind.Method;
                } else {
                    label = `API规范: ${content.substring(0, 50)}`;
                    insertText = content.substring(0, 100);
                    detail = content;
                    kind = vscode.CompletionItemKind.Reference;
                }
                break;

            case MemoryCategory.ARCHITECTURE:
                label = `架构: ${content.substring(0, 50)}`;
                insertText = content.substring(0, 100);
                detail = content;
                kind = vscode.CompletionItemKind.Struct;
                break;

            case MemoryCategory.BUSINESS_RULE:
                label = `业务规则: ${content.substring(0, 50)}`;
                insertText = content.substring(0, 100);
                detail = content;
                kind = vscode.CompletionItemKind.Event;
                break;

            case MemoryCategory.CONSTRAINT:
                label = `约束: ${content.substring(0, 50)}`;
                insertText = content.substring(0, 100);
                detail = content;
                kind = vscode.CompletionItemKind.Constant;
                break;

            case MemoryCategory.CODE_STYLE:
                label = `代码风格: ${content.substring(0, 50)}`;
                insertText = content.substring(0, 100);
                detail = content;
                kind = vscode.CompletionItemKind.Snippet;
                break;

            default:
                label = content.substring(0, 50);
                insertText = content.substring(0, 100);
                detail = content;
                kind = vscode.CompletionItemKind.Text;
        }

        const item = new vscode.CompletionItem(label, kind) as MemoryCompletionItem;
        item.insertText = insertText;
        item.detail = detail;
        item.documentation = new vscode.MarkdownString(`**记忆类型**: ${this.getCategoryLabel(memory.category)}\n\n**重要性**: ${this.getImportanceLabel(memory.importance)}\n\n**内容**: ${content}`);
        item.memory = memory;
        item.relevanceScore = memory.importance === ImportanceLevel.CRITICAL ? 100 : 
                            memory.importance === ImportanceLevel.HIGH ? 80 : 
                            memory.importance === ImportanceLevel.MEDIUM ? 60 : 40;

        // 设置排序优先级
        item.sortText = String(1000 - item.relevanceScore).padStart(4, '0');

        return item;
    }

    // 获取分类标签
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

    // 获取重要性标签
    private getImportanceLabel(importance: ImportanceLevel): string {
        const labels: Record<ImportanceLevel, string> = {
            [ImportanceLevel.CRITICAL]: '强制级',
            [ImportanceLevel.HIGH]: '推荐级',
            [ImportanceLevel.MEDIUM]: '参考级',
            [ImportanceLevel.LOW]: '低优先级'
        };
        return labels[importance] || importance;
    }
}

