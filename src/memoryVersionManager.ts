import * as vscode from 'vscode';
import { MemoryStorage, Memory } from './memoryStorage';
import * as fs from 'fs';
import * as path from 'path';

// 记忆版本接口
export interface MemoryVersion {
    version: string;
    timestamp: number;
    memories: Memory[];
    changes: VersionChange[];
    description?: string;
}

// 版本变更接口
export interface VersionChange {
    type: 'added' | 'modified' | 'deleted';
    memoryId: string;
    oldContent?: string;
    newContent?: string;
    timestamp: number;
}

// 记忆版本管理器类
export class MemoryVersionManager {
    private storage: MemoryStorage;
    private context: vscode.ExtensionContext;
    private versions: MemoryVersion[] = [];
    private currentVersion: string = '1.0.0';

    constructor(storage: MemoryStorage, context: vscode.ExtensionContext) {
        this.storage = storage;
        this.context = context;
        this.loadVersions();
    }

    // 加载版本历史
    private async loadVersions(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }

            const versionsPath = path.join(
                workspaceFolder.uri.fsPath,
                '.cursor-memory',
                'versions.json'
            );

            if (fs.existsSync(versionsPath)) {
                const content = fs.readFileSync(versionsPath, 'utf-8');
                const data = JSON.parse(content);
                this.versions = data.versions || [];
                this.currentVersion = data.currentVersion || '1.0.0';
            }
        } catch (error) {
            console.error('加载版本历史失败:', error);
        }
    }

    // 保存版本历史
    private async saveVersions(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }

            const versionsDir = path.join(workspaceFolder.uri.fsPath, '.cursor-memory');
            if (!fs.existsSync(versionsDir)) {
                fs.mkdirSync(versionsDir, { recursive: true });
            }

            const versionsPath = path.join(versionsDir, 'versions.json');
            const data = {
                currentVersion: this.currentVersion,
                versions: this.versions
            };

            fs.writeFileSync(versionsPath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.error('保存版本历史失败:', error);
        }
    }

    // 创建新版本
    async createVersion(description?: string): Promise<string> {
        const currentMemories = await this.storage.loadMemories();
        const previousVersion = this.versions.length > 0 
            ? this.versions[this.versions.length - 1] 
            : null;

        // 计算变更
        const changes = this.calculateChanges(
            previousVersion?.memories || [],
            currentMemories
        );

        // 创建版本
        const version: MemoryVersion = {
            version: this.incrementVersion(),
            timestamp: Date.now(),
            memories: JSON.parse(JSON.stringify(currentMemories)), // 深拷贝
            changes: changes,
            description: description
        };

        this.versions.push(version);
        this.currentVersion = version.version;
        await this.saveVersions();

        return version.version;
    }

    // 计算变更
    private calculateChanges(
        oldMemories: Memory[],
        newMemories: Memory[]
    ): VersionChange[] {
        const changes: VersionChange[] = [];
        const oldMap = new Map(oldMemories.map(m => [m.id, m]));
        const newMap = new Map(newMemories.map(m => [m.id, m]));

        // 检查新增和修改
        for (const [id, newMemory] of newMap.entries()) {
            const oldMemory = oldMap.get(id);
            if (!oldMemory) {
                changes.push({
                    type: 'added',
                    memoryId: id,
                    newContent: newMemory.content,
                    timestamp: Date.now()
                });
            } else if (oldMemory.content !== newMemory.content) {
                changes.push({
                    type: 'modified',
                    memoryId: id,
                    oldContent: oldMemory.content,
                    newContent: newMemory.content,
                    timestamp: Date.now()
                });
            }
        }

        // 检查删除
        for (const [id, oldMemory] of oldMap.entries()) {
            if (!newMap.has(id)) {
                changes.push({
                    type: 'deleted',
                    memoryId: id,
                    oldContent: oldMemory.content,
                    timestamp: Date.now()
                });
            }
        }

        return changes;
    }

    // 递增版本号
    private incrementVersion(): string {
        const parts = this.currentVersion.split('.');
        const major = parseInt(parts[0]) || 1;
        const minor = parseInt(parts[1]) || 0;
        const patch = parseInt(parts[2]) || 0;

        return `${major}.${minor}.${patch + 1}`;
    }

    // 获取所有版本
    getVersions(): MemoryVersion[] {
        return this.versions;
    }

    // 获取当前版本
    getCurrentVersion(): string {
        return this.currentVersion;
    }

    // 回滚到指定版本
    async rollbackToVersion(version: string): Promise<boolean> {
        const targetVersion = this.versions.find(v => v.version === version);
        if (!targetVersion) {
            return false;
        }

        try {
            // 保存当前版本（作为备份）
            await this.createVersion(`回滚前的备份版本`);

            // 恢复记忆
            await this.storage.saveMemories(targetVersion.memories);

            // 更新当前版本
            this.currentVersion = version;
            await this.saveVersions();

            return true;
        } catch (error) {
            console.error('回滚失败:', error);
            return false;
        }
    }

    // 比较两个版本
    compareVersions(version1: string, version2: string): VersionChange[] {
        const v1 = this.versions.find(v => v.version === version1);
        const v2 = this.versions.find(v => v.version === version2);

        if (!v1 || !v2) {
            return [];
        }

        return this.calculateChanges(v1.memories, v2.memories);
    }

    // 获取版本统计
    getVersionStats(): {
        totalVersions: number;
        totalChanges: number;
        addedCount: number;
        modifiedCount: number;
        deletedCount: number;
    } {
        let totalChanges = 0;
        let addedCount = 0;
        let modifiedCount = 0;
        let deletedCount = 0;

        for (const version of this.versions) {
            totalChanges += version.changes.length;
            for (const change of version.changes) {
                if (change.type === 'added') addedCount++;
                else if (change.type === 'modified') modifiedCount++;
                else if (change.type === 'deleted') deletedCount++;
            }
        }

        return {
            totalVersions: this.versions.length,
            totalChanges,
            addedCount,
            modifiedCount,
            deletedCount
        };
    }
}

