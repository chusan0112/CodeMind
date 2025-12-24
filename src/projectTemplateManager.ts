import * as vscode from 'vscode';
import { MemoryStorage, Memory, MemoryCategory, ImportanceLevel } from './memoryStorage';
import * as path from 'path';
import * as fs from 'fs';

// 项目模板接口
export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    category: 'web' | 'api' | 'cli' | 'library' | 'mobile' | 'desktop' | 'other';
    language: string[];
    memories: Memory[];
    files?: TemplateFile[];
    config?: Record<string, any>;
}

// 模板文件接口
interface TemplateFile {
    path: string;
    content: string;
    description?: string;
}

// 项目模板管理器类
export class ProjectTemplateManager {
    private storage: MemoryStorage;
    private context: vscode.ExtensionContext;
    private templates: ProjectTemplate[] = [];

    constructor(storage: MemoryStorage, context: vscode.ExtensionContext) {
        this.storage = storage;
        this.context = context;
        this.loadBuiltInTemplates();
    }

    // 加载内置模板
    private loadBuiltInTemplates(): void {
        // Go Web API 模板
        this.templates.push({
            id: 'go-web-api',
            name: 'Go Web API',
            description: 'Go 语言 Web API 项目模板，包含 RESTful API 最佳实践',
            category: 'api',
            language: ['go'],
            memories: [
                {
                    id: 'template-go-api-1',
                    content: '项目使用 Go 标准库 net/http 或 Gin 框架构建 RESTful API',
                    category: MemoryCategory.ARCHITECTURE,
                    timestamp: Date.now(),
                    tags: ['go', 'api', 'restful', 'template'],
                    importance: ImportanceLevel.HIGH
                },
                {
                    id: 'template-go-api-2',
                    content: 'API 路由遵循 RESTful 规范：GET /api/resource, POST /api/resource, PUT /api/resource/:id, DELETE /api/resource/:id',
                    category: MemoryCategory.API_SPEC,
                    timestamp: Date.now(),
                    tags: ['go', 'api', 'restful', 'routing', 'template'],
                    importance: ImportanceLevel.CRITICAL
                },
                {
                    id: 'template-go-api-3',
                    content: '使用结构体定义请求和响应模型，遵循 Go 命名规范（PascalCase）',
                    category: MemoryCategory.CODE_STYLE,
                    timestamp: Date.now(),
                    tags: ['go', 'naming', 'struct', 'template'],
                    importance: ImportanceLevel.HIGH
                },
                {
                    id: 'template-go-api-4',
                    content: '错误处理使用 Go 标准 error 接口，统一错误响应格式',
                    category: MemoryCategory.CODE_STYLE,
                    timestamp: Date.now(),
                    tags: ['go', 'error-handling', 'template'],
                    importance: ImportanceLevel.HIGH
                }
            ]
        });

        // Go CLI 工具模板
        this.templates.push({
            id: 'go-cli',
            name: 'Go CLI Tool',
            description: 'Go 语言命令行工具模板，包含 CLI 最佳实践',
            category: 'cli',
            language: ['go'],
            memories: [
                {
                    id: 'template-go-cli-1',
                    content: '使用 cobra 或 flag 包构建命令行工具',
                    category: MemoryCategory.ARCHITECTURE,
                    timestamp: Date.now(),
                    tags: ['go', 'cli', 'template'],
                    importance: ImportanceLevel.HIGH
                },
                {
                    id: 'template-go-cli-2',
                    content: '命令行参数使用 flag 包或 cobra，遵循 POSIX 规范',
                    category: MemoryCategory.CODE_STYLE,
                    timestamp: Date.now(),
                    tags: ['go', 'cli', 'flag', 'template'],
                    importance: ImportanceLevel.HIGH
                }
            ]
        });

        // JavaScript/TypeScript Web 应用模板
        this.templates.push({
            id: 'js-web-app',
            name: 'JavaScript/TypeScript Web App',
            description: 'JavaScript/TypeScript Web 应用模板，包含前端最佳实践',
            category: 'web',
            language: ['javascript', 'typescript'],
            memories: [
                {
                    id: 'template-js-web-1',
                    content: '使用 React/Vue/Angular 等现代前端框架',
                    category: MemoryCategory.ARCHITECTURE,
                    timestamp: Date.now(),
                    tags: ['javascript', 'typescript', 'web', 'frontend', 'template'],
                    importance: ImportanceLevel.HIGH
                },
                {
                    id: 'template-js-web-2',
                    content: 'API 调用使用 fetch 或 axios，统一错误处理',
                    category: MemoryCategory.CODE_STYLE,
                    timestamp: Date.now(),
                    tags: ['javascript', 'typescript', 'api', 'template'],
                    importance: ImportanceLevel.HIGH
                }
            ]
        });

        // Node.js API 模板
        this.templates.push({
            id: 'node-api',
            name: 'Node.js API',
            description: 'Node.js API 项目模板，包含 Express/Koa 最佳实践',
            category: 'api',
            language: ['javascript', 'typescript'],
            memories: [
                {
                    id: 'template-node-api-1',
                    content: '使用 Express 或 Koa 框架构建 RESTful API',
                    category: MemoryCategory.ARCHITECTURE,
                    timestamp: Date.now(),
                    tags: ['nodejs', 'express', 'koa', 'api', 'template'],
                    importance: ImportanceLevel.HIGH
                },
                {
                    id: 'template-node-api-2',
                    content: 'API 路由遵循 RESTful 规范，使用中间件处理认证和错误',
                    category: MemoryCategory.API_SPEC,
                    timestamp: Date.now(),
                    tags: ['nodejs', 'api', 'restful', 'middleware', 'template'],
                    importance: ImportanceLevel.CRITICAL
                },
                {
                    id: 'template-node-api-3',
                    content: '使用 async/await 处理异步操作，避免回调地狱',
                    category: MemoryCategory.CODE_STYLE,
                    timestamp: Date.now(),
                    tags: ['nodejs', 'async', 'await', 'template'],
                    importance: ImportanceLevel.HIGH
                }
            ]
        });

        // Python Web API 模板
        this.templates.push({
            id: 'python-api',
            name: 'Python Web API',
            description: 'Python Web API 项目模板，包含 Flask/FastAPI 最佳实践',
            category: 'api',
            language: ['python'],
            memories: [
                {
                    id: 'template-python-api-1',
                    content: '使用 Flask 或 FastAPI 框架构建 RESTful API',
                    category: MemoryCategory.ARCHITECTURE,
                    timestamp: Date.now(),
                    tags: ['python', 'flask', 'fastapi', 'api', 'template'],
                    importance: ImportanceLevel.HIGH
                },
                {
                    id: 'template-python-api-2',
                    content: 'API 路由使用装饰器定义，遵循 RESTful 规范',
                    category: MemoryCategory.API_SPEC,
                    timestamp: Date.now(),
                    tags: ['python', 'api', 'restful', 'decorator', 'template'],
                    importance: ImportanceLevel.CRITICAL
                },
                {
                    id: 'template-python-api-3',
                    content: '使用类型提示（Type Hints）提高代码可读性',
                    category: MemoryCategory.CODE_STYLE,
                    timestamp: Date.now(),
                    tags: ['python', 'type-hints', 'template'],
                    importance: ImportanceLevel.HIGH
                }
            ]
        });

        // Tauri 桌面应用模板
        this.templates.push({
            id: 'tauri-desktop',
            name: 'Tauri Desktop App',
            description: 'Tauri 桌面应用模板，包含 Rust + 前端框架最佳实践',
            category: 'desktop',
            language: ['rust', 'javascript', 'typescript'],
            memories: [
                {
                    id: 'template-tauri-1',
                    content: '项目使用 Tauri 框架构建桌面应用，前端使用 Web 技术，后端使用 Rust',
                    category: MemoryCategory.ARCHITECTURE,
                    timestamp: Date.now(),
                    tags: ['tauri', 'rust', 'desktop', 'template'],
                    importance: ImportanceLevel.CRITICAL
                },
                {
                    id: 'template-tauri-2',
                    content: '前端代码在 src 目录，Rust 后端代码在 src-tauri 目录',
                    category: MemoryCategory.ARCHITECTURE,
                    timestamp: Date.now(),
                    tags: ['tauri', 'structure', 'template'],
                    importance: ImportanceLevel.HIGH
                },
                {
                    id: 'template-tauri-3',
                    content: '使用 Tauri API (@tauri-apps/api) 进行前后端通信，使用 invoke 调用 Rust 命令',
                    category: MemoryCategory.API_SPEC,
                    timestamp: Date.now(),
                    tags: ['tauri', 'api', 'invoke', 'template'],
                    importance: ImportanceLevel.CRITICAL
                },
                {
                    id: 'template-tauri-4',
                    content: 'Rust 命令使用 #[tauri::command] 宏定义，前端通过 invoke 调用',
                    category: MemoryCategory.CODE_STYLE,
                    timestamp: Date.now(),
                    tags: ['tauri', 'rust', 'command', 'macro', 'template'],
                    importance: ImportanceLevel.HIGH
                }
            ]
        });

        // Electron 桌面应用模板
        this.templates.push({
            id: 'electron-desktop',
            name: 'Electron Desktop App',
            description: 'Electron 桌面应用模板，包含 Node.js + Web 技术最佳实践',
            category: 'desktop',
            language: ['javascript', 'typescript'],
            memories: [
                {
                    id: 'template-electron-1',
                    content: '项目使用 Electron 框架构建桌面应用，使用 Node.js 和 Web 技术',
                    category: MemoryCategory.ARCHITECTURE,
                    timestamp: Date.now(),
                    tags: ['electron', 'nodejs', 'desktop', 'template'],
                    importance: ImportanceLevel.CRITICAL
                },
                {
                    id: 'template-electron-2',
                    content: '主进程代码在 main.js/main.ts，渲染进程代码在 renderer 目录',
                    category: MemoryCategory.ARCHITECTURE,
                    timestamp: Date.now(),
                    tags: ['electron', 'main-process', 'renderer-process', 'template'],
                    importance: ImportanceLevel.HIGH
                },
                {
                    id: 'template-electron-3',
                    content: '使用 IPC (Inter-Process Communication) 进行主进程和渲染进程通信',
                    category: MemoryCategory.API_SPEC,
                    timestamp: Date.now(),
                    tags: ['electron', 'ipc', 'communication', 'template'],
                    importance: ImportanceLevel.CRITICAL
                },
                {
                    id: 'template-electron-4',
                    content: '使用 contextIsolation 和 preload 脚本确保安全性',
                    category: MemoryCategory.CONSTRAINT,
                    timestamp: Date.now(),
                    tags: ['electron', 'security', 'context-isolation', 'template'],
                    importance: ImportanceLevel.CRITICAL
                }
            ]
        });
    }

    // 获取所有模板
    getTemplates(): ProjectTemplate[] {
        return this.templates;
    }

    // 根据语言获取模板
    getTemplatesByLanguage(language: string): ProjectTemplate[] {
        return this.templates.filter(t => 
            t.language.includes(language.toLowerCase())
        );
    }

    // 根据分类获取模板
    getTemplatesByCategory(category: ProjectTemplate['category']): ProjectTemplate[] {
        return this.templates.filter(t => t.category === category);
    }

    // 应用模板到项目
    async applyTemplate(templateId: string, targetPath: string): Promise<{
        success: boolean;
        memoriesCreated: number;
        error?: string;
    }> {
        try {
            const template = this.templates.find(t => t.id === templateId);
            if (!template) {
                return {
                    success: false,
                    memoriesCreated: 0,
                    error: `模板 ${templateId} 不存在`
                };
            }

            // 保存模板记忆到项目
            const existingMemories = await this.storage.loadMemories();
            const templateMemories = template.memories.map(m => ({
                ...m,
                id: this.generateId(), // 生成新 ID，避免冲突
                timestamp: Date.now()
            }));

            // 合并记忆（避免重复）
            const allMemories = [...existingMemories];
            for (const memory of templateMemories) {
                const exists = allMemories.find(m => 
                    m.content === memory.content && m.category === memory.category
                );
                if (!exists) {
                    allMemories.push(memory);
                }
            }

            await this.storage.saveMemories(allMemories);

            // 创建模板文件（如果有）
            if (template.files && template.files.length > 0) {
                for (const file of template.files) {
                    const filePath = path.join(targetPath, file.path);
                    const fileDir = path.dirname(filePath);
                    
                    // 确保目录存在
                    if (!fs.existsSync(fileDir)) {
                        fs.mkdirSync(fileDir, { recursive: true });
                    }
                    
                    // 创建文件（如果不存在）
                    if (!fs.existsSync(filePath)) {
                        fs.writeFileSync(filePath, file.content, 'utf-8');
                    }
                }
            }

            return {
                success: true,
                memoriesCreated: templateMemories.length
            };
        } catch (error) {
            return {
                success: false,
                memoriesCreated: 0,
                error: (error as Error).message
            };
        }
    }

    // 创建自定义模板
    async createCustomTemplate(
        name: string,
        description: string,
        category: ProjectTemplate['category'],
        language: string[],
        memories: Memory[]
    ): Promise<string> {
        const templateId = `custom-${Date.now()}`;
        const template: ProjectTemplate = {
            id: templateId,
            name,
            description,
            category,
            language,
            memories
        };

        this.templates.push(template);
        
        // 保存自定义模板（可选）
        await this.saveCustomTemplate(template);

        return templateId;
    }

    // 保存自定义模板
    private async saveCustomTemplate(template: ProjectTemplate): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }

            const templatesDir = path.join(workspaceFolder.uri.fsPath, '.cursor-memory', 'templates');
            if (!fs.existsSync(templatesDir)) {
                fs.mkdirSync(templatesDir, { recursive: true });
            }

            const templatePath = path.join(templatesDir, `${template.id}.json`);
            fs.writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf-8');
        } catch (error) {
            console.error('保存自定义模板失败:', error);
        }
    }

    // 加载自定义模板
    async loadCustomTemplates(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }

            const templatesDir = path.join(workspaceFolder.uri.fsPath, '.cursor-memory', 'templates');
            if (!fs.existsSync(templatesDir)) {
                return;
            }

            const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                try {
                    const filePath = path.join(templatesDir, file);
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const template = JSON.parse(content) as ProjectTemplate;
                    this.templates.push(template);
                } catch (error) {
                    console.error(`加载模板 ${file} 失败:`, error);
                }
            }
        } catch (error) {
            console.error('加载自定义模板失败:', error);
        }
    }

    // 生成 ID
    private generateId(): string {
        return 'template_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }
}

