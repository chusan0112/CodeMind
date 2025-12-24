import { MemoryCategory, ImportanceLevel } from './memoryStorage';

// 代码类型
export enum CodeType {
    FUNCTION = 'function',
    STRUCT = 'struct',
    INTERFACE = 'interface',
    CLASS = 'class',
    CONSTANT = 'constant',
    VARIABLE = 'variable',
    COMMENT = 'comment',
    CONFIG = 'config',
    API_ENDPOINT = 'api_endpoint',
    BUSINESS_LOGIC = 'business_logic',
    UNKNOWN = 'unknown'
}

// 代码分析结果
export interface CodeAnalysisResult {
    type: CodeType;
    category: MemoryCategory;
    importance: ImportanceLevel;
    tags: string[];
    extractedInfo: {
        name?: string;
        description?: string;
        language?: string;
    };
}

// 代码分析器类
export class CodeAnalyzer {
    // 分析代码
    static analyzeCode(code: string, filePath: string, language: string): CodeAnalysisResult {
        const trimmedCode = code.trim();
        
        // 检测语言
        const detectedLanguage = this.detectLanguage(filePath, language);
        
        // 根据语言选择分析策略
        switch (detectedLanguage) {
            case 'go':
                return this.analyzeGoCode(trimmedCode, filePath);
            case 'java':
                return this.analyzeJavaCode(trimmedCode, filePath);
            case 'typescript':
            case 'javascript':
                return this.analyzeJavaScriptCode(trimmedCode, filePath);
            case 'python':
                return this.analyzePythonCode(trimmedCode, filePath);
            case 'rust':
                return this.analyzeRustCode(trimmedCode, filePath);
            default:
                return this.analyzeGenericCode(trimmedCode, filePath);
        }
    }

    // 检测语言
    private static detectLanguage(filePath: string, language: string): string {
        if (language) {
            return language.toLowerCase();
        }
        
        const ext = filePath.split('.').pop()?.toLowerCase();
        const langMap: Record<string, string> = {
            'go': 'go',
            'java': 'java',
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'rs': 'rust',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby'
        };
        
        return langMap[ext || ''] || 'unknown';
    }

    // 分析 Go 代码
    private static analyzeGoCode(code: string, filePath: string): CodeAnalysisResult {
        // 检测结构体
        const structMatch = code.match(/type\s+(\w+)\s+struct\s*\{/);
        if (structMatch) {
            const structName = structMatch[1];
            return {
                type: CodeType.STRUCT,
                category: MemoryCategory.ARCHITECTURE,
                importance: ImportanceLevel.HIGH,
                tags: ['go', 'struct', structName.toLowerCase()],
                extractedInfo: {
                    name: structName,
                    description: `Go 结构体: ${structName}`,
                    language: 'go'
                }
            };
        }

        // 检测接口
        const interfaceMatch = code.match(/type\s+(\w+)\s+interface\s*\{/);
        if (interfaceMatch) {
            const interfaceName = interfaceMatch[1];
            return {
                type: CodeType.INTERFACE,
                category: MemoryCategory.ARCHITECTURE,
                importance: ImportanceLevel.HIGH,
                tags: ['go', 'interface', interfaceName.toLowerCase()],
                extractedInfo: {
                    name: interfaceName,
                    description: `Go 接口: ${interfaceName}`,
                    language: 'go'
                }
            };
        }

        // 检测函数
        const funcMatch = code.match(/func\s+(?:\([^)]+\)\s+)?(\w+)\s*\([^)]*\)\s*(?:\([^)]+\))?\s*\{/);
        if (funcMatch) {
            const funcName = funcMatch[1];
            const isExported = funcName[0] === funcName[0].toUpperCase();
            
            // 检测是否是 API 处理函数
            if (funcName.includes('Handler') || funcName.includes('Handle') || 
                funcName.includes('Controller') || filePath.includes('handler') || 
                filePath.includes('controller')) {
                return {
                    type: CodeType.API_ENDPOINT,
                    category: MemoryCategory.API_SPEC,
                    importance: ImportanceLevel.CRITICAL,
                    tags: ['go', 'api', 'handler', funcName.toLowerCase()],
                    extractedInfo: {
                        name: funcName,
                        description: `API 处理函数: ${funcName}`,
                        language: 'go'
                    }
                };
            }

            return {
                type: CodeType.FUNCTION,
                category: MemoryCategory.CODE_STYLE,
                importance: isExported ? ImportanceLevel.HIGH : ImportanceLevel.MEDIUM,
                tags: ['go', 'function', funcName.toLowerCase()],
                extractedInfo: {
                    name: funcName,
                    description: `Go 函数: ${funcName}`,
                    language: 'go'
                }
            };
        }

        // 检测常量
        const constMatch = code.match(/const\s+(?:\([^)]+\)\s*)?(\w+)/);
        if (constMatch) {
            return {
                type: CodeType.CONSTANT,
                category: MemoryCategory.CONFIG,
                importance: ImportanceLevel.MEDIUM,
                tags: ['go', 'constant'],
                extractedInfo: {
                    name: constMatch[1],
                    description: 'Go 常量定义',
                    language: 'go'
                }
            };
        }

        return this.analyzeGenericCode(code, filePath);
    }

    // 分析 Java 代码
    private static analyzeJavaCode(code: string, filePath: string): CodeAnalysisResult {
        // 检测类
        const classMatch = code.match(/(?:public\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)/);
        if (classMatch) {
            const className = classMatch[1];
            const isController = className.includes('Controller') || className.includes('Handler');
            const isService = className.includes('Service');
            const isRepository = className.includes('Repository') || className.includes('Dao');
            
            if (isController) {
                return {
                    type: CodeType.API_ENDPOINT,
                    category: MemoryCategory.API_SPEC,
                    importance: ImportanceLevel.CRITICAL,
                    tags: ['java', 'controller', className.toLowerCase()],
                    extractedInfo: {
                        name: className,
                        description: `Java Controller: ${className}`,
                        language: 'java'
                    }
                };
            } else if (isService || isRepository) {
                return {
                    type: CodeType.BUSINESS_LOGIC,
                    category: MemoryCategory.BUSINESS_RULE,
                    importance: ImportanceLevel.HIGH,
                    tags: ['java', isService ? 'service' : 'repository', className.toLowerCase()],
                    extractedInfo: {
                        name: className,
                        description: `Java ${isService ? 'Service' : 'Repository'}: ${className}`,
                        language: 'java'
                    }
                };
            }
            
            return {
                type: CodeType.CLASS,
                category: MemoryCategory.ARCHITECTURE,
                importance: ImportanceLevel.HIGH,
                tags: ['java', 'class', className.toLowerCase()],
                extractedInfo: {
                    name: className,
                    description: `Java 类: ${className}`,
                    language: 'java'
                }
            };
        }

        // 检测接口
        const interfaceMatch = code.match(/(?:public\s+)?interface\s+(\w+)/);
        if (interfaceMatch) {
            return {
                type: CodeType.INTERFACE,
                category: MemoryCategory.ARCHITECTURE,
                importance: ImportanceLevel.HIGH,
                tags: ['java', 'interface', interfaceMatch[1].toLowerCase()],
                extractedInfo: {
                    name: interfaceMatch[1],
                    description: `Java 接口: ${interfaceMatch[1]}`,
                    language: 'java'
                }
            };
        }

        return this.analyzeGenericCode(code, filePath);
    }

    // 分析 JavaScript/TypeScript 代码
    private static analyzeJavaScriptCode(code: string, filePath: string): CodeAnalysisResult {
        // 检测 API 路由/端点
        const apiMatch = code.match(/(?:router\.|app\.)(?:get|post|put|delete|patch)\s*\(['"`]([^'"`]+)['"`]/);
        if (apiMatch) {
            return {
                type: CodeType.API_ENDPOINT,
                category: MemoryCategory.API_SPEC,
                importance: ImportanceLevel.CRITICAL,
                tags: ['api', 'endpoint', apiMatch[1]],
                extractedInfo: {
                    name: apiMatch[1],
                    description: `API 端点: ${apiMatch[1]}`,
                    language: 'javascript'
                }
            };
        }

        // 检测函数
        const funcMatch = code.match(/(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(|(\w+)\s*:\s*(?:async\s+)?\()/);
        if (funcMatch) {
            const funcName = funcMatch[1] || funcMatch[2] || funcMatch[3];
            return {
                type: CodeType.FUNCTION,
                category: MemoryCategory.CODE_STYLE,
                importance: ImportanceLevel.MEDIUM,
                tags: ['javascript', 'function', funcName.toLowerCase()],
                extractedInfo: {
                    name: funcName,
                    description: `JavaScript 函数: ${funcName}`,
                    language: 'javascript'
                }
            };
        }

        // 检测类
        const classMatch = code.match(/(?:export\s+)?class\s+(\w+)/);
        if (classMatch) {
            return {
                type: CodeType.CLASS,
                category: MemoryCategory.ARCHITECTURE,
                importance: ImportanceLevel.HIGH,
                tags: ['javascript', 'class', classMatch[1].toLowerCase()],
                extractedInfo: {
                    name: classMatch[1],
                    description: `JavaScript 类: ${classMatch[1]}`,
                    language: 'javascript'
                }
            };
        }

        return this.analyzeGenericCode(code, filePath);
    }

    // 分析 Python 代码
    private static analyzePythonCode(code: string, filePath: string): CodeAnalysisResult {
        // 检测类
        const classMatch = code.match(/class\s+(\w+)/);
        if (classMatch) {
            const className = classMatch[1];
            return {
                type: CodeType.CLASS,
                category: MemoryCategory.ARCHITECTURE,
                importance: ImportanceLevel.HIGH,
                tags: ['python', 'class', className.toLowerCase()],
                extractedInfo: {
                    name: className,
                    description: `Python 类: ${className}`,
                    language: 'python'
                }
            };
        }

        // 检测函数
        const funcMatch = code.match(/def\s+(\w+)\s*\(/);
        if (funcMatch) {
            const funcName = funcMatch[1];
            // 检测是否是 API 路由函数
            if (filePath.includes('route') || filePath.includes('api') || funcName.includes('route')) {
                return {
                    type: CodeType.API_ENDPOINT,
                    category: MemoryCategory.API_SPEC,
                    importance: ImportanceLevel.CRITICAL,
                    tags: ['python', 'api', funcName.toLowerCase()],
                    extractedInfo: {
                        name: funcName,
                        description: `Python API 函数: ${funcName}`,
                        language: 'python'
                    }
                };
            }
            
            return {
                type: CodeType.FUNCTION,
                category: MemoryCategory.CODE_STYLE,
                importance: ImportanceLevel.MEDIUM,
                tags: ['python', 'function', funcName.toLowerCase()],
                extractedInfo: {
                    name: funcName,
                    description: `Python 函数: ${funcName}`,
                    language: 'python'
                }
            };
        }

        return this.analyzeGenericCode(code, filePath);
    }

    // 分析 Rust 代码
    private static analyzeRustCode(code: string, filePath: string): CodeAnalysisResult {
        const result: CodeAnalysisResult = {
            type: CodeType.UNKNOWN,
            category: MemoryCategory.OTHER,
            importance: ImportanceLevel.MEDIUM,
            tags: ['rust'],
            extractedInfo: { language: 'rust' }
        };

        // 检测函数
        const functionMatch = code.match(/^(?:pub\s+)?fn\s+(\w+)\s*\(/m);
        if (functionMatch) {
            result.type = CodeType.FUNCTION;
            result.category = MemoryCategory.CODE_STYLE;
            result.extractedInfo.name = functionMatch[1];
            result.tags.push('function', functionMatch[1]);
            
            // 检测 Tauri 命令
            if (code.includes('#[tauri::command]')) {
                result.type = CodeType.API_ENDPOINT;
                result.category = MemoryCategory.API_SPEC;
                result.importance = ImportanceLevel.HIGH;
                result.tags.push('tauri', 'command');
            }
            return result;
        }

        // 检测结构体
        const structMatch = code.match(/^(?:pub\s+)?struct\s+(\w+)/m);
        if (structMatch) {
            result.type = CodeType.STRUCT;
            result.category = MemoryCategory.ARCHITECTURE;
            result.extractedInfo.name = structMatch[1];
            result.tags.push('struct', structMatch[1]);
            return result;
        }

        // 检测 trait（接口）
        const traitMatch = code.match(/^(?:pub\s+)?trait\s+(\w+)/m);
        if (traitMatch) {
            result.type = CodeType.INTERFACE;
            result.category = MemoryCategory.ARCHITECTURE;
            result.extractedInfo.name = traitMatch[1];
            result.tags.push('trait', traitMatch[1]);
            return result;
        }

        // 检测常量
        const constMatch = code.match(/^(?:pub\s+)?const\s+(\w+)/m);
        if (constMatch) {
            result.type = CodeType.CONSTANT;
            result.category = MemoryCategory.CONFIG;
            result.extractedInfo.name = constMatch[1];
            result.tags.push('const', constMatch[1]);
            return result;
        }

        return result;
    }

    // 通用代码分析
    private static analyzeGenericCode(code: string, filePath: string): CodeAnalysisResult {
        // 检测注释
        if (code.startsWith('//') || code.startsWith('/*') || code.startsWith('#') || code.startsWith('*')) {
            return {
                type: CodeType.COMMENT,
                category: MemoryCategory.DOCUMENTATION,
                importance: ImportanceLevel.LOW,
                tags: ['comment', 'documentation'],
                extractedInfo: {
                    description: '代码注释或文档',
                    language: 'unknown'
                }
            };
        }

        // 检测配置文件
        if (filePath.includes('config') || filePath.includes('setting') || 
            code.includes('=') && code.split('\n').length < 10) {
            return {
                type: CodeType.CONFIG,
                category: MemoryCategory.CONFIG,
                importance: ImportanceLevel.MEDIUM,
                tags: ['config'],
                extractedInfo: {
                    description: '配置信息',
                    language: 'unknown'
                }
            };
        }

        // 默认：代码风格
        return {
            type: CodeType.UNKNOWN,
            category: MemoryCategory.CODE_STYLE,
            importance: ImportanceLevel.MEDIUM,
            tags: ['code'],
            extractedInfo: {
                description: '代码片段',
                language: 'unknown'
            }
        };
    }
}




