import * as vscode from 'vscode';
import { MemoryStorage, Memory } from './memoryStorage';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// 团队协作配置接口
export interface TeamConfig {
    teamId: string;
    teamName: string;
    members: TeamMember[];
    syncEnabled: boolean;
    syncUrl?: string;
    syncToken?: string;
}

// 团队成员接口
export interface TeamMember {
    id: string;
    name: string;
    email?: string;
    role: 'admin' | 'member' | 'viewer';
    joinedAt: number;
}

// 记忆同步接口
export interface MemorySync {
    memoryId: string;
    memory: Memory;
    action: 'add' | 'update' | 'delete';
    timestamp: number;
    author: string;
}

// 团队协作管理器类
export class TeamCollaboration {
    private storage: MemoryStorage;
    private context: vscode.ExtensionContext;
    private teamConfig: TeamConfig | null = null;

    constructor(storage: MemoryStorage, context: vscode.ExtensionContext) {
        this.storage = storage;
        this.context = context;
        this.loadTeamConfig();
    }

    // 加载团队配置
    private async loadTeamConfig(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }

            const configPath = path.join(
                workspaceFolder.uri.fsPath,
                '.cursor-memory',
                'team.json'
            );

            if (fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, 'utf-8');
                this.teamConfig = JSON.parse(content);
            }
        } catch (error) {
            console.error('加载团队配置失败:', error);
        }
    }

    // 保存团队配置
    private async saveTeamConfig(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder || !this.teamConfig) {
                return;
            }

            const configDir = path.join(workspaceFolder.uri.fsPath, '.cursor-memory');
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            const configPath = path.join(configDir, 'team.json');
            fs.writeFileSync(configPath, JSON.stringify(this.teamConfig, null, 2), 'utf-8');
        } catch (error) {
            console.error('保存团队配置失败:', error);
        }
    }

    // 创建团队
    async createTeam(teamName: string, memberName: string): Promise<string> {
        const teamId = crypto.randomBytes(16).toString('hex');
        
        this.teamConfig = {
            teamId: teamId,
            teamName: teamName,
            members: [{
                id: crypto.randomBytes(8).toString('hex'),
                name: memberName,
                role: 'admin',
                joinedAt: Date.now()
            }],
            syncEnabled: false
        };

        await this.saveTeamConfig();
        return teamId;
    }

    // 加入团队
    async joinTeam(teamId: string, memberName: string): Promise<boolean> {
        if (!this.teamConfig || this.teamConfig.teamId !== teamId) {
            return false;
        }

        const member: TeamMember = {
            id: crypto.randomBytes(8).toString('hex'),
            name: memberName,
            role: 'member',
            joinedAt: Date.now()
        };

        this.teamConfig.members.push(member);
        await this.saveTeamConfig();
        return true;
    }

    // 导出记忆（用于共享）
    async exportMemoriesForSharing(): Promise<string> {
        const memories = await this.storage.loadMemories();
        const exportData = {
            version: '1.0',
            timestamp: Date.now(),
            teamId: this.teamConfig?.teamId,
            count: memories.length,
            memories: memories
        };

        return JSON.stringify(exportData, null, 2);
    }

    // 导入记忆（从团队共享）
    async importMemoriesFromSharing(exportData: string, overwrite: boolean = false): Promise<{
        imported: number;
        skipped: number;
    }> {
        const importData = JSON.parse(exportData);
        const existingMemories = await this.storage.loadMemories();
        let importedCount = 0;
        let skippedCount = 0;

        for (const newMemory of importData.memories) {
            const existing = existingMemories.find(m => 
                m.content === newMemory.content && m.category === newMemory.category
            );

            if (existing) {
                if (overwrite) {
                    existingMemories.splice(existingMemories.indexOf(existing), 1);
                    existingMemories.push(newMemory);
                    importedCount++;
                } else {
                    skippedCount++;
                }
            } else {
                existingMemories.push(newMemory);
                importedCount++;
            }
        }

        await this.storage.saveMemories(existingMemories);
        return { imported: importedCount, skipped: skippedCount };
    }

    // 同步记忆（如果启用了同步）
    async syncMemories(): Promise<{
        success: boolean;
        synced: number;
        error?: string;
    }> {
        if (!this.teamConfig || !this.teamConfig.syncEnabled || !this.teamConfig.syncUrl) {
            return {
                success: false,
                synced: 0,
                error: '同步未启用或未配置同步 URL'
            };
        }

        try {
            // 这里应该调用实际的同步 API
            // 目前只是模拟
            const localMemories = await this.storage.loadMemories();
            
            // 模拟同步逻辑
            // 实际实现应该：
            // 1. 获取远程记忆
            // 2. 合并本地和远程记忆
            // 3. 解决冲突
            // 4. 上传本地变更

            return {
                success: true,
                synced: localMemories.length
            };
        } catch (error) {
            return {
                success: false,
                synced: 0,
                error: (error as Error).message
            };
        }
    }

    // 获取团队信息
    getTeamInfo(): TeamConfig | null {
        return this.teamConfig;
    }

    // 检查是否在团队中
    isInTeam(): boolean {
        return this.teamConfig !== null;
    }

    // 启用/禁用同步
    async setSyncEnabled(enabled: boolean, syncUrl?: string, syncToken?: string): Promise<void> {
        if (!this.teamConfig) {
            return;
        }

        this.teamConfig.syncEnabled = enabled;
        if (syncUrl) {
            this.teamConfig.syncUrl = syncUrl;
        }
        if (syncToken) {
            this.teamConfig.syncToken = syncToken;
        }

        await this.saveTeamConfig();
    }
}

