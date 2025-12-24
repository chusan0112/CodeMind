import * as vscode from 'vscode';
import { MemoryStorage, Memory, ImportanceLevel, MemoryCategory } from './memoryStorage';
import * as path from 'path';
import * as fs from 'fs';

// 架构检查结果
export interface ArchitectureCheckResult {
    passed: boolean;
    issues: ArchitectureIssue[];
    summary: string;
}

// 架构问题
export interface ArchitectureIssue {
    type: 'error' | 'warning' | 'info';
    message: string;
    file?: string;
    line?: number;
    column?: number;
    memoryId?: string;
    memoryContent?: string;
    suggestion?: string;
}

// 模块依赖关系
interface ModuleDependency {
    from: string;
    to: string;
    type: 'import' | 'require' | 'include' | 'reference';
}

// 架构检查器类
export class ArchitectureChecker {
    private storage: MemoryStorage;
    private architectureMemories: Memory[] = [];
    private lastUpdateTime: number = 0;
    private updateInterval: number = 10000; // 10秒更新一次

    constructor(storage: MemoryStorage) {
        this.storage = storage;
        this.loadArchitectureMemories();
    }

    // 加载架构相关记忆
    private async loadArchitectureMemories(): Promise<void> {
        try {
            const allMemories = await this.storage.loadMemories();
            this.architectureMemories = allMemories.filter(m => 
                m.category === MemoryCategory.ARCHITECTURE ||
                (m.category === MemoryCategory.CONSTRAINT && m.importance === ImportanceLevel.CRITICAL) ||
                m.tags.some(tag => ['architecture', 'arch', 'structure', 'module', 'layer'].includes(tag.toLowerCase()))
            );
            this.lastUpdateTime = Date.now();
        } catch (error) {
            console.error('加载架构记忆失败:', error);
        }
    }

    // 检查代码架构一致性
    async checkArchitecture(
        code: string,
        filePath: string,
        language: string
    ): Promise<ArchitectureCheckResult> {
        // 定期更新记忆
        if (Date.now() - this.lastUpdateTime > this.updateInterval) {
            await this.loadArchitectureMemories();
        }

        const issues: ArchitectureIssue[] = [];

        // 1. 检查架构约束
        const constraintIssues = this.checkArchitectureConstraints(code, filePath);
        issues.push(...constraintIssues);

        // 2. 检查模块划分
        const moduleIssues = await this.checkModuleDivision(code, filePath, language);
        issues.push(...moduleIssues);

        // 3. 检查依赖关系
        const dependencyIssues = await this.checkDependencies(code, filePath, language);
        issues.push(...dependencyIssues);

        // 4. 检查命名规范（架构相关）
        const namingIssues = this.checkArchitectureNaming(code, filePath, language);
        issues.push(...namingIssues);

        // 生成摘要
        const errorCount = issues.filter(i => i.type === 'error').length;
        const warningCount = issues.filter(i => i.type === 'warning').length;
        const infoCount = issues.filter(i => i.type === 'info').length;

        const passed = errorCount === 0;
        
        let summary = '';
        if (passed && issues.length === 0) {
            summary = '✅ 架构检查通过！代码完全符合项目架构要求。';
        } else if (passed) {
            summary = `✅ 架构检查通过（无错误） | ⚠️ 警告: ${warningCount} | ℹ️ 提示: ${infoCount}`;
        } else {
            summary = `❌ 架构检查失败 | 🔴 错误: ${errorCount} | ⚠️ 警告: ${warningCount} | ℹ️ 提示: ${infoCount}`;
        }

        return {
            passed,
            issues,
            summary
        };
    }

    // 检查架构约束
    private checkArchitectureConstraints(code: string, filePath: string): ArchitectureIssue[] {
        const issues: ArchitectureIssue[] = [];
        const codeLower = code.toLowerCase();

        for (const memory of this.architectureMemories) {
            if (memory.importance !== ImportanceLevel.CRITICAL) {
                continue;
            }

            const content = memory.content.toLowerCase();

            // 检查禁止的架构模式
            if (content.includes('禁止') || content.includes('不允许') || content.includes('forbidden') || content.includes('not allowed')) {
                // 提取禁止的内容
                const forbiddenPatterns = this.extractForbiddenPatterns(memory.content);
                
                for (const pattern of forbiddenPatterns) {
                    if (codeLower.includes(pattern.toLowerCase())) {
                        issues.push({
                            type: 'error',
                            message: `违反了架构约束: ${memory.content}`,
                            memoryId: memory.id,
                            memoryContent: memory.content,
                            suggestion: `请移除或修改包含 "${pattern}" 的代码`
                        });
                    }
                }
            }

            // 检查必须的架构模式
            if (content.includes('必须') || content.includes('应该') || content.includes('must') || content.includes('should')) {
                // 提取必须的内容
                const requiredPatterns = this.extractRequiredPatterns(memory.content);
                
                for (const pattern of requiredPatterns) {
                    if (!codeLower.includes(pattern.toLowerCase())) {
                        issues.push({
                            type: 'warning',
                            message: `建议遵循架构要求: ${memory.content}`,
                            memoryId: memory.id,
                            memoryContent: memory.content,
                            suggestion: `请确保代码包含 "${pattern}" 相关的实现`
                        });
                    }
                }
            }
        }

        return issues;
    }

    // 检查模块划分
    private async checkModuleDivision(
        code: string,
        filePath: string,
        language: string
    ): Promise<ArchitectureIssue[]> {
        const issues: ArchitectureIssue[] = [];

        // 获取项目目录结构
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return issues;
        }

        const fileDir = path.dirname(filePath);
        const fileName = path.basename(filePath);
        const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);

        // 检查文件位置是否符合架构要求
        for (const memory of this.architectureMemories) {
            if (memory.category !== MemoryCategory.ARCHITECTURE) {
                continue;
            }

            const content = memory.content.toLowerCase();

            // 检查目录结构要求
            if (content.includes('目录') || content.includes('文件夹') || content.includes('directory') || content.includes('folder')) {
                const requiredDirs = this.extractDirectoryRequirements(memory.content);
                
                for (const dir of requiredDirs) {
                    if (!relativePath.toLowerCase().includes(dir.toLowerCase())) {
                        // 检查是否应该在特定目录
                        if (this.shouldBeInDirectory(fileName, code, dir)) {
                            issues.push({
                                type: 'warning',
                                message: `文件位置可能不符合架构要求: ${memory.content}`,
                                file: filePath,
                                memoryId: memory.id,
                                memoryContent: memory.content,
                                suggestion: `考虑将文件移动到包含 "${dir}" 的目录`
                            });
                        }
                    }
                }
            }

            // 检查模块命名要求
            if (content.includes('模块') || content.includes('module')) {
                const modulePatterns = this.extractModulePatterns(memory.content);
                
                for (const pattern of modulePatterns) {
                    if (!fileName.toLowerCase().includes(pattern.toLowerCase()) && 
                        !this.hasModulePattern(code, pattern)) {
                        issues.push({
                            type: 'info',
                            message: `模块命名建议: ${memory.content}`,
                            file: filePath,
                            memoryId: memory.id,
                            memoryContent: memory.content
                        });
                    }
                }
            }
        }

        return issues;
    }

    // 检查依赖关系
    private async checkDependencies(
        code: string,
        filePath: string,
        language: string
    ): Promise<ArchitectureIssue[]> {
        const issues: ArchitectureIssue[] = [];

        // 提取依赖关系
        const dependencies = this.extractDependencies(code, language);

        // 检查依赖是否符合架构要求
        for (const memory of this.architectureMemories) {
            if (memory.category !== MemoryCategory.ARCHITECTURE) {
                continue;
            }

            const content = memory.content.toLowerCase();

            // 检查禁止的依赖
            if (content.includes('禁止') && (content.includes('依赖') || content.includes('import') || content.includes('dependency'))) {
                const forbiddenDeps = this.extractForbiddenDependencies(memory.content);
                
                for (const dep of dependencies) {
                    for (const forbiddenDep of forbiddenDeps) {
                        if (dep.to.toLowerCase().includes(forbiddenDep.toLowerCase())) {
                            issues.push({
                                type: 'error',
                                message: `违反了架构依赖约束: ${memory.content}`,
                                file: filePath,
                                memoryId: memory.id,
                                memoryContent: memory.content,
                                suggestion: `请移除对 "${dep.to}" 的依赖`
                            });
                        }
                    }
                }
            }

            // 检查层间依赖规则（例如：controller 不能直接依赖 model）
            if (content.includes('层') || content.includes('layer')) {
                const layerRules = this.extractLayerRules(memory.content);
                
                for (const rule of layerRules) {
                    const violation = this.checkLayerRuleViolation(dependencies, rule, filePath);
                    if (violation) {
                        issues.push({
                            type: 'error',
                            message: `违反了架构分层规则: ${memory.content}`,
                            file: filePath,
                            memoryId: memory.id,
                            memoryContent: memory.content,
                            suggestion: violation
                        });
                    }
                }
            }
        }

        return issues;
    }

    // 检查架构命名规范
    private checkArchitectureNaming(
        code: string,
        filePath: string,
        language: string
    ): ArchitectureIssue[] {
        const issues: ArchitectureIssue[] = [];

        for (const memory of this.architectureMemories) {
            if (memory.category !== MemoryCategory.ARCHITECTURE && 
                memory.category !== MemoryCategory.CODE_STYLE) {
                continue;
            }

            const content = memory.content.toLowerCase();

            // 检查命名规范
            if (content.includes('命名') || content.includes('naming') || content.includes('命名规范')) {
                const namingRules = this.extractNamingRules(memory.content);
                
                // 提取代码中的标识符
                const identifiers = this.extractIdentifiers(code, language);
                
                for (const identifier of identifiers) {
                    for (const rule of namingRules) {
                        if (!this.matchesNamingRule(identifier, rule)) {
                            issues.push({
                                type: 'warning',
                                message: `命名可能不符合架构规范: ${memory.content}`,
                                file: filePath,
                                memoryId: memory.id,
                                memoryContent: memory.content,
                                suggestion: `请检查 "${identifier}" 的命名是否符合规范`
                            });
                        }
                    }
                }
            }
        }

        return issues;
    }

    // 提取禁止的模式
    private extractForbiddenPatterns(content: string): string[] {
        const patterns: string[] = [];
        const forbiddenKeywords = ['禁止', '不允许', '不能', 'forbidden', 'not allowed', 'cannot'];
        
        // 简单的提取逻辑
        const sentences = content.split(/[。！？\n]/);
        for (const sentence of sentences) {
            for (const keyword of forbiddenKeywords) {
                if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
                    // 提取关键词后的内容
                    const match = sentence.match(new RegExp(`${keyword}[：:](.+?)(?:[。，,]|$)`, 'i'));
                    if (match && match[1]) {
                        patterns.push(match[1].trim());
                    }
                }
            }
        }
        
        return patterns;
    }

    // 提取必须的模式
    private extractRequiredPatterns(content: string): string[] {
        const patterns: string[] = [];
        const requiredKeywords = ['必须', '应该', 'must', 'should'];
        
        const sentences = content.split(/[。！？\n]/);
        for (const sentence of sentences) {
            for (const keyword of requiredKeywords) {
                if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
                    const match = sentence.match(new RegExp(`${keyword}[：:](.+?)(?:[。，,]|$)`, 'i'));
                    if (match && match[1]) {
                        patterns.push(match[1].trim());
                    }
                }
            }
        }
        
        return patterns;
    }

    // 提取目录要求
    private extractDirectoryRequirements(content: string): string[] {
        const dirs: string[] = [];
        const dirKeywords = ['目录', '文件夹', 'directory', 'folder'];
        
        const sentences = content.split(/[。！？\n]/);
        for (const sentence of sentences) {
            for (const keyword of dirKeywords) {
                if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
                    // 提取目录名
                    const match = sentence.match(new RegExp(`${keyword}[：:](.+?)(?:[。，,]|$)`, 'i'));
                    if (match && match[1]) {
                        dirs.push(match[1].trim());
                    }
                }
            }
        }
        
        return dirs;
    }

    // 检查是否应该在特定目录
    private shouldBeInDirectory(fileName: string, code: string, dir: string): boolean {
        // 简单的启发式规则
        const dirLower = dir.toLowerCase();
        
        if (dirLower.includes('controller') && (fileName.toLowerCase().includes('controller') || code.toLowerCase().includes('controller'))) {
            return true;
        }
        if (dirLower.includes('service') && (fileName.toLowerCase().includes('service') || code.toLowerCase().includes('service'))) {
            return true;
        }
        if (dirLower.includes('model') && (fileName.toLowerCase().includes('model') || code.toLowerCase().includes('model'))) {
            return true;
        }
        
        return false;
    }

    // 提取模块模式
    private extractModulePatterns(content: string): string[] {
        const patterns: string[] = [];
        const moduleKeywords = ['模块', 'module'];
        
        const sentences = content.split(/[。！？\n]/);
        for (const sentence of sentences) {
            for (const keyword of moduleKeywords) {
                if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
                    const match = sentence.match(new RegExp(`${keyword}[：:](.+?)(?:[。，,]|$)`, 'i'));
                    if (match && match[1]) {
                        patterns.push(match[1].trim());
                    }
                }
            }
        }
        
        return patterns;
    }

    // 检查是否有模块模式
    private hasModulePattern(code: string, pattern: string): boolean {
        return code.toLowerCase().includes(pattern.toLowerCase());
    }

    // 提取依赖关系
    private extractDependencies(code: string, language: string): ModuleDependency[] {
        const dependencies: ModuleDependency[] = [];

        // Go
        if (language === 'go') {
            const importMatches = code.match(/import\s+(?:"([^"]+)"|\(([^)]+)\))/g);
            if (importMatches) {
                importMatches.forEach(m => {
                    const pkg = m.match(/"([^"]+)"/)?.[1] || m.match(/\(([^)]+)\)/)?.[1];
                    if (pkg) {
                        dependencies.push({
                            from: '',
                            to: pkg.split(/\s+/)[0],
                            type: 'import'
                        });
                    }
                });
            }
        }

        // JavaScript/TypeScript
        if (language === 'javascript' || language === 'typescript') {
            const importMatches = code.match(/(?:import|require)\s+.*from\s+["']([^"']+)["']|require\(["']([^"']+)["']\)/g);
            if (importMatches) {
                importMatches.forEach(m => {
                    const pkg = m.match(/from\s+["']([^"']+)["']/)?.[1] || m.match(/require\(["']([^"']+)["']\)/)?.[1];
                    if (pkg) {
                        dependencies.push({
                            from: '',
                            to: pkg,
                            type: 'import'
                        });
                    }
                });
            }
        }

        return dependencies;
    }

    // 提取禁止的依赖
    private extractForbiddenDependencies(content: string): string[] {
        const deps: string[] = [];
        const forbiddenKeywords = ['禁止', '不允许', 'forbidden', 'not allowed'];
        
        const sentences = content.split(/[。！？\n]/);
        for (const sentence of sentences) {
            for (const keyword of forbiddenKeywords) {
                if (sentence.toLowerCase().includes(keyword.toLowerCase()) && 
                    (sentence.toLowerCase().includes('依赖') || sentence.toLowerCase().includes('import'))) {
                    const match = sentence.match(new RegExp(`${keyword}[：:](.+?)(?:[。，,]|$)`, 'i'));
                    if (match && match[1]) {
                        deps.push(match[1].trim());
                    }
                }
            }
        }
        
        return deps;
    }

    // 提取分层规则
    private extractLayerRules(content: string): Array<{ from: string; to: string; allowed: boolean }> {
        const rules: Array<{ from: string; to: string; allowed: boolean }> = [];
        
        // 简单的规则提取（例如：controller 不能依赖 model）
        if (content.toLowerCase().includes('controller') && content.toLowerCase().includes('model')) {
            if (content.toLowerCase().includes('不能') || content.toLowerCase().includes('禁止')) {
                rules.push({ from: 'controller', to: 'model', allowed: false });
            }
        }
        
        return rules;
    }

    // 检查分层规则违反
    private checkLayerRuleViolation(
        dependencies: ModuleDependency[],
        rule: { from: string; to: string; allowed: boolean },
        filePath: string
    ): string | null {
        const fileName = path.basename(filePath).toLowerCase();
        
        // 检查当前文件是否属于 from 层
        if (!fileName.includes(rule.from.toLowerCase())) {
            return null;
        }

        // 检查是否有到 to 层的依赖
        for (const dep of dependencies) {
            if (dep.to.toLowerCase().includes(rule.to.toLowerCase())) {
                if (!rule.allowed) {
                    return `请移除对 ${rule.to} 层的直接依赖，使用 ${rule.from} 层应该通过服务层访问`;
                }
            }
        }

        return null;
    }

    // 提取命名规则
    private extractNamingRules(content: string): string[] {
        const rules: string[] = [];
        
        // 简单的规则提取
        if (content.toLowerCase().includes('camelcase') || content.toLowerCase().includes('驼峰')) {
            rules.push('camelCase');
        }
        if (content.toLowerCase().includes('pascalcase') || content.toLowerCase().includes('帕斯卡')) {
            rules.push('PascalCase');
        }
        if (content.toLowerCase().includes('snake_case') || content.toLowerCase().includes('下划线')) {
            rules.push('snake_case');
        }
        
        return rules;
    }

    // 提取标识符
    private extractIdentifiers(code: string, language: string): string[] {
        const identifiers: string[] = [];

        // Go: func FunctionName, type StructName
        if (language === 'go') {
            const funcMatches = code.match(/func\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g);
            if (funcMatches) {
                funcMatches.forEach(m => {
                    const name = m.match(/func\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
                    if (name) identifiers.push(name);
                });
            }
            const typeMatches = code.match(/type\s+([A-Z][A-Za-z0-9_]*)\s+/g);
            if (typeMatches) {
                typeMatches.forEach(m => {
                    const name = m.match(/type\s+([A-Z][A-Za-z0-9_]*)/)?.[1];
                    if (name) identifiers.push(name);
                });
            }
        }

        // JavaScript/TypeScript
        if (language === 'javascript' || language === 'typescript') {
            const funcMatches = code.match(/(?:function\s+([A-Za-z_][A-Za-z0-9_]*)|const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s+)?\(|class\s+([A-Z][A-Za-z0-9_]*))/g);
            if (funcMatches) {
                funcMatches.forEach(m => {
                    const name = m.match(/(?:function\s+([A-Za-z_][A-Za-z0-9_]*)|const\s+([A-Za-z_][A-Za-z0-9_]*)|class\s+([A-Z][A-Za-z0-9_]*))/)?.[1] ||
                                m.match(/(?:function\s+([A-Za-z_][A-Za-z0-9_]*)|const\s+([A-Za-z_][A-Za-z0-9_]*)|class\s+([A-Z][A-Za-z0-9_]*))/)?.[2] ||
                                m.match(/(?:function\s+([A-Za-z_][A-Za-z0-9_]*)|const\s+([A-Za-z_][A-Za-z0-9_]*)|class\s+([A-Z][A-Za-z0-9_]*))/)?.[3];
                    if (name) identifiers.push(name);
                });
            }
        }

        return identifiers;
    }

    // 检查命名规则匹配
    private matchesNamingRule(identifier: string, rule: string): boolean {
        switch (rule) {
            case 'camelCase':
                return /^[a-z][a-zA-Z0-9]*$/.test(identifier);
            case 'PascalCase':
                return /^[A-Z][a-zA-Z0-9]*$/.test(identifier);
            case 'snake_case':
                return /^[a-z][a-z0-9_]*$/.test(identifier);
            default:
                return true;
        }
    }
}

