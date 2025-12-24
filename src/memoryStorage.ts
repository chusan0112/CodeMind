import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// 记忆数据结构
export interface Memory {
    id: string;
    content: string;
    category: MemoryCategory;
    timestamp: number;
    tags: string[];
    importance: ImportanceLevel;
    relatedFiles?: string[];
    confidence?: number; // 置信度 0-1
}

// 记忆分类
export enum MemoryCategory {
    ARCHITECTURE = 'architecture',      // 架构记忆
    CODE_STYLE = 'code_style',          // 代码风格
    BUSINESS_RULE = 'business_rule',    // 业务规则
    API_SPEC = 'api_spec',              // API 规范
    DATABASE = 'database',              // 数据库
    CONFIG = 'config',                  // 配置
    CONSTRAINT = 'constraint',          // 约束
    DOCUMENTATION = 'documentation',    // 文档
    OTHER = 'other'                     // 其他
}

// 重要性等级
export enum ImportanceLevel {
    CRITICAL = 'critical',  // 强制级
    HIGH = 'high',          // 推荐级
    MEDIUM = 'medium',       // 参考级
    LOW = 'low'             // 低优先级
}

// 记忆存储类
export class MemoryStorage {
    private context: vscode.ExtensionContext;
    private memoryFilePath: string;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        // 获取工作区路径
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const config = vscode.workspace.getConfiguration('memoryManager');
            const storagePath = config.get<string>('storagePath', '.cursor-memory');
            this.memoryFilePath = path.join(workspaceFolder.uri.fsPath, storagePath, 'memories.json');
        } else {
            // 如果没有工作区，使用全局存储
            this.memoryFilePath = path.join(context.globalStorageUri.fsPath, 'memories.json');
        }
    }

    // 确保存储目录存在
    private ensureDirectoryExists(): void {
        const dir = path.dirname(this.memoryFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    // 读取所有记忆
    async loadMemories(): Promise<Memory[]> {
        try {
            this.ensureDirectoryExists();
            if (!fs.existsSync(this.memoryFilePath)) {
                return [];
            }
            const data = fs.readFileSync(this.memoryFilePath, 'utf-8');
            return JSON.parse(data) as Memory[];
        } catch (error) {
            console.error('读取记忆失败:', error);
            return [];
        }
    }

    // 保存所有记忆
    async saveMemories(memories: Memory[]): Promise<void> {
        try {
            this.ensureDirectoryExists();
            fs.writeFileSync(this.memoryFilePath, JSON.stringify(memories, null, 2), 'utf-8');
        } catch (error) {
            console.error('保存记忆失败:', error);
            throw error;
        }
    }

    // 添加记忆
    async addMemory(memory: Memory): Promise<void> {
        const memories = await this.loadMemories();
        memories.push(memory);
        await this.saveMemories(memories);
    }

    // 更新记忆
    async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {
        const memories = await this.loadMemories();
        const index = memories.findIndex(m => m.id === id);
        if (index !== -1) {
            memories[index] = { ...memories[index], ...updates };
            await this.saveMemories(memories);
        }
    }

    // 删除记忆
    async deleteMemory(id: string): Promise<void> {
        const memories = await this.loadMemories();
        const filtered = memories.filter(m => m.id !== id);
        await this.saveMemories(filtered);
    }

    // 根据分类获取记忆
    async getMemoriesByCategory(category: MemoryCategory): Promise<Memory[]> {
        const memories = await this.loadMemories();
        return memories.filter(m => m.category === category);
    }

    // 根据重要性获取记忆
    async getMemoriesByImportance(importance: ImportanceLevel): Promise<Memory[]> {
        const memories = await this.loadMemories();
        return memories.filter(m => m.importance === importance);
    }

    // 获取文件路径
    getStoragePath(): string {
        return this.memoryFilePath;
    }

    // 搜索记忆（全文搜索）
    async searchMemories(query: string): Promise<Memory[]> {
        const memories = await this.loadMemories();
        const queryLower = query.toLowerCase();
        
        return memories.filter(memory => {
            // 搜索内容
            if (memory.content.toLowerCase().includes(queryLower)) {
                return true;
            }
            
            // 搜索标签
            if (memory.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
                return true;
            }
            
            // 搜索相关文件
            if (memory.relatedFiles?.some(file => file.toLowerCase().includes(queryLower))) {
                return true;
            }
            
            return false;
        });
    }

    // 模糊搜索记忆
    async fuzzySearchMemories(query: string): Promise<Memory[]> {
        const memories = await this.loadMemories();
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
        
        if (queryWords.length === 0) {
            return memories;
        }
        
        return memories.filter(memory => {
            const contentLower = memory.content.toLowerCase();
            const tagsLower = memory.tags.join(' ').toLowerCase();
            
            // 计算匹配度：至少匹配一个词
            const matchCount = queryWords.filter(word => 
                contentLower.includes(word) || tagsLower.includes(word)
            ).length;
            
            return matchCount > 0;
        }).sort((a, b) => {
            // 按匹配度排序
            const aMatch = this.calculateMatchScore(a, queryWords);
            const bMatch = this.calculateMatchScore(b, queryWords);
            return bMatch - aMatch;
        });
    }

    // 计算匹配分数
    private calculateMatchScore(memory: Memory, queryWords: string[]): number {
        const contentLower = memory.content.toLowerCase();
        const tagsLower = memory.tags.join(' ').toLowerCase();
        let score = 0;
        
        for (const word of queryWords) {
            // 内容匹配
            if (contentLower.includes(word)) {
                score += 2;
            }
            
            // 标签匹配（权重更高）
            if (tagsLower.includes(word)) {
                score += 3;
            }
            
            // 重要性加权
            if (memory.importance === 'critical') {
                score += 1;
            } else if (memory.importance === 'high') {
                score += 0.5;
            }
        }
        
        return score;
    }

    // 根据标签获取记忆
    async getMemoriesByTags(tags: string[]): Promise<Memory[]> {
        const memories = await this.loadMemories();
        return memories.filter(memory => 
            tags.some(tag => memory.tags.includes(tag))
        );
    }

    // 获取所有标签
    async getAllTags(): Promise<string[]> {
        const memories = await this.loadMemories();
        const tagSet = new Set<string>();
        
        for (const memory of memories) {
            memory.tags.forEach(tag => tagSet.add(tag));
        }
        
        return Array.from(tagSet).sort();
    }

    // 更新记忆标签
    async updateMemoryTags(id: string, tags: string[]): Promise<void> {
        await this.updateMemory(id, { tags });
    }

    // 批量更新记忆重要性
    async batchUpdateImportance(ids: string[], importance: ImportanceLevel): Promise<void> {
        const memories = await this.loadMemories();
        
        for (const memory of memories) {
            if (ids.includes(memory.id)) {
                memory.importance = importance;
            }
        }
        
        await this.saveMemories(memories);
    }

    // 清理过期记忆
    async cleanExpiredMemories(maxAge: number = 90 * 24 * 60 * 60 * 1000): Promise<number> {
        const memories = await this.loadMemories();
        const now = Date.now();
        const beforeCount = memories.length;
        
        const filtered = memories.filter(memory => {
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
        
        await this.saveMemories(filtered);
        return beforeCount - filtered.length;
    }
}

