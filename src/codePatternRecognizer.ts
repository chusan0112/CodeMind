import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MemoryStorage, Memory, MemoryCategory, ImportanceLevel } from './memoryStorage';
import { CodeAnalyzer } from './codeAnalyzer';

// 代码模式接口
export interface CodePattern {
    id: string;
    name: string;
    description: string;
    language: string;
    pattern: string; // 正则表达式或代码片段
    category: MemoryCategory;
    importance: ImportanceLevel;
    examples: string[];
    frequency: number; // 出现频率
    files: string[]; // 出现该模式的文件列表
}

// 代码模式识别器类
export class CodePatternRecognizer {
    private storage: MemoryStorage;
    private context: vscode.ExtensionContext;
    private patterns: Map<string, CodePattern[]> = new Map();

    constructor(storage: MemoryStorage, context: vscode.ExtensionContext) {
        this.storage = storage;
        this.context = context;
    }

    // 识别项目中的代码模式
    async recognizePatterns(workspaceFolder: vscode.WorkspaceFolder): Promise<CodePattern[]> {
        const patterns: CodePattern[] = [];
        const workspacePath = workspaceFolder.uri.fsPath;

        // 扫描源代码文件
        const sourceFiles = await this.scanSourceFiles(workspacePath);
        
        // 按语言分组
        const filesByLanguage = this.groupFilesByLanguage(sourceFiles);

        // 识别每种语言的模式
        for (const [language, files] of filesByLanguage.entries()) {
            const languagePatterns = await this.recognizeLanguagePatterns(language, files, workspacePath);
            patterns.push(...languagePatterns);
        }

        return patterns;
    }

    // 扫描源代码文件
    private async scanSourceFiles(workspacePath: string): Promise<string[]> {
        const sourceFiles: string[] = [];
        const extensions = ['.go', '.js', '.ts', '.py', '.java', '.rs', '.cpp', '.c', '.cs', '.php', '.rb'];
        
        const scanDir = async (dir: string): Promise<void> => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    // 跳过隐藏文件和目录
                    if (entry.name.startsWith('.')) {
                        continue;
                    }
                    
                    // 跳过 node_modules、vendor 等目录
                    if (['node_modules', 'vendor', '.git', 'out', 'dist', 'build'].includes(entry.name)) {
                        continue;
                    }

                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory()) {
                        await scanDir(fullPath);
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name);
                        if (extensions.includes(ext)) {
                            sourceFiles.push(fullPath);
                        }
                    }
                }
            } catch (error) {
                // 忽略权限错误等
            }
        };

        await scanDir(workspacePath);
        return sourceFiles;
    }

    // 按语言分组文件
    private groupFilesByLanguage(files: string[]): Map<string, string[]> {
        const grouped = new Map<string, string[]>();

        for (const file of files) {
            const ext = path.extname(file);
            const language = this.getLanguageFromExtension(ext);
            
            if (!grouped.has(language)) {
                grouped.set(language, []);
            }
            grouped.get(language)!.push(file);
        }

        return grouped;
    }

    // 从扩展名获取语言
    private getLanguageFromExtension(ext: string): string {
        const langMap: Record<string, string> = {
            '.go': 'go',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.php': 'php',
            '.rb': 'ruby'
        };
        return langMap[ext] || 'unknown';
    }

    // 识别特定语言的模式
    private async recognizeLanguagePatterns(
        language: string,
        files: string[],
        workspacePath: string
    ): Promise<CodePattern[]> {
        const patterns: CodePattern[] = [];
        
        // 限制文件数量，避免处理时间过长
        const sampleFiles = files.slice(0, 50);
        
        // 收集代码片段
        const codeSnippets: Array<{ file: string; code: string }> = [];
        
        for (const file of sampleFiles) {
            try {
                const content = fs.readFileSync(file, 'utf-8');
                const snippets = this.extractCodeSnippets(content, language);
                for (const snippet of snippets) {
                    codeSnippets.push({ file, code: snippet });
                }
            } catch (error) {
                // 忽略读取错误
            }
        }

        // 识别常见模式
        const commonPatterns = this.identifyCommonPatterns(codeSnippets, language);
        patterns.push(...commonPatterns);

        return patterns;
    }

    // 提取代码片段
    private extractCodeSnippets(content: string, language: string): string[] {
        const snippets: string[] = [];
        const lines = content.split('\n');
        
        // 提取函数定义
        const functionPatterns: Record<string, RegExp> = {
            'go': /^func\s+\w+/,
            'javascript': /^(function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\(|export\s+(?:async\s+)?function\s+\w+)/,
            'typescript': /^(function\s+\w+|const\s+\w+\s*:\s*(?:async\s+)?\(|export\s+(?:async\s+)?function\s+\w+)/,
            'python': /^def\s+\w+/,
            'java': /^\s*(?:public|private|protected)?\s*(?:static)?\s*\w+\s+\w+\s*\(/,
            'rust': /^(?:pub\s+)?fn\s+\w+/
        };

        const pattern = functionPatterns[language];
        if (!pattern) {
            return snippets;
        }

        let currentFunction: string[] = [];
        let inFunction = false;
        let braceCount = 0;

        for (const line of lines) {
            if (pattern.test(line)) {
                if (inFunction && currentFunction.length > 0) {
                    snippets.push(currentFunction.join('\n'));
                }
                currentFunction = [line];
                inFunction = true;
                braceCount = this.countBraces(line);
            } else if (inFunction) {
                currentFunction.push(line);
                braceCount += this.countBraces(line);
                if (braceCount === 0) {
                    snippets.push(currentFunction.join('\n'));
                    currentFunction = [];
                    inFunction = false;
                }
            }
        }

        return snippets;
    }

    // 计算括号数量
    private countBraces(line: string): number {
        let count = 0;
        for (const char of line) {
            if (char === '{') count++;
            if (char === '}') count--;
        }
        return count;
    }

    // 识别常见模式
    private identifyCommonPatterns(
        snippets: Array<{ file: string; code: string }>,
        language: string
    ): CodePattern[] {
        const patterns: CodePattern[] = [];
        const patternMap = new Map<string, { count: number; files: Set<string>; examples: string[] }>();

        // 分析代码片段，找出重复模式
        for (const snippet of snippets) {
            const normalized = this.normalizeCode(snippet.code);
            if (normalized.length < 20) {
                continue; // 跳过太短的片段
            }

            const key = this.generatePatternKey(normalized);
            if (!patternMap.has(key)) {
                patternMap.set(key, {
                    count: 0,
                    files: new Set(),
                    examples: []
                });
            }

            const pattern = patternMap.get(key)!;
            pattern.count++;
            pattern.files.add(snippet.file);
            if (pattern.examples.length < 3) {
                pattern.examples.push(snippet.code.substring(0, 200));
            }
        }

        // 转换为 CodePattern（只保留出现频率高的）
        for (const [key, data] of patternMap.entries()) {
            if (data.count >= 3 && data.files.size >= 2) {
                // 这是一个常见模式
                const pattern: CodePattern = {
                    id: this.generateId(),
                    name: `常见模式 ${patterns.length + 1}`,
                    description: `项目中出现的常见代码模式（出现 ${data.count} 次）`,
                    language: language,
                    pattern: key,
                    category: MemoryCategory.CODE_STYLE,
                    importance: ImportanceLevel.MEDIUM,
                    examples: data.examples,
                    frequency: data.count,
                    files: Array.from(data.files)
                };
                patterns.push(pattern);
            }
        }

        return patterns;
    }

    // 标准化代码（移除变量名、空格等）
    private normalizeCode(code: string): string {
        // 移除注释
        let normalized = code.replace(/\/\/.*$/gm, '');
        normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
        
        // 移除字符串字面量
        normalized = normalized.replace(/["'][^"']*["']/g, '""');
        
        // 移除数字
        normalized = normalized.replace(/\b\d+\b/g, '0');
        
        // 标准化空白
        normalized = normalized.replace(/\s+/g, ' ');
        
        return normalized.trim();
    }

    // 生成模式键
    private generatePatternKey(code: string): string {
        // 提取关键结构（函数签名、控制流等）
        const lines = code.split('\n').slice(0, 5); // 只取前5行
        return lines.join(' ').substring(0, 100);
    }

    // 将模式转换为记忆
    async patternsToMemories(patterns: CodePattern[]): Promise<Memory[]> {
        const memories: Memory[] = [];

        for (const pattern of patterns) {
            const memory: Memory = {
                id: pattern.id,
                content: `代码模式: ${pattern.name} - ${pattern.description}。模式: ${pattern.pattern.substring(0, 200)}`,
                category: pattern.category,
                timestamp: Date.now(),
                tags: ['code-pattern', pattern.language, 'auto-detected'],
                importance: pattern.importance,
                confidence: Math.min(pattern.frequency / 10, 1.0)
            };
            memories.push(memory);
        }

        return memories;
    }

    // 检测模式不一致
    async detectPatternInconsistencies(
        code: string,
        filePath: string,
        language: string
    ): Promise<Array<{ message: string; line: number }>> {
        const issues: Array<{ message: string; line: number }> = [];
        
        // 获取该语言的所有模式
        const languagePatterns = Array.from(this.patterns.values())
            .flat()
            .filter(p => p.language === language);

        if (languagePatterns.length === 0) {
            return issues;
        }

        // 检查代码是否符合常见模式
        const normalized = this.normalizeCode(code);
        const codeKey = this.generatePatternKey(normalized);

        for (const pattern of languagePatterns) {
            if (pattern.frequency >= 5) {
                // 这是一个常见模式，检查当前代码是否匹配
                const patternKey = this.generatePatternKey(pattern.pattern);
                const similarity = this.calculateSimilarity(codeKey, patternKey);
                
                if (similarity < 0.3) {
                    // 代码与常见模式差异较大
                    issues.push({
                        message: `代码风格与项目常见模式不一致。建议参考: ${pattern.name}`,
                        line: 1
                    });
                }
            }
        }

        return issues;
    }

    // 计算相似度
    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) {
            return 1.0;
        }

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    // 计算编辑距离
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    // 生成 ID
    private generateId(): string {
        return 'pattern_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }
}

