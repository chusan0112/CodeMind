import * as vscode from 'vscode';
import { Memory, MemoryCategory, ImportanceLevel } from './memoryStorage';
import { ArchitectureChecker, ArchitectureIssue } from './architectureChecker';

// 验证结果
export interface ValidationResult {
    passed: boolean;
    issues: ValidationIssue[];
    summary: string;
}

// 验证问题
export interface ValidationIssue {
    type: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
    column?: number;
    memoryId?: string;
    memoryContent?: string;
}

// 代码验证器类
export class CodeValidator {
    private memories: Memory[];
    private architectureChecker: ArchitectureChecker | null = null;

    constructor(memories: Memory[], storage?: any) {
        this.memories = memories;
        // 如果提供了 storage，创建架构检查器
        if (storage) {
            this.architectureChecker = new ArchitectureChecker(storage);
        }
    }

    // 验证代码
    async validateCode(code: string, filePath: string, language: string): Promise<ValidationResult> {
        const issues: ValidationIssue[] = [];

        // 1. 验证架构约束（强制级记忆）
        const architectureIssues = this.validateArchitecture(code, filePath);
        issues.push(...architectureIssues);

        // 1.5. 架构一致性检查（如果启用了架构检查器）
        if (this.architectureChecker) {
            try {
                const archResult = await this.architectureChecker.checkArchitecture(code, filePath, language);
                // 将架构问题转换为验证问题
                const archValidationIssues: ValidationIssue[] = archResult.issues.map(archIssue => ({
                    type: archIssue.type,
                    message: archIssue.message,
                    line: archIssue.line,
                    column: archIssue.column,
                    memoryId: archIssue.memoryId,
                    memoryContent: archIssue.memoryContent
                }));
                issues.push(...archValidationIssues);
            } catch (error) {
                console.error('架构检查失败:', error);
            }
        }

        // 2. 验证命名规范（推荐级和强制级记忆）
        const namingIssues = this.validateNaming(code, language);
        issues.push(...namingIssues);

        // 3. 验证代码风格（推荐级记忆）
        const styleIssues = this.validateCodeStyle(code, language);
        issues.push(...styleIssues);

        // 4. 验证业务规则（强制级记忆）
        const businessIssues = this.validateBusinessRules(code);
        issues.push(...businessIssues);

        // 5. 验证约束记忆（强制级记忆）
        const constraintIssues = this.validateConstraints(code);
        issues.push(...constraintIssues);

        // 生成摘要
        const errorCount = issues.filter(i => i.type === 'error').length;
        const warningCount = issues.filter(i => i.type === 'warning').length;
        const infoCount = issues.filter(i => i.type === 'info').length;

        const passed = errorCount === 0;
        
        // 生成更详细的摘要
        let summary = '';
        if (passed && issues.length === 0) {
            summary = '✅ 代码验证通过！代码完全符合项目记忆要求。';
        } else if (passed) {
            summary = `✅ 代码验证通过（无错误） | ⚠️ 警告: ${warningCount} | ℹ️ 提示: ${infoCount}`;
        } else {
            summary = `❌ 代码验证失败 | 🔴 错误: ${errorCount} | ⚠️ 警告: ${warningCount} | ℹ️ 提示: ${infoCount}`;
        }

        return {
            passed,
            issues,
            summary
        };
    }

    // 验证架构约束
    private validateArchitecture(code: string, filePath: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        
        // 获取架构相关的强制级记忆
        const architectureMemories = this.memories.filter(m => 
            m.category === MemoryCategory.ARCHITECTURE &&
            m.importance === ImportanceLevel.CRITICAL
        );

        for (const memory of architectureMemories) {
            // 检查文件路径是否符合架构要求
            if (memory.content.includes('目录结构') || memory.content.includes('目录')) {
                const structureMatch = memory.content.match(/目录结构[：:]\s*(.+)/);
                if (structureMatch) {
                    const expectedDirs = structureMatch[1].split(',').map(d => d.trim());
                    const fileDir = filePath.split('/').slice(0, -1).join('/');
                    
                    // 简单检查：文件是否在预期的目录结构中
                    const isInExpectedDir = expectedDirs.some(dir => fileDir.includes(dir));
                    if (!isInExpectedDir && expectedDirs.length > 0) {
                        issues.push({
                            type: 'warning',
                            message: `文件路径可能不符合架构要求。预期目录: ${expectedDirs.join(', ')}`,
                            memoryId: memory.id,
                            memoryContent: memory.content
                        });
                    }
                }
            }

            // 检查是否使用了禁止的架构模式
            if (memory.content.includes('禁止') || memory.content.includes('不允许')) {
                const forbiddenPatterns = this.extractForbiddenPatterns(memory.content);
                for (const pattern of forbiddenPatterns) {
                    if (code.includes(pattern)) {
                        issues.push({
                            type: 'error',
                            message: `违反了架构约束: ${pattern}`,
                            memoryId: memory.id,
                            memoryContent: memory.content
                        });
                    }
                }
            }
        }

        return issues;
    }

    // 验证命名规范
    private validateNaming(code: string, language: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        
        // 获取命名相关的记忆
        const namingMemories = this.memories.filter(m => 
            (m.category === MemoryCategory.CODE_STYLE || m.tags.includes('naming') || m.content.includes('命名')) &&
            (m.importance === ImportanceLevel.CRITICAL || m.importance === ImportanceLevel.HIGH)
        );

        // 如果没有找到命名记忆，尝试从代码风格记忆中提取
        if (namingMemories.length === 0) {
            const styleMemories = this.memories.filter(m => 
                m.category === MemoryCategory.CODE_STYLE &&
                m.content.includes('命名')
            );
            namingMemories.push(...styleMemories);
        }

        // 如果没有找到任何命名记忆，使用语言默认规则
        if (namingMemories.length === 0) {
            const defaultStyle = this.getDefaultNamingStyle(language);
            if (defaultStyle) {
                const violations = this.checkNamingViolations(code, { style: defaultStyle, importance: ImportanceLevel.MEDIUM }, language);
                for (const violation of violations) {
                    issues.push({
                        type: 'warning',
                        message: violation,
                        memoryId: undefined,
                        memoryContent: undefined
                    });
                }
            }
            return issues;
        }

        for (const memory of namingMemories) {
            // 提取命名规范
            const namingStyle = this.extractNamingStyle(memory.content);
            
            if (namingStyle) {
                // 检查代码中的命名是否符合规范
                const violations = this.checkNamingViolations(code, namingStyle, language);
                for (const violation of violations) {
                    issues.push({
                        type: namingStyle.importance === ImportanceLevel.CRITICAL ? 'error' : 'warning',
                        message: violation,
                        memoryId: memory.id,
                        memoryContent: memory.content
                    });
                }
            }
        }

        return issues;
    }

    // 获取语言的默认命名风格
    private getDefaultNamingStyle(language: string): string | null {
        const defaultStyles: Record<string, string> = {
            'go': 'camelCase',
            'java': 'camelCase',
            'javascript': 'camelCase',
            'typescript': 'camelCase',
            'python': 'snake_case',
            'csharp': 'camelCase'
        };
        return defaultStyles[language.toLowerCase()] || null;
    }

    // 验证代码风格
    private validateCodeStyle(code: string, language: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        
        // 获取代码风格相关的记忆
        const styleMemories = this.memories.filter(m => 
            m.category === MemoryCategory.CODE_STYLE &&
            m.importance === ImportanceLevel.HIGH
        );

        for (const memory of styleMemories) {
            // 检查代码风格要求
            if (memory.content.includes('注释')) {
                // 检查是否有必要的注释
                const hasComments = code.includes('//') || code.includes('/*') || code.includes('#');
                if (!hasComments && code.length > 100) {
                    issues.push({
                        type: 'info',
                        message: '建议添加代码注释',
                        memoryId: memory.id,
                        memoryContent: memory.content
                    });
                }
            }

            // 检查代码长度
            if (memory.content.includes('函数长度') || memory.content.includes('代码长度')) {
                const lines = code.split('\n');
                const functionLines = this.countFunctionLines(code);
                if (functionLines > 50) {
                    issues.push({
                        type: 'warning',
                        message: `函数可能过长（${functionLines} 行），建议拆分`,
                        memoryId: memory.id,
                        memoryContent: memory.content
                    });
                }
            }
        }

        return issues;
    }

    // 验证业务规则
    private validateBusinessRules(code: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        
        // 获取业务规则相关的强制级记忆
        const businessMemories = this.memories.filter(m => 
            m.category === MemoryCategory.BUSINESS_RULE &&
            m.importance === ImportanceLevel.CRITICAL
        );

        for (const memory of businessMemories) {
            // 检查业务规则关键词
            const keywords = this.extractKeywords(memory.content);
            const codeLower = code.toLowerCase();
            
            // 如果代码涉及相关业务，检查是否符合规则
            const hasRelatedCode = keywords.some(keyword => codeLower.includes(keyword.toLowerCase()));
            if (hasRelatedCode) {
                // 检查是否违反了业务规则
                const violations = this.checkBusinessRuleViolations(code, memory.content);
                for (const violation of violations) {
                    issues.push({
                        type: 'error',
                        message: `违反业务规则: ${violation}`,
                        memoryId: memory.id,
                        memoryContent: memory.content
                    });
                }
            }
        }

        return issues;
    }

    // 验证约束记忆
    private validateConstraints(code: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        
        // 获取约束相关的强制级记忆
        const constraintMemories = this.memories.filter(m => 
            m.category === MemoryCategory.CONSTRAINT &&
            m.importance === ImportanceLevel.CRITICAL
        );

        for (const memory of constraintMemories) {
            // 检查禁止使用的库或模式
            if (memory.content.includes('禁止') || memory.content.includes('不允许')) {
                const forbiddenItems = this.extractForbiddenItems(memory.content);
                for (const item of forbiddenItems) {
                    if (code.includes(item)) {
                        issues.push({
                            type: 'error',
                            message: `使用了禁止的内容: ${item}`,
                            memoryId: memory.id,
                            memoryContent: memory.content
                        });
                    }
                }
            }

            // 检查必须使用的内容
            if (memory.content.includes('必须') || memory.content.includes('要求')) {
                const requiredItems = this.extractRequiredItems(memory.content);
                for (const item of requiredItems) {
                    if (!code.includes(item)) {
                        issues.push({
                            type: 'warning',
                            message: `建议使用: ${item}`,
                            memoryId: memory.id,
                            memoryContent: memory.content
                        });
                    }
                }
            }
        }

        return issues;
    }

    // 提取禁止的模式
    private extractForbiddenPatterns(content: string): string[] {
        const patterns: string[] = [];
        // 简单提取，可以根据需要改进
        const matches = content.match(/禁止[：:]\s*([^。，]+)/g);
        if (matches) {
            for (const match of matches) {
                const pattern = match.replace(/禁止[：:]\s*/, '').trim();
                if (pattern) {
                    patterns.push(pattern);
                }
            }
        }
        return patterns;
    }

    // 提取命名风格
    private extractNamingStyle(content: string): { style: string; importance: ImportanceLevel } | null {
        if (content.includes('驼峰') || content.includes('camelCase')) {
            return { style: 'camelCase', importance: ImportanceLevel.HIGH };
        }
        if (content.includes('蛇形') || content.includes('snake_case')) {
            return { style: 'snake_case', importance: ImportanceLevel.HIGH };
        }
        if (content.includes('帕斯卡') || content.includes('PascalCase')) {
            return { style: 'PascalCase', importance: ImportanceLevel.HIGH };
        }
        return null;
    }

    // 检查命名违规
    private checkNamingViolations(code: string, namingStyle: { style: string; importance: ImportanceLevel }, language: string): string[] {
        const violations: string[] = [];
        const lines = code.split('\n');
        
        // 根据语言定义不同的命名检查规则
        const namingRules = this.getNamingRulesForLanguage(language, namingStyle.style);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            
            // 检查变量声明
            const variableViolations = this.checkVariableNaming(line, namingRules, lineNumber);
            violations.push(...variableViolations);
            
            // 检查函数声明
            const functionViolations = this.checkFunctionNaming(line, namingRules, language, lineNumber);
            violations.push(...functionViolations);
            
            // 检查类/结构体声明
            const classViolations = this.checkClassNaming(line, namingRules, language, lineNumber);
            violations.push(...classViolations);
        }
        
        return violations;
    }

    // 获取语言的命名规则
    private getNamingRulesForLanguage(language: string, expectedStyle: string): {
        variable: string;
        function: string;
        class: string;
        constant: string;
    } {
        // Go 语言：导出用 PascalCase，其他用 camelCase
        if (language === 'go') {
            return {
                variable: 'camelCase',
                function: expectedStyle === 'PascalCase' ? 'PascalCase' : 'camelCase',
                class: 'PascalCase', // Go 的结构体和接口
                constant: 'camelCase'
            };
        }
        
        // Java/C#：类用 PascalCase，变量和方法用 camelCase
        if (language === 'java' || language === 'csharp') {
            return {
                variable: 'camelCase',
                function: 'camelCase',
                class: 'PascalCase',
                constant: 'UPPER_SNAKE_CASE'
            };
        }
        
        // Python：主要用 snake_case
        if (language === 'python') {
            return {
                variable: 'snake_case',
                function: 'snake_case',
                class: 'PascalCase',
                constant: 'UPPER_SNAKE_CASE'
            };
        }
        
        // JavaScript/TypeScript：变量和函数用 camelCase，类用 PascalCase
        if (language === 'javascript' || language === 'typescript') {
            return {
                variable: 'camelCase',
                function: 'camelCase',
                class: 'PascalCase',
                constant: 'UPPER_SNAKE_CASE'
            };
        }
        
        // 默认使用期望的风格
        return {
            variable: expectedStyle,
            function: expectedStyle,
            class: 'PascalCase',
            constant: 'UPPER_SNAKE_CASE'
        };
    }

    // 检查变量命名
    private checkVariableNaming(line: string, rules: any, lineNumber: number): string[] {
        const violations: string[] = [];
        const expectedStyle = rules.variable;
        
        // 匹配变量声明（简化版，可以根据语言扩展）
        // Go: var name, name :=
        // Java/JS: let name, const name, var name, int name
        // Python: name =
        const variablePatterns = [
            /\b(?:var|let|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
            /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]\s*[^=]/g,
            /\b(int|string|float|bool|char)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g
        ];
        
        for (const pattern of variablePatterns) {
            const matches = line.matchAll(pattern);
            for (const match of matches) {
                const varName = match[1] || match[2];
                if (varName && !this.isValidNaming(varName, expectedStyle)) {
                    violations.push(`行 ${lineNumber}: 变量 "${varName}" 不符合 ${expectedStyle} 命名规范`);
                }
            }
        }
        
        return violations;
    }

    // 检查函数命名
    private checkFunctionNaming(line: string, rules: any, language: string, lineNumber: number): string[] {
        const violations: string[] = [];
        const expectedStyle = rules.function;
        
        // Go: func name()
        // Java: public void name()
        // JavaScript: function name() 或 const name = () =>
        // Python: def name()
        const functionPatterns: Array<{ pattern: RegExp; nameIndex: number }> = [
            { pattern: /\bfunc\s+(\w+)\s*\(/g, nameIndex: 1 }, // Go
            { pattern: /\bfunction\s+(\w+)\s*\(/g, nameIndex: 1 }, // JavaScript
            { pattern: /\bdef\s+(\w+)\s*\(/g, nameIndex: 1 }, // Python
            { pattern: /\b(?:public|private|protected)?\s*(?:static)?\s*(?:void|int|string|bool)\s+(\w+)\s*\(/g, nameIndex: 1 }, // Java
            { pattern: /const\s+(\w+)\s*=\s*(?:async\s+)?\(/g, nameIndex: 1 } // JavaScript arrow function
        ];
        
        for (const { pattern, nameIndex } of functionPatterns) {
            const matches = line.matchAll(pattern);
            for (const match of matches) {
                const funcName = match[nameIndex];
                if (funcName && !this.isValidNaming(funcName, expectedStyle)) {
                    violations.push(`行 ${lineNumber}: 函数 "${funcName}" 不符合 ${expectedStyle} 命名规范`);
                }
            }
        }
        
        return violations;
    }

    // 检查类/结构体命名
    private checkClassNaming(line: string, rules: any, language: string, lineNumber: number): string[] {
        const violations: string[] = [];
        const expectedStyle = rules.class;
        
        // Go: type Name struct/interface
        // Java: class Name
        // JavaScript: class Name
        // Python: class Name
        const classPatterns: Array<{ pattern: RegExp; nameIndex: number }> = [
            { pattern: /\btype\s+(\w+)\s+(?:struct|interface)/g, nameIndex: 1 }, // Go
            { pattern: /\bclass\s+(\w+)/g, nameIndex: 1 }, // Java/JS/Python
            { pattern: /\binterface\s+(\w+)/g, nameIndex: 1 } // Java interface
        ];
        
        for (const { pattern, nameIndex } of classPatterns) {
            const matches = line.matchAll(pattern);
            for (const match of matches) {
                const className = match[nameIndex];
                if (className && !this.isValidNaming(className, expectedStyle)) {
                    violations.push(`行 ${lineNumber}: 类/结构体 "${className}" 不符合 ${expectedStyle} 命名规范`);
                }
            }
        }
        
        return violations;
    }

    // 验证命名是否符合风格
    private isValidNaming(name: string, style: string): boolean {
        // 排除关键字和常见类型名
        const excluded = ['String', 'Int', 'Bool', 'Error', 'Context', 'Request', 'Response', 
                         'true', 'false', 'nil', 'null', 'undefined', 'this', 'self'];
        if (excluded.includes(name)) {
            return true;
        }
        
        switch (style) {
            case 'camelCase':
                // 首字母小写，后续单词首字母大写
                return /^[a-z][a-zA-Z0-9]*$/.test(name) || /^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(name);
            
            case 'PascalCase':
                // 首字母大写
                return /^[A-Z][a-zA-Z0-9]*$/.test(name);
            
            case 'snake_case':
                // 全小写，用下划线分隔
                return /^[a-z][a-z0-9_]*$/.test(name);
            
            case 'UPPER_SNAKE_CASE':
                // 全大写，用下划线分隔
                return /^[A-Z][A-Z0-9_]*$/.test(name);
            
            default:
                return true; // 未知风格，不检查
        }
    }

    // 计算函数行数
    private countFunctionLines(code: string): number {
        const lines = code.split('\n');
        let functionStart = -1;
        let braceCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/\bfunction\b|\bdef\b|\bfn\b/)) {
                functionStart = i;
                braceCount = 0;
            }
            if (functionStart >= 0) {
                braceCount += (line.match(/{/g) || []).length;
                braceCount -= (line.match(/}/g) || []).length;
                if (braceCount === 0 && functionStart >= 0 && i > functionStart) {
                    return i - functionStart + 1;
                }
            }
        }
        
        return lines.length;
    }

    // 提取关键词
    private extractKeywords(content: string): string[] {
        // 简单提取关键词（可以根据需要改进）
        const keywords: string[] = [];
        const words = content.split(/[，。\s]+/);
        for (const word of words) {
            if (word.length > 2 && !['的', '和', '或', '是', '在', '有'].includes(word)) {
                keywords.push(word);
            }
        }
        return keywords.slice(0, 5); // 只取前5个关键词
    }

    // 检查业务规则违规
    private checkBusinessRuleViolations(code: string, rule: string): string[] {
        const violations: string[] = [];
        const codeLower = code.toLowerCase();
        const ruleLower = rule.toLowerCase();
        
        // 提取规则中的关键词和约束
        const constraints = this.extractBusinessConstraints(rule);
        
        for (const constraint of constraints) {
            // 检查禁止模式
            if (constraint.type === 'forbidden') {
                const patterns = constraint.patterns;
                for (const pattern of patterns) {
                    if (codeLower.includes(pattern.toLowerCase())) {
                        violations.push(`违反了业务规则: 禁止使用 "${pattern}"`);
                    }
                }
            }
            
            // 检查必须模式
            if (constraint.type === 'required') {
                const patterns = constraint.patterns;
                let found = false;
                for (const pattern of patterns) {
                    if (codeLower.includes(pattern.toLowerCase())) {
                        found = true;
                        break;
                    }
                }
                if (!found && patterns.length > 0) {
                    violations.push(`违反了业务规则: 必须包含 "${patterns.join('" 或 "')}"`);
                }
            }
            
            // 检查条件模式（如果包含 A，则必须包含 B）
            if (constraint.type === 'conditional') {
                const { condition, requirement } = constraint;
                if (condition && requirement && requirement.length > 0) {
                    if (codeLower.includes(condition.toLowerCase())) {
                        let found = false;
                        for (const req of requirement) {
                            if (codeLower.includes(req.toLowerCase())) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            violations.push(`违反了业务规则: 当使用 "${condition}" 时，必须包含 "${requirement.join('" 或 "')}"`);
                        }
                    }
                }
            }
        }
        
        return violations;
    }

    // 提取业务约束
    private extractBusinessConstraints(rule: string): Array<{
        type: 'forbidden' | 'required' | 'conditional';
        patterns: string[];
        condition?: string;
        requirement?: string[];
    }> {
        const constraints: Array<{
            type: 'forbidden' | 'required' | 'conditional';
            patterns: string[];
            condition?: string;
            requirement?: string[];
        }> = [];
        
        // 提取禁止模式
        const forbiddenMatches = rule.match(/禁止[：:]\s*([^。，；]+)/g);
        if (forbiddenMatches) {
            for (const match of forbiddenMatches) {
                const content = match.replace(/禁止[：:]\s*/, '').trim();
                const items = content.split(/[，、,]/).map(s => s.trim()).filter(s => s);
                if (items.length > 0) {
                    constraints.push({
                        type: 'forbidden',
                        patterns: items
                    });
                }
            }
        }
        
        // 提取必须模式
        const requiredMatches = rule.match(/必须[：:]\s*([^。，；]+)/g);
        if (requiredMatches) {
            for (const match of requiredMatches) {
                const content = match.replace(/必须[：:]\s*/, '').trim();
                const items = content.split(/[，、,]/).map(s => s.trim()).filter(s => s);
                if (items.length > 0) {
                    constraints.push({
                        type: 'required',
                        patterns: items
                    });
                }
            }
        }
        
        // 提取条件模式（如果...则...）
        const conditionalMatches = rule.match(/如果[^，。]+则[：:]\s*([^。，；]+)/g);
        if (conditionalMatches) {
            for (const match of conditionalMatches) {
                const conditionMatch = match.match(/如果([^则]+)则/);
                const requirementMatch = match.match(/则[：:]\s*(.+)/);
                if (conditionMatch && requirementMatch) {
                    const condition = conditionMatch[1].trim();
                    const requirement = requirementMatch[1].split(/[，、,]/).map(s => s.trim()).filter(s => s);
                    if (condition && requirement.length > 0) {
                        constraints.push({
                            type: 'conditional',
                            patterns: [],
                            condition: condition,
                            requirement: requirement
                        });
                    }
                }
            }
        }
        
        // 提取"当...时，必须..."
        const whenMatches = rule.match(/当[^，。]+时[，,]必须[：:]\s*([^。，；]+)/g);
        if (whenMatches) {
            for (const match of whenMatches) {
                const conditionMatch = match.match(/当([^时]+)时/);
                const requirementMatch = match.match(/必须[：:]\s*(.+)/);
                if (conditionMatch && requirementMatch) {
                    const condition = conditionMatch[1].trim();
                    const requirement = requirementMatch[1].split(/[，、,]/).map(s => s.trim()).filter(s => s);
                    if (condition && requirement.length > 0) {
                        constraints.push({
                            type: 'conditional',
                            patterns: [],
                            condition: condition,
                            requirement: requirement
                        });
                    }
                }
            }
        }
        
        return constraints;
    }

    // 提取禁止的项目
    private extractForbiddenItems(content: string): string[] {
        const items: string[] = [];
        const matches = content.match(/禁止[：:]\s*([^。，]+)/g);
        if (matches) {
            for (const match of matches) {
                const item = match.replace(/禁止[：:]\s*/, '').trim();
                if (item) {
                    items.push(item);
                }
            }
        }
        return items;
    }

    // 提取必须的项目
    private extractRequiredItems(content: string): string[] {
        const items: string[] = [];
        const matches = content.match(/必须[：:]\s*([^。，]+)/g);
        if (matches) {
            for (const match of matches) {
                const item = match.replace(/必须[：:]\s*/, '').trim();
                if (item) {
                    items.push(item);
                }
            }
        }
        return items;
    }
}

