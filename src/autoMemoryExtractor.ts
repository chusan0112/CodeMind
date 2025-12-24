import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MemoryStorage, Memory, MemoryCategory, ImportanceLevel } from './memoryStorage';
import { CodeAnalyzer, CodeType } from './codeAnalyzer';

// 关键要素提取器
export class AutoMemoryExtractor {
    private storage: MemoryStorage;
    private context: vscode.ExtensionContext;
    private fileWatchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(storage: MemoryStorage, context: vscode.ExtensionContext) {
        this.storage = storage;
        this.context = context;
    }

    // 提取关键要素（只提取重要信息，不保存完整代码）
    async extractKeyElements(code: string, filePath: string, language: string): Promise<{
        architecture?: string;      // 架构信息
        apiEndpoints?: string[];     // API端点
        config?: Record<string, any>; // 配置信息
        constraints?: string[];       // 约束条件
        businessRules?: string[];    // 业务规则
        dependencies?: string[];      // 依赖关系
    }> {
        const elements: any = {};
        const analysis = CodeAnalyzer.analyzeCode(code, filePath, language);

        // 提取架构信息
        if (analysis.type === CodeType.STRUCT || analysis.type === CodeType.CLASS || analysis.type === CodeType.INTERFACE) {
            elements.architecture = this.extractArchitectureInfo(code, analysis);
        }

        // 提取API端点
        if (analysis.type === CodeType.API_ENDPOINT) {
            elements.apiEndpoints = this.extractApiEndpoints(code, language);
        }

        // 提取配置信息
        if (analysis.type === CodeType.CONFIG || filePath.includes('config') || filePath.includes('setting')) {
            elements.config = this.extractConfigInfo(code, language);
        }

        // 提取约束条件
        elements.constraints = this.extractConstraints(code);

        // 提取业务规则
        elements.businessRules = this.extractBusinessRules(code);

        // 提取依赖关系
        elements.dependencies = this.extractDependencies(code, language);

        return elements;
    }

    // 提取架构信息（只提取关键结构，不保存完整代码）
    private extractArchitectureInfo(code: string, analysis: any): string {
        const lines = code.split('\n');
        const keyInfo: string[] = [];

        // 提取结构体/类名
        if (analysis.extractedInfo.name) {
            keyInfo.push(`结构/类名: ${analysis.extractedInfo.name}`);
        }

        // 提取关键字段（前10个）
        const fieldPatterns = [
            /\b(?:type|struct|class|interface)\s+\w+\s*\{([^}]+)\}/s,
            /(\w+)\s+(?:string|int|bool|float|\[\]|map\[)/g
        ];

        for (const pattern of fieldPatterns) {
            const matches = code.match(pattern);
            if (matches) {
                const fields = matches.slice(0, 10).map(m => m.trim()).filter(m => m.length > 0);
                if (fields.length > 0) {
                    keyInfo.push(`关键字段: ${fields.join(', ')}`);
                    break;
                }
            }
        }

        // 提取关键方法签名（前5个）
        const methodPatterns = [
            /\bfunc\s+\([^)]+\)\s+(\w+)\s*\([^)]*\)/g,  // Go
            /\b(?:public|private)\s+\w+\s+(\w+)\s*\(/g,  // Java
            /\bfunction\s+(\w+)\s*\(/g,                   // JavaScript
            /\bdef\s+(\w+)\s*\(/g                         // Python
        ];

        for (const pattern of methodPatterns) {
            const matches = [...code.matchAll(pattern)];
            if (matches.length > 0) {
                const methods = matches.slice(0, 5).map(m => m[1]).filter(m => m);
                if (methods.length > 0) {
                    keyInfo.push(`关键方法: ${methods.join(', ')}`);
                    break;
                }
            }
        }

        return keyInfo.join(' | ');
    }

    // 提取API端点（只提取路径和方法，不保存完整代码）
    private extractApiEndpoints(code: string, language: string): string[] {
        const endpoints: string[] = [];

        // Go: router.GET("/api/users", handler)
        const goPattern = /router\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*["']([^"']+)["']/g;
        let match;
        while ((match = goPattern.exec(code)) !== null) {
            endpoints.push(`${match[1]} ${match[2]}`);
        }

        // JavaScript/TypeScript: app.get('/api/users', ...)
        const jsPattern = /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/gi;
        while ((match = jsPattern.exec(code)) !== null) {
            endpoints.push(`${match[1].toUpperCase()} ${match[2]}`);
        }

        // Python: @app.route('/api/users', methods=['GET'])
        const pyPattern = /@app\.route\s*\(\s*["']([^"']+)["'][^)]*methods\s*=\s*\[["'](\w+)["']/g;
        while ((match = pyPattern.exec(code)) !== null) {
            endpoints.push(`${match[2]} ${match[1]}`);
        }

        return endpoints;
    }

    // 提取配置信息（只提取键值对，不保存完整配置）
    private extractConfigInfo(code: string, language: string): Record<string, any> {
        const config: Record<string, any> = {};

        // JSON格式
        try {
            const jsonMatch = code.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const json = JSON.parse(jsonMatch[0]);
                // 只提取前20个关键配置项
                const keys = Object.keys(json).slice(0, 20);
                for (const key of keys) {
                    config[key] = typeof json[key] === 'object' ? '[object]' : json[key];
                }
            }
        } catch {
            // 不是JSON格式，尝试其他格式
        }

        // 键值对格式: key = value 或 key: value
        const kvPattern = /(\w+)\s*[:=]\s*([^\n,;]+)/g;
        let match;
        let count = 0;
        while ((match = kvPattern.exec(code)) !== null && count < 20) {
            config[match[1].trim()] = match[2].trim();
            count++;
        }

        return config;
    }

    // 提取约束条件（只提取约束描述，不保存代码）
    private extractConstraints(code: string): string[] {
        const constraints: string[] = [];
        const lines = code.split('\n');

        // 查找注释中的约束说明
        const constraintKeywords = ['禁止', '不允许', '必须', '要求', '约束', '限制', '不能'];
        
        for (const line of lines) {
            const trimmed = line.trim();
            // 检查注释行
            if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
                for (const keyword of constraintKeywords) {
                    if (trimmed.includes(keyword)) {
                        // 提取约束描述（去除注释符号）
                        const desc = trimmed.replace(/^\/\/|^#|^\/\*|\*\/$/g, '').trim();
                        if (desc.length > 0 && desc.length < 200) {
                            constraints.push(desc);
                        }
                        break;
                    }
                }
            }
        }

        return constraints.slice(0, 10); // 最多10条
    }

    // 提取业务规则（只提取规则描述，不保存代码）
    private extractBusinessRules(code: string): string[] {
        const rules: string[] = [];
        const lines = code.split('\n');

        // 查找业务规则相关的注释
        const ruleKeywords = ['规则', '业务', '逻辑', '流程', '处理', '验证'];
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
                for (const keyword of ruleKeywords) {
                    if (trimmed.includes(keyword)) {
                        const desc = trimmed.replace(/^\/\/|^#|^\/\*|\*\/$/g, '').trim();
                        if (desc.length > 0 && desc.length < 200) {
                            rules.push(desc);
                        }
                        break;
                    }
                }
            }
        }

        return rules.slice(0, 10); // 最多10条
    }

    // 提取依赖关系（只提取依赖名称，不保存完整代码）
    private extractDependencies(code: string, language: string): string[] {
        const dependencies: string[] = [];

        // Go: import "github.com/xxx/yyy"
        const goImportPattern = /import\s+["']([^"']+)["']/g;
        let match;
        while ((match = goImportPattern.exec(code)) !== null) {
            dependencies.push(match[1]);
        }

        // JavaScript: import xxx from 'yyy' 或 require('yyy')
        const jsImportPattern = /(?:import|require)\s+.*?["']([^"']+)["']/g;
        while ((match = jsImportPattern.exec(code)) !== null) {
            dependencies.push(match[1]);
        }

        // Python: import xxx 或 from xxx import
        const pyImportPattern = /(?:import|from)\s+(\w+)/g;
        while ((match = pyImportPattern.exec(code)) !== null) {
            dependencies.push(match[1]);
        }

        return [...new Set(dependencies)].slice(0, 20); // 去重，最多20个
    }

    // 创建压缩的记忆（只保存关键要素，不保存完整代码）
    async createCompressedMemory(
        filePath: string,
        elements: any,
        analysis: any
    ): Promise<Memory | null> {
        const memories: Memory[] = [];
        const fileName = path.basename(filePath);
        const fileDir = path.dirname(filePath);

        // 1. 架构记忆（如果有关键架构信息）
        if (elements.architecture) {
            memories.push({
                id: this.generateId(),
                content: `文件 ${fileName}: ${elements.architecture}`,
                category: MemoryCategory.ARCHITECTURE,
                timestamp: Date.now(),
                tags: [...analysis.tags, 'auto-extracted'],
                importance: ImportanceLevel.HIGH,
                relatedFiles: [filePath],
                confidence: 0.9
            });
        }

        // 2. API端点记忆（强制级，非常重要）
        if (elements.apiEndpoints && elements.apiEndpoints.length > 0) {
            memories.push({
                id: this.generateId(),
                content: `API端点定义: ${elements.apiEndpoints.join(', ')}`,
                category: MemoryCategory.API_SPEC,
                timestamp: Date.now(),
                tags: [...analysis.tags, 'api', 'auto-extracted'],
                importance: ImportanceLevel.CRITICAL,
                relatedFiles: [filePath],
                confidence: 1.0
            });
        }

        // 3. 配置记忆
        if (elements.config && Object.keys(elements.config).length > 0) {
            const configStr = Object.entries(elements.config)
                .slice(0, 10)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ');
            memories.push({
                id: this.generateId(),
                content: `配置项: ${configStr}`,
                category: MemoryCategory.CONFIG,
                timestamp: Date.now(),
                tags: [...analysis.tags, 'config', 'auto-extracted'],
                importance: ImportanceLevel.HIGH,
                relatedFiles: [filePath],
                confidence: 0.9
            });
        }

        // 4. 约束记忆（强制级）
        if (elements.constraints && elements.constraints.length > 0) {
            memories.push({
                id: this.generateId(),
                content: `约束条件: ${elements.constraints.join('; ')}`,
                category: MemoryCategory.CONSTRAINT,
                timestamp: Date.now(),
                tags: [...analysis.tags, 'constraint', 'auto-extracted'],
                importance: ImportanceLevel.CRITICAL,
                relatedFiles: [filePath],
                confidence: 0.9
            });
        }

        // 5. 业务规则记忆（强制级）
        if (elements.businessRules && elements.businessRules.length > 0) {
            memories.push({
                id: this.generateId(),
                content: `业务规则: ${elements.businessRules.join('; ')}`,
                category: MemoryCategory.BUSINESS_RULE,
                timestamp: Date.now(),
                tags: [...analysis.tags, 'business', 'auto-extracted'],
                importance: ImportanceLevel.CRITICAL,
                relatedFiles: [filePath],
                confidence: 0.9
            });
        }

        // 6. 依赖记忆（参考级）
        if (elements.dependencies && elements.dependencies.length > 0) {
            memories.push({
                id: this.generateId(),
                content: `依赖关系: ${elements.dependencies.join(', ')}`,
                category: MemoryCategory.ARCHITECTURE,
                timestamp: Date.now(),
                tags: [...analysis.tags, 'dependencies', 'auto-extracted'],
                importance: ImportanceLevel.MEDIUM,
                relatedFiles: [filePath],
                confidence: 0.8
            });
        }

        // 保存所有记忆
        for (const memory of memories) {
            await this.storage.addMemory(memory);
        }

        return memories.length > 0 ? memories[0] : null;
    }

    // 检查文件是否应该被忽略（避免记录不必要的工程文件）
    private shouldIgnoreFile(filePath: string): boolean {
        const ignorePatterns = [
            /node_modules/,
            /\.git/,
            /\.vscode/,
            /\.idea/,
            /dist/,
            /build/,
            /out/,
            /target/,
            /\.gradle/,
            /\.mvn/,
            /vendor/,
            /__pycache__/,
            /\.pytest_cache/,
            /\.cursor-memory/,
            /\.DS_Store/,
            /\.log$/,
            /\.tmp$/,
            /\.cache$/,
            /package-lock\.json$/,
            /yarn\.lock$/,
            /go\.sum$/,
            /\.min\.js$/,
            /\.min\.css$/,
            /\.map$/
        ];

        return ignorePatterns.some(pattern => pattern.test(filePath));
    }

    // 监听文件变化，自动提取关键要素
    setupAutoExtraction(context: vscode.ExtensionContext): void {
        const config = vscode.workspace.getConfiguration('memoryManager');
        if (!config.get<boolean>('autoExtract', true)) {
            return;
        }

        // 监听文件保存事件
        const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument(async (document) => {
            // 忽略非源代码文件
            const sourceLanguages = ['go', 'java', 'javascript', 'typescript', 'python', 'rust', 'c', 'cpp', 'csharp', 'php', 'ruby'];
            if (!sourceLanguages.includes(document.languageId)) {
                return;
            }

            // 检查是否应该忽略
            if (this.shouldIgnoreFile(document.fileName)) {
                return;
            }

            // 防抖处理（避免频繁触发）
            const filePath = document.fileName;
            const existingTimer = this.debounceTimers.get(filePath);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            const timer = setTimeout(async () => {
                try {
                    const code = document.getText();
                    const elements = await this.extractKeyElements(code, filePath, document.languageId);
                    const analysis = CodeAnalyzer.analyzeCode(code, filePath, document.languageId);
                    
                    await this.createCompressedMemory(filePath, elements, analysis);
                    
                    console.log(`自动提取记忆: ${path.basename(filePath)}`);
                } catch (error) {
                    console.error('自动提取记忆失败:', error);
                }
                
                this.debounceTimers.delete(filePath);
            }, 2000); // 2秒防抖

            this.debounceTimers.set(filePath, timer);
        });

        context.subscriptions.push(onDidSaveTextDocument);

        // 监听文件创建事件
        const onDidCreateFiles = vscode.workspace.onDidCreateFiles(async (event) => {
            for (const file of event.files) {
                if (this.shouldIgnoreFile(file.fsPath)) {
                    continue;
                }

                try {
                    const content = fs.readFileSync(file.fsPath, 'utf-8');
                    const language = this.detectLanguageFromPath(file.fsPath);
                    const elements = await this.extractKeyElements(content, file.fsPath, language);
                    const analysis = CodeAnalyzer.analyzeCode(content, file.fsPath, language);
                    
                    await this.createCompressedMemory(file.fsPath, elements, analysis);
                } catch (error) {
                    // 忽略错误（可能是二进制文件等）
                }
            }
        });

        context.subscriptions.push(onDidCreateFiles);
    }

    // 从文件路径检测语言
    private detectLanguageFromPath(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const langMap: Record<string, string> = {
            '.go': 'go',
            '.java': 'java',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.rs': 'rust',
            '.c': 'c',
            '.cpp': 'cpp',
            '.cs': 'csharp',
            '.php': 'php',
            '.rb': 'ruby'
        };
        return langMap[ext] || 'unknown';
    }

    // 生成ID
    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
}

