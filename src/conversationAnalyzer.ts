import * as vscode from 'vscode';
import { MemoryStorage, Memory, MemoryCategory, ImportanceLevel } from './memoryStorage';
import { CodeAnalyzer } from './codeAnalyzer';

// 对话消息接口
interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}

// 对话分析结果
interface ConversationAnalysisResult {
    memories: Memory[];
    extractedInfo: {
        architectureDecisions: string[];
        businessRules: string[];
        constraints: string[];
        apiSpecs: string[];
        codePatterns: string[];
    };
}

// 对话分析器类
export class ConversationAnalyzer {
    private storage: MemoryStorage;
    private context: vscode.ExtensionContext;

    constructor(storage: MemoryStorage, context: vscode.ExtensionContext) {
        this.storage = storage;
        this.context = context;
    }

    // 分析对话历史，提取关键记忆
    async analyzeConversation(messages: ConversationMessage[]): Promise<ConversationAnalysisResult> {
        const memories: Memory[] = [];
        const extractedInfo = {
            architectureDecisions: [] as string[],
            businessRules: [] as string[],
            constraints: [] as string[],
            apiSpecs: [] as string[],
            codePatterns: [] as string[]
        };

        // 分析每条消息
        for (const message of messages) {
            if (message.role === 'assistant') {
                // 分析 AI 的回复，提取关键信息
                const analysis = this.analyzeAssistantMessage(message.content);
                
                // 提取架构决策
                if (analysis.architectureDecisions.length > 0) {
                    extractedInfo.architectureDecisions.push(...analysis.architectureDecisions);
                    for (const decision of analysis.architectureDecisions) {
                        memories.push(this.createMemory(
                            decision,
                            MemoryCategory.ARCHITECTURE,
                            ImportanceLevel.HIGH,
                            ['conversation-extracted', 'architecture']
                        ));
                    }
                }
                
                // 提取业务规则
                if (analysis.businessRules.length > 0) {
                    extractedInfo.businessRules.push(...analysis.businessRules);
                    for (const rule of analysis.businessRules) {
                        memories.push(this.createMemory(
                            rule,
                            MemoryCategory.BUSINESS_RULE,
                            ImportanceLevel.CRITICAL,
                            ['conversation-extracted', 'business-rule']
                        ));
                    }
                }
                
                // 提取约束条件
                if (analysis.constraints.length > 0) {
                    extractedInfo.constraints.push(...analysis.constraints);
                    for (const constraint of analysis.constraints) {
                        memories.push(this.createMemory(
                            constraint,
                            MemoryCategory.CONSTRAINT,
                            ImportanceLevel.CRITICAL,
                            ['conversation-extracted', 'constraint']
                        ));
                    }
                }
                
                // 提取 API 规范
                if (analysis.apiSpecs.length > 0) {
                    extractedInfo.apiSpecs.push(...analysis.apiSpecs);
                    for (const apiSpec of analysis.apiSpecs) {
                        memories.push(this.createMemory(
                            apiSpec,
                            MemoryCategory.API_SPEC,
                            ImportanceLevel.CRITICAL,
                            ['conversation-extracted', 'api']
                        ));
                    }
                }
                
                // 提取代码模式
                if (analysis.codePatterns.length > 0) {
                    extractedInfo.codePatterns.push(...analysis.codePatterns);
                    for (const pattern of analysis.codePatterns) {
                        memories.push(this.createMemory(
                            pattern,
                            MemoryCategory.CODE_STYLE,
                            ImportanceLevel.HIGH,
                            ['conversation-extracted', 'pattern']
                        ));
                    }
                }
            } else if (message.role === 'user') {
                // 分析用户的请求，提取需求
                const analysis = this.analyzeUserMessage(message.content);
                
                // 提取业务规则（从用户需求中）
                if (analysis.businessRules.length > 0) {
                    extractedInfo.businessRules.push(...analysis.businessRules);
                    for (const rule of analysis.businessRules) {
                        memories.push(this.createMemory(
                            rule,
                            MemoryCategory.BUSINESS_RULE,
                            ImportanceLevel.CRITICAL,
                            ['conversation-extracted', 'requirement']
                        ));
                    }
                }
                
                // 提取约束条件（从用户需求中）
                if (analysis.constraints.length > 0) {
                    extractedInfo.constraints.push(...analysis.constraints);
                    for (const constraint of analysis.constraints) {
                        memories.push(this.createMemory(
                            constraint,
                            MemoryCategory.CONSTRAINT,
                            ImportanceLevel.CRITICAL,
                            ['conversation-extracted', 'requirement']
                        ));
                    }
                }
            }
        }

        return {
            memories,
            extractedInfo
        };
    }

    // 分析 AI 回复消息
    private analyzeAssistantMessage(content: string): {
        architectureDecisions: string[];
        businessRules: string[];
        constraints: string[];
        apiSpecs: string[];
        codePatterns: string[];
    } {
        const result = {
            architectureDecisions: [] as string[],
            businessRules: [] as string[],
            constraints: [] as string[],
            apiSpecs: [] as string[],
            codePatterns: [] as string[]
        };

        const contentLower = content.toLowerCase();

        // 提取架构决策（关键词：架构、设计、结构、模块、分层等）
        const architectureKeywords = ['架构', '设计', '结构', '模块', '分层', 'architecture', 'design', 'structure', 'module', 'layer'];
        if (architectureKeywords.some(keyword => contentLower.includes(keyword))) {
            // 提取包含架构关键词的句子
            const sentences = this.extractSentences(content);
            for (const sentence of sentences) {
                if (architectureKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
                    result.architectureDecisions.push(this.compressText(sentence));
                }
            }
        }

        // 提取业务规则（关键词：必须、应该、规则、业务逻辑等）
        const businessRuleKeywords = ['必须', '应该', '规则', '业务逻辑', 'must', 'should', 'rule', 'business logic', 'requirement'];
        if (businessRuleKeywords.some(keyword => contentLower.includes(keyword))) {
            const sentences = this.extractSentences(content);
            for (const sentence of sentences) {
                if (businessRuleKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
                    result.businessRules.push(this.compressText(sentence));
                }
            }
        }

        // 提取约束条件（关键词：禁止、不允许、不能、禁止、constraint、forbidden、not allowed）
        const constraintKeywords = ['禁止', '不允许', '不能', '禁止', 'constraint', 'forbidden', 'not allowed', 'cannot', 'must not'];
        if (constraintKeywords.some(keyword => contentLower.includes(keyword))) {
            const sentences = this.extractSentences(content);
            for (const sentence of sentences) {
                if (constraintKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
                    result.constraints.push(this.compressText(sentence));
                }
            }
        }

        // 提取 API 规范（关键词：API、端点、路由、endpoint、route、api）
        const apiKeywords = ['api', '端点', '路由', 'endpoint', 'route', 'http', 'get', 'post', 'put', 'delete'];
        if (apiKeywords.some(keyword => contentLower.includes(keyword))) {
            const sentences = this.extractSentences(content);
            for (const sentence of sentences) {
                if (apiKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
                    // 提取 API 路径和方法
                    const apiMatch = sentence.match(/(?:GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-]+)|([\/\w\-]+)\s+(?:GET|POST|PUT|DELETE|PATCH)/i);
                    if (apiMatch) {
                        result.apiSpecs.push(this.compressText(sentence));
                    }
                }
            }
        }

        // 提取代码模式（关键词：模式、pattern、style、convention）
        const patternKeywords = ['模式', 'pattern', 'style', 'convention', '规范', 'standard'];
        if (patternKeywords.some(keyword => contentLower.includes(keyword))) {
            const sentences = this.extractSentences(content);
            for (const sentence of sentences) {
                if (patternKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
                    result.codePatterns.push(this.compressText(sentence));
                }
            }
        }

        return result;
    }

    // 分析用户消息
    private analyzeUserMessage(content: string): {
        businessRules: string[];
        constraints: string[];
    } {
        const result = {
            businessRules: [] as string[],
            constraints: [] as string[]
        };

        const contentLower = content.toLowerCase();

        // 提取业务规则（从用户需求中）
        const businessRuleKeywords = ['需要', '要求', '必须', '应该', 'need', 'require', 'must', 'should'];
        if (businessRuleKeywords.some(keyword => contentLower.includes(keyword))) {
            const sentences = this.extractSentences(content);
            for (const sentence of sentences) {
                if (businessRuleKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
                    result.businessRules.push(this.compressText(sentence));
                }
            }
        }

        // 提取约束条件（从用户需求中）
        const constraintKeywords = ['不要', '禁止', '不允许', '不能', "don't", 'forbidden', 'not allowed', 'cannot'];
        if (constraintKeywords.some(keyword => contentLower.includes(keyword))) {
            const sentences = this.extractSentences(content);
            for (const sentence of sentences) {
                if (constraintKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
                    result.constraints.push(this.compressText(sentence));
                }
            }
        }

        return result;
    }

    // 提取句子
    private extractSentences(text: string): string[] {
        // 按句号、问号、感叹号分割
        const sentences = text.split(/[。！？\n]/).filter(s => s.trim().length > 10);
        return sentences;
    }

    // 压缩文本（只保留关键信息）
    private compressText(text: string): string {
        // 移除多余空格
        let compressed = text.trim().replace(/\s+/g, ' ');
        
        // 如果太长，截取关键部分
        if (compressed.length > 200) {
            // 保留开头和结尾
            compressed = compressed.substring(0, 100) + '...' + compressed.substring(compressed.length - 100);
        }
        
        return compressed;
    }

    // 创建记忆
    private createMemory(
        content: string,
        category: MemoryCategory,
        importance: ImportanceLevel,
        tags: string[]
    ): Memory {
        return {
            id: this.generateId(),
            content: content,
            category: category,
            timestamp: Date.now(),
            tags: tags,
            importance: importance,
            confidence: 0.8 // 对话提取的记忆置信度稍低
        };
    }

    // 生成 ID
    private generateId(): string {
        return 'conv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }

    // 从 Cursor 对话历史中提取记忆（尝试多种方式）
    async extractFromCursorConversation(): Promise<Memory[]> {
        const memories: Memory[] = [];

        try {
            // 方法1：尝试从 Cursor 的存储中读取对话历史
            // 注意：这需要 Cursor 提供 API 或存储位置
            // 目前我们只能尝试常见的存储位置

            // 方法2：监听剪贴板（如果用户复制了对话内容）
            // 这可以作为备选方案

            // 方法3：提供手动提取功能
            // 用户可以通过命令手动提取对话内容

            // 暂时返回空数组，等待 Cursor API 支持
            return memories;
        } catch (error) {
            console.error('从 Cursor 对话中提取记忆失败:', error);
            return memories;
        }
    }

    // 手动提取对话内容（用户提供对话文本）
    async extractFromText(conversationText: string): Promise<Memory[]> {
        try {
            // 解析对话文本（假设格式：user: ... assistant: ...）
            const messages = this.parseConversationText(conversationText);
            
            // 分析对话
            const result = await this.analyzeConversation(messages);
            
            // 保存记忆
            const existingMemories = await this.storage.loadMemories();
            const allMemories = [...existingMemories, ...result.memories];
            await this.storage.saveMemories(allMemories);
            
            return result.memories;
        } catch (error) {
            console.error('从文本提取记忆失败:', error);
            throw error;
        }
    }

    // 解析对话文本
    private parseConversationText(text: string): ConversationMessage[] {
        const messages: ConversationMessage[] = [];
        const lines = text.split('\n');
        
        let currentRole: 'user' | 'assistant' | 'system' = 'user';
        let currentContent = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                continue;
            }
            
            // 检测角色标记
            if (trimmed.toLowerCase().startsWith('user:') || trimmed.toLowerCase().startsWith('用户:')) {
                if (currentContent) {
                    messages.push({
                        role: currentRole,
                        content: currentContent.trim()
                    });
                }
                currentRole = 'user';
                currentContent = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            } else if (trimmed.toLowerCase().startsWith('assistant:') || trimmed.toLowerCase().startsWith('助手:') || trimmed.toLowerCase().startsWith('ai:')) {
                if (currentContent) {
                    messages.push({
                        role: currentRole,
                        content: currentContent.trim()
                    });
                }
                currentRole = 'assistant';
                currentContent = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            } else {
                currentContent += ' ' + trimmed;
            }
        }
        
        // 添加最后一条消息
        if (currentContent) {
            messages.push({
                role: currentRole,
                content: currentContent.trim()
            });
        }
        
        return messages;
    }
}

