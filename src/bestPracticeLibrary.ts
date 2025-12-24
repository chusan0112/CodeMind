import * as vscode from 'vscode';
import { MemoryStorage, Memory, MemoryCategory, ImportanceLevel } from './memoryStorage';
import { ProjectLanguage } from './projectScanner';

// 最佳实践接口
export interface BestPractice {
    id: string;
    language: string;
    category: MemoryCategory;
    title: string;
    description: string;
    content: string;
    importance: ImportanceLevel;
    tags: string[];
    examples?: string[];
    references?: string[];
}

// 最佳实践库类
export class BestPracticeLibrary {
    private storage: MemoryStorage;
    private context: vscode.ExtensionContext;
    private practices: Map<string, BestPractice[]> = new Map();

    constructor(storage: MemoryStorage, context: vscode.ExtensionContext) {
        this.storage = storage;
        this.context = context;
        this.loadBuiltInPractices();
    }

    // 加载内置最佳实践
    private loadBuiltInPractices(): void {
        // Go 语言最佳实践
        this.addGoPractices();
        
        // JavaScript/TypeScript 最佳实践
        this.addJavaScriptPractices();
        
        // Python 最佳实践
        this.addPythonPractices();
        
        // Java 最佳实践
        this.addJavaPractices();
        
        // Rust 最佳实践
        this.addRustPractices();
    }

    // Go 语言最佳实践
    private addGoPractices(): void {
        const practices: BestPractice[] = [
            {
                id: 'go-error-handling',
                language: 'go',
                category: MemoryCategory.CODE_STYLE,
                title: '错误处理规范',
                description: 'Go 语言错误处理最佳实践',
                content: '使用 Go 标准 error 接口处理错误，不要忽略错误。错误应该作为返回值返回，而不是抛出异常。使用 errors.New() 或 fmt.Errorf() 创建错误。',
                importance: ImportanceLevel.HIGH,
                tags: ['go', 'error-handling', 'best-practice'],
                examples: [
                    'if err != nil { return err }',
                    'return fmt.Errorf("failed to open file: %w", err)'
                ]
            },
            {
                id: 'go-naming',
                language: 'go',
                category: MemoryCategory.CODE_STYLE,
                title: '命名规范',
                description: 'Go 语言命名约定',
                content: '公开的函数、类型、变量使用 PascalCase（首字母大写），私有使用 camelCase（首字母小写）。包名使用小写字母，简短且有意义。',
                importance: ImportanceLevel.HIGH,
                tags: ['go', 'naming', 'convention', 'best-practice'],
                examples: [
                    'func PublicFunction() {}',
                    'func privateFunction() {}',
                    'type PublicStruct struct {}'
                ]
            },
            {
                id: 'go-concurrency',
                language: 'go',
                category: MemoryCategory.ARCHITECTURE,
                title: '并发编程规范',
                description: 'Go 语言并发编程最佳实践',
                content: '使用 goroutine 和 channel 进行并发编程。避免共享内存，使用通信来共享数据。使用 context.Context 管理 goroutine 生命周期。',
                importance: ImportanceLevel.HIGH,
                tags: ['go', 'concurrency', 'goroutine', 'channel', 'best-practice'],
                examples: [
                    'go func() { ... }()',
                    'ch := make(chan int)',
                    'ctx, cancel := context.WithCancel(context.Background())'
                ]
            },
            {
                id: 'go-testing',
                language: 'go',
                category: MemoryCategory.CODE_STYLE,
                title: '测试规范',
                description: 'Go 语言测试最佳实践',
                content: '测试文件以 _test.go 结尾。测试函数以 Test 开头。使用表驱动测试（table-driven tests）。使用 t.Helper() 标记辅助函数。',
                importance: ImportanceLevel.MEDIUM,
                tags: ['go', 'testing', 'best-practice'],
                examples: [
                    'func TestFunction(t *testing.T) {}',
                    'func BenchmarkFunction(b *testing.B) {}'
                ]
            }
        ];
        
        this.practices.set('go', practices);
    }

    // JavaScript/TypeScript 最佳实践
    private addJavaScriptPractices(): void {
        const practices: BestPractice[] = [
            {
                id: 'js-async',
                language: 'javascript',
                category: MemoryCategory.CODE_STYLE,
                title: '异步编程规范',
                description: 'JavaScript/TypeScript 异步编程最佳实践',
                content: '优先使用 async/await 而不是 Promise.then()。使用 try/catch 处理异步错误。避免回调地狱（callback hell）。',
                importance: ImportanceLevel.HIGH,
                tags: ['javascript', 'typescript', 'async', 'await', 'best-practice'],
                examples: [
                    'async function fetchData() { const data = await fetch(url); }',
                    'try { await asyncOperation(); } catch (error) { ... }'
                ]
            },
            {
                id: 'js-types',
                language: 'typescript',
                category: MemoryCategory.CODE_STYLE,
                title: '类型定义规范',
                description: 'TypeScript 类型定义最佳实践',
                content: '使用 TypeScript 类型系统，避免使用 any。定义接口和类型别名。使用泛型提高代码复用性。',
                importance: ImportanceLevel.HIGH,
                tags: ['typescript', 'types', 'interface', 'best-practice'],
                examples: [
                    'interface User { id: number; name: string; }',
                    'type Callback<T> = (data: T) => void;'
                ]
            },
            {
                id: 'js-modules',
                language: 'javascript',
                category: MemoryCategory.ARCHITECTURE,
                title: '模块化规范',
                description: 'JavaScript/TypeScript 模块化最佳实践',
                content: '使用 ES6 模块（import/export）。避免全局变量。每个模块应该有单一职责。',
                importance: ImportanceLevel.HIGH,
                tags: ['javascript', 'typescript', 'modules', 'es6', 'best-practice'],
                examples: [
                    'export function myFunction() {}',
                    'import { myFunction } from "./module";'
                ]
            },
            {
                id: 'js-error-handling',
                language: 'javascript',
                category: MemoryCategory.CODE_STYLE,
                title: '错误处理规范',
                description: 'JavaScript/TypeScript 错误处理最佳实践',
                content: '使用 try/catch 处理同步错误。使用 Promise.catch() 或 try/catch 处理异步错误。创建自定义错误类。',
                importance: ImportanceLevel.HIGH,
                tags: ['javascript', 'typescript', 'error-handling', 'best-practice'],
                examples: [
                    'class CustomError extends Error {}',
                    'throw new CustomError("error message");'
                ]
            }
        ];
        
        this.practices.set('javascript', practices);
        this.practices.set('typescript', practices);
    }

    // Python 最佳实践
    private addPythonPractices(): void {
        const practices: BestPractice[] = [
            {
                id: 'python-pep8',
                language: 'python',
                category: MemoryCategory.CODE_STYLE,
                title: 'PEP 8 代码风格',
                description: 'Python PEP 8 代码风格规范',
                content: '遵循 PEP 8 代码风格指南。使用 4 个空格缩进。行长度不超过 79 字符。使用有意义的变量名。',
                importance: ImportanceLevel.HIGH,
                tags: ['python', 'pep8', 'style', 'best-practice'],
                examples: [
                    'def function_name(param1, param2):',
                    'class ClassName:'
                ]
            },
            {
                id: 'python-type-hints',
                language: 'python',
                category: MemoryCategory.CODE_STYLE,
                title: '类型提示',
                description: 'Python 类型提示最佳实践',
                content: '使用类型提示（Type Hints）提高代码可读性。使用 typing 模块定义复杂类型。',
                importance: ImportanceLevel.MEDIUM,
                tags: ['python', 'type-hints', 'typing', 'best-practice'],
                examples: [
                    'def function(param: str) -> int:',
                    'from typing import List, Dict, Optional'
                ]
            },
            {
                id: 'python-exceptions',
                language: 'python',
                category: MemoryCategory.CODE_STYLE,
                title: '异常处理规范',
                description: 'Python 异常处理最佳实践',
                content: '使用具体的异常类型，不要使用裸露的 except。使用 try/except/finally 处理异常。创建自定义异常类。',
                importance: ImportanceLevel.HIGH,
                tags: ['python', 'exceptions', 'error-handling', 'best-practice'],
                examples: [
                    'try: ... except ValueError as e: ...',
                    'class CustomException(Exception): pass'
                ]
            },
            {
                id: 'python-context-managers',
                language: 'python',
                category: MemoryCategory.CODE_STYLE,
                title: '上下文管理器',
                description: 'Python 上下文管理器最佳实践',
                content: '使用 with 语句管理资源。实现 __enter__ 和 __exit__ 方法创建自定义上下文管理器。',
                importance: ImportanceLevel.MEDIUM,
                tags: ['python', 'context-manager', 'with', 'best-practice'],
                examples: [
                    'with open("file.txt") as f: ...',
                    'class MyContextManager: ...'
                ]
            }
        ];
        
        this.practices.set('python', practices);
    }

    // Java 最佳实践
    private addJavaPractices(): void {
        const practices: BestPractice[] = [
            {
                id: 'java-naming',
                language: 'java',
                category: MemoryCategory.CODE_STYLE,
                title: '命名规范',
                description: 'Java 命名约定',
                content: '类名使用 PascalCase，方法和变量使用 camelCase，常量使用 UPPER_SNAKE_CASE。包名使用小写字母。',
                importance: ImportanceLevel.HIGH,
                tags: ['java', 'naming', 'convention', 'best-practice'],
                examples: [
                    'public class MyClass {}',
                    'private String myVariable;',
                    'public static final int MAX_SIZE = 100;'
                ]
            },
            {
                id: 'java-exceptions',
                language: 'java',
                category: MemoryCategory.CODE_STYLE,
                title: '异常处理规范',
                description: 'Java 异常处理最佳实践',
                content: '使用具体的异常类型。不要捕获 Exception 基类。使用 try-with-resources 管理资源。',
                importance: ImportanceLevel.HIGH,
                tags: ['java', 'exceptions', 'error-handling', 'best-practice'],
                examples: [
                    'try (FileReader fr = new FileReader(file)) { ... }',
                    'catch (IOException e) { ... }'
                ]
            },
            {
                id: 'java-immutability',
                language: 'java',
                category: MemoryCategory.ARCHITECTURE,
                title: '不可变性',
                description: 'Java 不可变对象最佳实践',
                content: '优先使用不可变对象。使用 final 关键字。使用不可变集合。',
                importance: ImportanceLevel.MEDIUM,
                tags: ['java', 'immutability', 'final', 'best-practice'],
                examples: [
                    'public final class ImmutableClass {}',
                    'private final String name;'
                ]
            }
        ];
        
        this.practices.set('java', practices);
    }

    // Rust 最佳实践
    private addRustPractices(): void {
        const practices: BestPractice[] = [
            {
                id: 'rust-error-handling',
                language: 'rust',
                category: MemoryCategory.CODE_STYLE,
                title: '错误处理规范',
                description: 'Rust 错误处理最佳实践',
                content: '使用 Result<T, E> 类型处理错误，不要使用 panic!。使用 ? 操作符传播错误。使用 match 或 if let 处理 Option 和 Result。',
                importance: ImportanceLevel.HIGH,
                tags: ['rust', 'error-handling', 'result', 'best-practice'],
                examples: [
                    'fn function() -> Result<String, Error> { ... }',
                    'let value = result?;',
                    'match option { Some(v) => v, None => return Err(...) }'
                ]
            },
            {
                id: 'rust-ownership',
                language: 'rust',
                category: MemoryCategory.ARCHITECTURE,
                title: '所有权和借用',
                description: 'Rust 所有权系统最佳实践',
                content: '理解所有权、借用和生命周期。使用引用避免不必要的所有权转移。使用 &str 而不是 String 作为函数参数（如果不需要拥有所有权）。',
                importance: ImportanceLevel.CRITICAL,
                tags: ['rust', 'ownership', 'borrowing', 'lifetimes', 'best-practice'],
                examples: [
                    'fn process(s: &str) -> String { ... }',
                    'let s = String::from("hello"); process(&s);'
                ]
            },
            {
                id: 'rust-naming',
                language: 'rust',
                category: MemoryCategory.CODE_STYLE,
                title: '命名规范',
                description: 'Rust 命名约定',
                content: '类型和模块使用 PascalCase，函数和变量使用 snake_case，常量使用 UPPER_SNAKE_CASE。',
                importance: ImportanceLevel.HIGH,
                tags: ['rust', 'naming', 'convention', 'best-practice'],
                examples: [
                    'struct MyStruct {}',
                    'fn my_function() {}',
                    'const MAX_SIZE: usize = 100;'
                ]
            },
            {
                id: 'rust-testing',
                language: 'rust',
                category: MemoryCategory.CODE_STYLE,
                title: '测试规范',
                description: 'Rust 测试最佳实践',
                content: '测试函数使用 #[test] 属性。使用 #[cfg(test)] 标记测试模块。使用 assert!、assert_eq! 等宏进行断言。',
                importance: ImportanceLevel.MEDIUM,
                tags: ['rust', 'testing', 'best-practice'],
                examples: [
                    '#[test] fn test_function() { assert_eq!(2 + 2, 4); }',
                    '#[cfg(test)] mod tests { ... }'
                ]
            }
        ];
        
        this.practices.set('rust', practices);
    }

    // 根据语言获取最佳实践
    getPracticesByLanguage(language: string): BestPractice[] {
        const lang = language.toLowerCase();
        return this.practices.get(lang) || [];
    }

    // 根据分类获取最佳实践
    getPracticesByCategory(category: MemoryCategory): BestPractice[] {
        const allPractices: BestPractice[] = [];
        this.practices.forEach(practices => {
            allPractices.push(...practices.filter(p => p.category === category));
        });
        return allPractices;
    }

    // 应用最佳实践到项目
    async applyPracticesToProject(language: ProjectLanguage): Promise<{
        success: boolean;
        practicesApplied: number;
        error?: string;
    }> {
        try {
            const lang = this.mapProjectLanguageToBestPracticeLanguage(language);
            const practices = this.getPracticesByLanguage(lang);
            
            if (practices.length === 0) {
                return {
                    success: false,
                    practicesApplied: 0,
                    error: `没有找到 ${lang} 语言的最佳实践`
                };
            }

            // 转换为记忆并保存
            const existingMemories = await this.storage.loadMemories();
            const practiceMemories: Memory[] = practices.map(practice => ({
                id: this.generateId(),
                content: `${practice.title}: ${practice.content}`,
                category: practice.category,
                timestamp: Date.now(),
                tags: [...practice.tags, 'best-practice', 'auto-applied'],
                importance: practice.importance,
                confidence: 0.95
            }));

            // 合并记忆（避免重复）
            const allMemories = [...existingMemories];
            for (const memory of practiceMemories) {
                const exists = allMemories.find(m => 
                    m.content === memory.content && m.category === memory.category
                );
                if (!exists) {
                    allMemories.push(memory);
                }
            }

            await this.storage.saveMemories(allMemories);

            return {
                success: true,
                practicesApplied: practiceMemories.length
            };
        } catch (error) {
            return {
                success: false,
                practicesApplied: 0,
                error: (error as Error).message
            };
        }
    }

    // 映射项目语言到最佳实践语言
    private mapProjectLanguageToBestPracticeLanguage(language: ProjectLanguage): string {
        const langMap: Record<ProjectLanguage, string> = {
            [ProjectLanguage.GO]: 'go',
            [ProjectLanguage.JAVA]: 'java',
            [ProjectLanguage.JAVASCRIPT]: 'javascript',
            [ProjectLanguage.TYPESCRIPT]: 'typescript',
            [ProjectLanguage.PYTHON]: 'python',
            [ProjectLanguage.RUST]: 'rust',
            [ProjectLanguage.CPP]: 'cpp',
            [ProjectLanguage.C]: 'c',
            [ProjectLanguage.CSHARP]: 'csharp',
            [ProjectLanguage.PHP]: 'php',
            [ProjectLanguage.RUBY]: 'ruby',
            [ProjectLanguage.KOTLIN]: 'kotlin',
            [ProjectLanguage.SWIFT]: 'swift',
            [ProjectLanguage.DART]: 'dart',
            [ProjectLanguage.UNKNOWN]: 'unknown'
        };
        return langMap[language] || 'unknown';
    }

    // 获取所有最佳实践
    getAllPractices(): BestPractice[] {
        const allPractices: BestPractice[] = [];
        this.practices.forEach(practices => {
            allPractices.push(...practices);
        });
        return allPractices;
    }

    // 生成 ID
    private generateId(): string {
        return 'practice_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }
}

