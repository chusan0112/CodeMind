import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Memory, MemoryCategory, ImportanceLevel } from './memoryStorage';

// 项目语言类型
export enum ProjectLanguage {
    GO = 'go',
    JAVA = 'java',
    JAVASCRIPT = 'javascript',
    TYPESCRIPT = 'typescript',
    PYTHON = 'python',
    RUST = 'rust',
    C = 'c',
    CPP = 'cpp',
    CSHARP = 'csharp',
    PHP = 'php',
    RUBY = 'ruby',
    KOTLIN = 'kotlin',
    SWIFT = 'swift',
    DART = 'dart',
    UNKNOWN = 'unknown'
}

// 项目扫描结果
export interface ProjectInfo {
    language: ProjectLanguage;
    languageVersion?: string;
    dependencies: string[];
    projectStructure: string[];
    codeStyle?: string;
    framework?: string;
    buildTool?: string;
}

// 项目扫描器类
export class ProjectScanner {
    private workspaceFolder: vscode.WorkspaceFolder;

    constructor(workspaceFolder: vscode.WorkspaceFolder) {
        this.workspaceFolder = workspaceFolder;
    }

    // 获取工作区根路径
    private getWorkspacePath(): string {
        return this.workspaceFolder.uri.fsPath;
    }

    // 检查文件是否存在
    private fileExists(filePath: string): boolean {
        try {
            return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
        } catch {
            return false;
        }
    }

    // 读取文件内容
    private readFile(filePath: string): string | null {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
            console.error(`读取文件失败: ${filePath}`, error);
            return null;
        }
    }

    // 检测项目语言
    async detectLanguage(): Promise<ProjectLanguage> {
        const rootPath = this.getWorkspacePath();
        
        // 检测各种语言的特征文件
        const languageIndicators: Array<{ file: string; language: ProjectLanguage }> = [
            { file: 'go.mod', language: ProjectLanguage.GO },
            { file: 'package.json', language: ProjectLanguage.JAVASCRIPT },
            { file: 'tsconfig.json', language: ProjectLanguage.TYPESCRIPT },
            { file: 'pom.xml', language: ProjectLanguage.JAVA },
            { file: 'build.gradle', language: ProjectLanguage.JAVA },
            { file: 'build.gradle.kts', language: ProjectLanguage.KOTLIN },
            { file: 'requirements.txt', language: ProjectLanguage.PYTHON },
            { file: 'setup.py', language: ProjectLanguage.PYTHON },
            { file: 'pyproject.toml', language: ProjectLanguage.PYTHON },
            { file: 'Cargo.toml', language: ProjectLanguage.RUST },
            { file: 'CMakeLists.txt', language: ProjectLanguage.CPP },
            { file: 'Makefile', language: ProjectLanguage.C },
            { file: '*.csproj', language: ProjectLanguage.CSHARP },
            { file: '*.sln', language: ProjectLanguage.CSHARP },
            { file: 'composer.json', language: ProjectLanguage.PHP },
            { file: 'Gemfile', language: ProjectLanguage.RUBY },
            { file: 'Package.swift', language: ProjectLanguage.SWIFT },
            { file: 'pubspec.yaml', language: ProjectLanguage.DART }
        ];

        for (const indicator of languageIndicators) {
            const filePath = path.join(rootPath, indicator.file);
            if (this.fileExists(filePath)) {
                return indicator.language;
            }
        }

        // 如果没有找到特征文件，尝试通过文件扩展名检测
        return this.detectLanguageByFiles(rootPath);
    }

    // 通过文件扩展名检测语言
    private detectLanguageByFiles(rootPath: string): ProjectLanguage {
        const fileExtensions: Record<string, ProjectLanguage> = {
            '.go': ProjectLanguage.GO,
            '.java': ProjectLanguage.JAVA,
            '.kt': ProjectLanguage.KOTLIN,
            '.kts': ProjectLanguage.KOTLIN,
            '.js': ProjectLanguage.JAVASCRIPT,
            '.ts': ProjectLanguage.TYPESCRIPT,
            '.py': ProjectLanguage.PYTHON,
            '.rs': ProjectLanguage.RUST,
            '.c': ProjectLanguage.C,
            '.cpp': ProjectLanguage.CPP,
            '.cxx': ProjectLanguage.CPP,
            '.cc': ProjectLanguage.CPP,
            '.h': ProjectLanguage.C,
            '.hpp': ProjectLanguage.CPP,
            '.cs': ProjectLanguage.CSHARP,
            '.php': ProjectLanguage.PHP,
            '.rb': ProjectLanguage.RUBY,
            '.swift': ProjectLanguage.SWIFT,
            '.dart': ProjectLanguage.DART
        };

        try {
            const files = this.findSourceFiles(rootPath, 20);
            const extensionCount: Record<string, number> = {};

            for (const file of files) {
                const ext = path.extname(file).toLowerCase();
                if (fileExtensions[ext]) {
                    extensionCount[ext] = (extensionCount[ext] || 0) + 1;
                }
            }

            // 找到最常见的扩展名
            let maxCount = 0;
            let detectedLanguage = ProjectLanguage.UNKNOWN;

            for (const [ext, count] of Object.entries(extensionCount)) {
                if (count > maxCount) {
                    maxCount = count;
                    detectedLanguage = fileExtensions[ext];
                }
            }

            return detectedLanguage;
        } catch {
            return ProjectLanguage.UNKNOWN;
        }
    }

    // 查找源代码文件
    private findSourceFiles(rootPath: string, maxFiles: number): string[] {
        const sourceFiles: string[] = [];
        const excludeDirs = ['.git', 'vendor', 'node_modules', 'out', '.vscode', 'dist', 'build'];

        const scanForSourceFiles = (dirPath: string, depth: number = 0): void => {
            if (sourceFiles.length >= maxFiles || depth > 3) {
                return;
            }

            try {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (sourceFiles.length >= maxFiles) {
                        break;
                    }

                    if (entry.isDirectory()) {
                        if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
                            scanForSourceFiles(path.join(dirPath, entry.name), depth + 1);
                        }
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        const sourceExtensions = ['.go', '.java', '.js', '.ts', '.py', '.rs', '.cpp', '.cxx', '.cs', '.php', '.rb'];
                        if (sourceExtensions.includes(ext)) {
                            sourceFiles.push(path.join(dirPath, entry.name));
                        }
                    }
                }
            } catch (error) {
                // 忽略错误
            }
        };

        scanForSourceFiles(rootPath);
        return sourceFiles;
    }

    // 扫描项目依赖和版本（通用方法）
    async scanDependencies(): Promise<{ languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string }> {
        const language = await this.detectLanguage();
        
        switch (language) {
            case ProjectLanguage.GO:
                return await this.scanGoMod();
            case ProjectLanguage.JAVASCRIPT:
            case ProjectLanguage.TYPESCRIPT:
                return await this.scanNodeProject();
            case ProjectLanguage.JAVA:
            case ProjectLanguage.KOTLIN:
                return await this.scanJavaProject();
            case ProjectLanguage.PYTHON:
                return await this.scanPythonProject();
            case ProjectLanguage.RUST:
                return await this.scanRustProject();
            case ProjectLanguage.C:
            case ProjectLanguage.CPP:
                return await this.scanCppProject();
            case ProjectLanguage.CSHARP:
                return await this.scanCSharpProject();
            case ProjectLanguage.PHP:
                return await this.scanPhpProject();
            case ProjectLanguage.RUBY:
                return await this.scanRubyProject();
            case ProjectLanguage.DART:
                return await this.scanDartProject();
            default:
                return { dependencies: [] };
        }
    }

    // 扫描 go.mod 文件
    async scanGoMod(): Promise<{ languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string }> {
        const goModPath = path.join(this.getWorkspacePath(), 'go.mod');
        
        if (!this.fileExists(goModPath)) {
            return { dependencies: [] };
        }

        const content = this.readFile(goModPath);
        if (!content) {
            return { dependencies: [] };
        }

        const result: { languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string } = {
            dependencies: []
        };

        // 解析 go.mod 文件内容
        const lines = content.split('\n');
        let inRequireBlock = false;
        let inReplaceBlock = false;
        let inExcludeBlock = false;

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // 跳过注释和空行
            if (trimmedLine.startsWith('//') || trimmedLine === '') {
                continue;
            }
            
            // 提取 Go 版本
            if (trimmedLine.startsWith('go ')) {
                const versionMatch = trimmedLine.match(/^go\s+([\d.]+)/);
                if (versionMatch) {
                    result.languageVersion = versionMatch[1];
                }
                continue;
            }
            
            // 检测 require 块开始
            if (trimmedLine === 'require (' || trimmedLine.startsWith('require (')) {
                inRequireBlock = true;
                // 处理单行 require: require github.com/xxx v1.0.0
                if (trimmedLine.startsWith('require (') && trimmedLine.length > 9) {
                    const singleLineRequire = trimmedLine.substring(9).trim();
                    if (singleLineRequire && !singleLineRequire.endsWith(')')) {
                        const depMatch = singleLineRequire.match(/^([^\s]+)\s+([^\s]+)/);
                        if (depMatch) {
                            result.dependencies.push(`${depMatch[1]} ${depMatch[2]}`);
                        }
                    }
                }
                continue;
            }
            
            // 检测其他块（replace, exclude）
            if (trimmedLine === 'replace (' || trimmedLine.startsWith('replace (')) {
                inReplaceBlock = true;
                continue;
            }
            
            if (trimmedLine === 'exclude (' || trimmedLine.startsWith('exclude (')) {
                inExcludeBlock = true;
                continue;
            }
            
            // 检测块结束
            if (trimmedLine === ')') {
                inRequireBlock = false;
                inReplaceBlock = false;
                inExcludeBlock = false;
                continue;
            }
            
            // 在 require 块中提取依赖
            if (inRequireBlock && !inReplaceBlock && !inExcludeBlock) {
                // 解析依赖行，格式: "github.com/gin-gonic/gin v1.9.1" 或 "github.com/xxx/yyy v1.0.0 => ./local"
                const depMatch = trimmedLine.match(/^([^\s]+)\s+([^\s]+)/);
                if (depMatch) {
                    const depName = depMatch[1];
                    const depVersion = depMatch[2];
                    // 排除本地替换的依赖
                    if (!depVersion.startsWith('=>')) {
                        result.dependencies.push(`${depName} ${depVersion}`);
                    }
                }
            }
        }

        result.buildTool = 'go modules';
        return result;
    }

    // 扫描 Node.js/JavaScript/TypeScript 项目
    async scanNodeProject(): Promise<{ languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string }> {
        const result: { languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string } = {
            dependencies: []
        };

        const packageJsonPath = path.join(this.getWorkspacePath(), 'package.json');
        if (!this.fileExists(packageJsonPath)) {
            return result;
        }

        const content = this.readFile(packageJsonPath);
        if (!content) {
            return result;
        }

        try {
            const packageJson = JSON.parse(content);
            
            // 提取 Node.js 版本要求
            if (packageJson.engines?.node) {
                result.languageVersion = packageJson.engines.node;
            }

            // 提取依赖
            const allDeps = {
                ...packageJson.dependencies || {},
                ...packageJson.devDependencies || {}
            };

            for (const [depName, depVersion] of Object.entries(allDeps)) {
                result.dependencies.push(`${depName} ${depVersion}`);
            }

            // 检测框架
            if (packageJson.dependencies?.['react'] || packageJson.dependencies?.['react-dom']) {
                result.framework = 'React';
            } else if (packageJson.dependencies?.['vue']) {
                result.framework = 'Vue';
            } else if (packageJson.dependencies?.['angular']) {
                result.framework = 'Angular';
            } else if (packageJson.dependencies?.['express']) {
                result.framework = 'Express';
            } else if (packageJson.dependencies?.['next']) {
                result.framework = 'Next.js';
            } else if (packageJson.dependencies?.['electron'] || packageJson.devDependencies?.['electron']) {
                result.framework = 'Electron';
            } else if (packageJson.dependencies?.['@tauri-apps/api'] || packageJson.devDependencies?.['@tauri-apps/cli']) {
                result.framework = 'Tauri';
            } else if (packageJson.dependencies?.['react-native'] || packageJson.devDependencies?.['react-native']) {
                result.framework = 'React Native';
            } else if (packageJson.dependencies?.['@nestjs/core'] || packageJson.devDependencies?.['@nestjs/core']) {
                result.framework = 'NestJS';
            } else if (packageJson.dependencies?.['@sveltejs/kit'] || packageJson.devDependencies?.['@sveltejs/kit']) {
                result.framework = 'SvelteKit';
            } else if (packageJson.dependencies?.['solid-js'] || packageJson.devDependencies?.['solid-js']) {
                result.framework = 'SolidJS';
            } else if (packageJson.dependencies?.['@remix-run/node'] || packageJson.devDependencies?.['@remix-run/node']) {
                result.framework = 'Remix';
            } else if (packageJson.dependencies?.['nuxt'] || packageJson.devDependencies?.['nuxt']) {
                result.framework = 'Nuxt.js';
            } else if (packageJson.dependencies?.['koa'] || packageJson.devDependencies?.['koa']) {
                result.framework = 'Koa';
            }
            
            // 检查是否有 src-tauri 目录（Tauri 项目特征）
            const tauriDir = path.join(this.getWorkspacePath(), 'src-tauri');
            if (fs.existsSync(tauriDir) && fs.statSync(tauriDir).isDirectory()) {
                result.framework = 'Tauri';
            }
            
            // 检查是否有 pubspec.yaml（Flutter/Dart 项目特征）
            const pubspecPath = path.join(this.getWorkspacePath(), 'pubspec.yaml');
            if (fs.existsSync(pubspecPath)) {
                const pubspecContent = this.readFile(pubspecPath);
                if (pubspecContent && pubspecContent.includes('flutter:')) {
                    result.framework = 'Flutter';
                }
            }

            result.buildTool = 'npm/yarn/pnpm';
        } catch (error) {
            console.error('解析 package.json 失败:', error);
        }

        return result;
    }

    // 扫描 Java 项目
    async scanJavaProject(): Promise<{ languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string }> {
        const result: { languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string } = {
            dependencies: []
        };

        const rootPath = this.getWorkspacePath();

        // 检查 Maven
        const pomPath = path.join(rootPath, 'pom.xml');
        if (this.fileExists(pomPath)) {
            result.buildTool = 'Maven';
            const content = this.readFile(pomPath);
            if (content) {
                // 简单解析 pom.xml（可以使用 xml2js 库更准确）
                const javaVersionMatch = content.match(/<java\.version>([^<]+)<\/java\.version>/i) ||
                                       content.match(/<maven\.compiler\.source>([^<]+)<\/maven\.compiler\.source>/i);
                if (javaVersionMatch) {
                    result.languageVersion = javaVersionMatch[1];
                }

                // 检测框架
                if (content.includes('spring-boot')) {
                    result.framework = 'Spring Boot';
                } else if (content.includes('springframework')) {
                    result.framework = 'Spring Framework';
                }
                
                // 检测 Kotlin
                if (content.includes('kotlin') || content.includes('org.jetbrains.kotlin')) {
                    result.languageVersion = 'Kotlin';
                }
            }
        }

        // 检查 Gradle
        const buildGradlePath = path.join(rootPath, 'build.gradle');
        if (this.fileExists(buildGradlePath)) {
            result.buildTool = 'Gradle';
            const content = this.readFile(buildGradlePath);
            if (content) {
                const javaVersionMatch = content.match(/sourceCompatibility\s*=\s*['"]([^'"]+)['"]/);
                if (javaVersionMatch) {
                    result.languageVersion = javaVersionMatch[1];
                }
            }
        }

        return result;
    }

    // 扫描 Python 项目
    async scanPythonProject(): Promise<{ languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string }> {
        const result: { languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string } = {
            dependencies: []
        };

        const rootPath = this.getWorkspacePath();

        // 检查 requirements.txt
        const requirementsPath = path.join(rootPath, 'requirements.txt');
        if (this.fileExists(requirementsPath)) {
            result.buildTool = 'pip';
            const content = this.readFile(requirementsPath);
            if (content) {
                const lines = content.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        result.dependencies.push(trimmed);
                    }
                }
            }
        }

        // 检查 setup.py
        const setupPyPath = path.join(rootPath, 'setup.py');
        if (this.fileExists(setupPyPath)) {
            result.buildTool = 'setuptools';
        }

        // 检查 pyproject.toml
        const pyprojectPath = path.join(rootPath, 'pyproject.toml');
        if (this.fileExists(pyprojectPath)) {
            result.buildTool = 'poetry/pip';
        }

        // 检测框架
        for (const dep of result.dependencies) {
            if (dep.includes('django')) {
                result.framework = 'Django';
                break;
            } else if (dep.includes('flask')) {
                result.framework = 'Flask';
                break;
            } else if (dep.includes('fastapi')) {
                result.framework = 'FastAPI';
                break;
            } else if (dep.includes('tornado')) {
                result.framework = 'Tornado';
                break;
            } else if (dep.includes('aiohttp')) {
                result.framework = 'aiohttp';
                break;
            }
        }

        return result;
    }

    // 扫描 Rust 项目
    async scanRustProject(): Promise<{ languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string }> {
        const result: { languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string } = {
            dependencies: []
        };

        const cargoTomlPath = path.join(this.getWorkspacePath(), 'Cargo.toml');
        if (!this.fileExists(cargoTomlPath)) {
            return result;
        }

        result.buildTool = 'Cargo';
        const content = this.readFile(cargoTomlPath);
        if (!content) {
            return result;
        }

        // 简单解析 Cargo.toml
        const lines = content.split('\n');
        let inDependencies = false;

        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed === '[dependencies]' || trimmed.startsWith('[dependencies.')) {
                inDependencies = true;
                continue;
            }

            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                inDependencies = false;
                continue;
            }

            if (inDependencies && trimmed && !trimmed.startsWith('#')) {
                const depMatch = trimmed.match(/^([^\s=]+)\s*=\s*(.+)$/);
                if (depMatch) {
                    const depName = depMatch[1];
                    const depValue = depMatch[2];
                    result.dependencies.push(`${depName} ${depValue}`);
                    
                    // 检测 Tauri 框架
                    if (depName === 'tauri' || depName.startsWith('tauri-')) {
                        result.framework = 'Tauri';
                    }
                    // 检测 Rocket 框架
                    if (depName === 'rocket') {
                        result.framework = 'Rocket';
                    }
                    // 检测 Actix-web 框架
                    if (depName === 'actix-web') {
                        result.framework = 'Actix-web';
                    }
                    // 检测 Tokio 异步运行时
                    if (depName === 'tokio') {
                        result.framework = 'Tokio';
                    }
                }
            }
        }

        // 检查是否有 tauri.conf.json 或 tauri.conf.json5 文件（Tauri 项目特征）
        const tauriConfigPath = path.join(this.getWorkspacePath(), 'src-tauri', 'tauri.conf.json');
        const tauriConfigPath2 = path.join(this.getWorkspacePath(), 'src-tauri', 'tauri.conf.json5');
        if (this.fileExists(tauriConfigPath) || this.fileExists(tauriConfigPath2)) {
            result.framework = 'Tauri';
        }

        return result;
    }

    // 扫描 C/C++ 项目
    async scanCppProject(): Promise<{ languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string }> {
        const result: { languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string } = {
            dependencies: []
        };

        const rootPath = this.getWorkspacePath();

        // 检查 CMakeLists.txt
        const cmakePath = path.join(rootPath, 'CMakeLists.txt');
        if (this.fileExists(cmakePath)) {
            result.buildTool = 'CMake';
        }

        // 检查 Makefile
        const makefilePath = path.join(rootPath, 'Makefile');
        if (this.fileExists(makefilePath)) {
            result.buildTool = 'Make';
        }

        return result;
    }

    // 扫描 C# 项目
    async scanCSharpProject(): Promise<{ languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string }> {
        const result: { languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string } = {
            dependencies: []
        };

        const rootPath = this.getWorkspacePath();

        // 检查 .csproj 和 .sln 文件
        try {
            const files = fs.readdirSync(rootPath);
            const csprojFiles = files.filter(f => f.endsWith('.csproj'));
            const slnFiles = files.filter(f => f.endsWith('.sln'));
            
            if (csprojFiles.length > 0) {
                result.buildTool = 'MSBuild';
                
                // 尝试读取第一个 .csproj 文件
                const csprojPath = path.join(rootPath, csprojFiles[0]);
                const content = this.readFile(csprojPath);
                if (content) {
                    // 检测 ASP.NET Core
                    if (content.includes('Microsoft.AspNetCore') || content.includes('Microsoft.NET.Sdk.Web')) {
                        result.framework = 'ASP.NET Core';
                    } else if (content.includes('Microsoft.NET.Sdk')) {
                        result.framework = '.NET';
                    }
                    
                    // 简单解析 .NET 版本
                    const targetFrameworkMatch = content.match(/TargetFramework[^>]*>([^<]+)</i);
                    if (targetFrameworkMatch) {
                        result.languageVersion = targetFrameworkMatch[1];
                    }
                    
                    // 提取 PackageReference 依赖
                    const packageRefMatches = content.matchAll(/PackageReference\s+Include\s*=\s*["']([^"']+)["'][^>]*Version\s*=\s*["']([^"']+)["']/gi);
                    for (const match of packageRefMatches) {
                        result.dependencies.push(`${match[1]} ${match[2]}`);
                    }
                }
            } else if (slnFiles.length > 0) {
                result.buildTool = 'Visual Studio Solution';
            }
        } catch {
            // 忽略错误
        }

        return result;
    }

    // 扫描 PHP 项目（增强 Laravel 检测）
    async scanPhpProject(): Promise<{ languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string }> {
        const result: { languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string } = {
            dependencies: []
        };

        const composerJsonPath = path.join(this.getWorkspacePath(), 'composer.json');
        if (!this.fileExists(composerJsonPath)) {
            return result;
        }

        const content = this.readFile(composerJsonPath);
        if (!content) {
            return result;
        }

        try {
            const composerJson = JSON.parse(content);
            
            // 检测 Laravel
            if (composerJson.require?.['laravel/framework'] || composerJson['require-dev']?.['laravel/framework']) {
                result.framework = 'Laravel';
            } else if (composerJson.require?.['symfony/symfony']) {
                result.framework = 'Symfony';
            } else if (composerJson.require?.['codeigniter4/framework']) {
                result.framework = 'CodeIgniter';
            }

            // 提取依赖
            const allDeps = {
                ...composerJson.require || {},
                ...composerJson['require-dev'] || {}
            };

            for (const [depName, depVersion] of Object.entries(allDeps)) {
                result.dependencies.push(`${depName} ${depVersion}`);
            }

            result.buildTool = 'Composer';
        } catch (error) {
            console.error('解析 composer.json 失败:', error);
        }

        return result;
    }
    
    // 扫描 Ruby 项目（增强 Rails 检测）
    async scanRubyProject(): Promise<{ languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string }> {
        const result: { languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string } = {
            dependencies: []
        };

        const gemfilePath = path.join(this.getWorkspacePath(), 'Gemfile');
        if (!this.fileExists(gemfilePath)) {
            return result;
        }

        const content = this.readFile(gemfilePath);
        if (!content) {
            return result;
        }

        // 检测 Rails
        if (content.includes("gem 'rails'") || content.includes('gem "rails"')) {
            result.framework = 'Rails';
        } else if (content.includes("gem 'sinatra'") || content.includes('gem "sinatra"')) {
            result.framework = 'Sinatra';
        }

        // 提取依赖
        const gemMatches = content.matchAll(/gem\s+['"]([^'"]+)['"]/g);
        for (const match of gemMatches) {
            result.dependencies.push(match[1]);
        }

        result.buildTool = 'Bundler';

        return result;
    }
    
    // 扫描 Dart/Flutter 项目
    async scanDartProject(): Promise<{ languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string }> {
        const result: { languageVersion?: string; dependencies: string[]; framework?: string; buildTool?: string } = {
            dependencies: []
        };

        const pubspecPath = path.join(this.getWorkspacePath(), 'pubspec.yaml');
        if (!this.fileExists(pubspecPath)) {
            return result;
        }

        const content = this.readFile(pubspecPath);
        if (!content) {
            return result;
        }

        result.buildTool = 'Pub';

        // 检测 Flutter
        if (content.includes('flutter:')) {
            result.framework = 'Flutter';
        }

        // 提取依赖
        const lines = content.split('\n');
        let inDependencies = false;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === 'dependencies:' || trimmed.startsWith('dependencies:')) {
                inDependencies = true;
                continue;
            }
            if (trimmed.startsWith('dev_dependencies:') || trimmed.startsWith('dependency_overrides:')) {
                inDependencies = false;
                continue;
            }
            if (inDependencies && trimmed && !trimmed.startsWith('#')) {
                const depMatch = trimmed.match(/^\s*([^:]+):\s*(.+)$/);
                if (depMatch) {
                    result.dependencies.push(`${depMatch[1].trim()} ${depMatch[2].trim()}`);
                }
            }
        }

        return result;
    }

    // 扫描项目目录结构（支持多语言）
    async scanProjectStructure(): Promise<string[]> {
        const structure: string[] = [];
        const rootPath = this.getWorkspacePath();
        const language = await this.detectLanguage();

        // 需要排除的目录和文件
        const excludeDirs = [
            '.git', '.svn', '.hg',
            'node_modules', 'vendor',
            'out', 'dist', 'build',
            '.vscode', '.idea', '.cursor-memory',
            '.github', '.gitlab',
            '__pycache__', '.pytest_cache',
            'target', '.gradle', '.mvn'
        ];

        // 不同语言的典型目录结构
        const typicalDirs: Record<ProjectLanguage, string[]> = {
            [ProjectLanguage.GO]: [
                'cmd', 'internal', 'pkg', 'api', 'configs', 'config',
                'models', 'handlers', 'services', 'repositories', 'middleware',
                'utils', 'common', 'types', 'interfaces'
            ],
            [ProjectLanguage.JAVA]: [
                'src', 'main', 'test', 'resources',
                'controller', 'service', 'repository', 'model', 'dto',
                'config', 'util', 'common'
            ],
            [ProjectLanguage.JAVASCRIPT]: [
                'src', 'lib', 'components', 'pages', 'utils', 'services',
                'api', 'config', 'styles', 'assets', 'public'
            ],
            [ProjectLanguage.TYPESCRIPT]: [
                'src', 'lib', 'components', 'pages', 'utils', 'services',
                'api', 'config', 'styles', 'assets', 'public', 'types'
            ],
            [ProjectLanguage.PYTHON]: [
                'src', 'app', 'api', 'models', 'services', 'utils',
                'config', 'tests', 'migrations'
            ],
            [ProjectLanguage.RUST]: [
                'src', 'tests', 'examples', 'benches'
            ],
            [ProjectLanguage.C]: [
                'src', 'include', 'lib', 'test', 'tests'
            ],
            [ProjectLanguage.CPP]: [
                'src', 'include', 'lib', 'test', 'tests'
            ],
            [ProjectLanguage.CSHARP]: [
                'src', 'Controllers', 'Services', 'Models', 'Views',
                'Data', 'Utils', 'Common', 'Program.cs'
            ],
            [ProjectLanguage.PHP]: [
                'src', 'app', 'config', 'database', 'resources', 'routes',
                'public', 'tests'
            ],
            [ProjectLanguage.RUBY]: [
                'app', 'lib', 'config', 'db', 'spec', 'test'
            ],
            [ProjectLanguage.KOTLIN]: [
                'src', 'main', 'test', 'resources',
                'controller', 'service', 'repository', 'model', 'dto',
                'config', 'util', 'common'
            ],
            [ProjectLanguage.SWIFT]: [
                'Sources', 'Tests', 'Package.swift',
                'App', 'Models', 'Views', 'Controllers'
            ],
            [ProjectLanguage.DART]: [
                'lib', 'test', 'web', 'example',
                'screens', 'widgets', 'models', 'services'
            ],
            [ProjectLanguage.UNKNOWN]: []
        };

        const languageTypicalDirs = typicalDirs[language] || [];

        // 递归扫描函数
        const scanDirectory = (dirPath: string, depth: number = 0, maxDepth: number = 3): void => {
            // 限制扫描深度，避免扫描过深
            if (depth > maxDepth) {
                return;
            }

            try {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const entryName = entry.name;
                    
                    // 跳过排除的目录
                    if (excludeDirs.includes(entryName) || entryName.startsWith('.')) {
                        continue;
                    }
                    
                    // 只处理目录
                    if (entry.isDirectory()) {
                        const fullPath = path.join(dirPath, entryName);
                        const entryNameLower = entryName.toLowerCase();
                        
                        // 如果是该语言的典型目录，记录下来
                        if (languageTypicalDirs.includes(entryNameLower)) {
                            const relativePath = path.relative(rootPath, fullPath);
                            if (!structure.includes(relativePath)) {
                                structure.push(relativePath);
                            }
                        }
                        
                        // 继续递归扫描（只在第一层深度时扫描所有目录）
                        if (depth === 0 || languageTypicalDirs.includes(entryNameLower)) {
                            scanDirectory(fullPath, depth + 1, maxDepth);
                        }
                    }
                }
            } catch (error) {
                // 忽略权限错误等
                console.debug(`扫描目录失败: ${dirPath}`, error);
            }
        };

        // 开始扫描
        scanDirectory(rootPath);

        // 如果没有找到典型目录，至少记录根目录下的直接子目录
        if (structure.length === 0) {
            try {
                const entries = fs.readdirSync(rootPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && !excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
                        structure.push(entry.name);
                    }
                }
            } catch (error) {
                console.debug('扫描根目录失败:', error);
            }
        }

        return structure.sort();
    }

    // 检测代码风格（支持多语言）
    async detectCodeStyle(): Promise<string | undefined> {
        const rootPath = this.getWorkspacePath();
        const language = await this.detectLanguage();
        const styleInfo: string[] = [];

        // 不同语言的代码风格配置文件
        const styleConfigs: Array<{ name: string; tool: string; languages?: ProjectLanguage[] }> = [
            // Go
            { name: '.golangci.yml', tool: 'golangci-lint', languages: [ProjectLanguage.GO] },
            { name: '.golangci.yaml', tool: 'golangci-lint', languages: [ProjectLanguage.GO] },
            { name: 'golangci.yml', tool: 'golangci-lint', languages: [ProjectLanguage.GO] },
            { name: 'golangci.yaml', tool: 'golangci-lint', languages: [ProjectLanguage.GO] },
            { name: '.gofmt', tool: 'gofmt', languages: [ProjectLanguage.GO] },
            
            // JavaScript/TypeScript
            { name: '.eslintrc.js', tool: 'ESLint', languages: [ProjectLanguage.JAVASCRIPT, ProjectLanguage.TYPESCRIPT] },
            { name: '.eslintrc.json', tool: 'ESLint', languages: [ProjectLanguage.JAVASCRIPT, ProjectLanguage.TYPESCRIPT] },
            { name: '.eslintrc.yml', tool: 'ESLint', languages: [ProjectLanguage.JAVASCRIPT, ProjectLanguage.TYPESCRIPT] },
            { name: '.prettierrc', tool: 'Prettier', languages: [ProjectLanguage.JAVASCRIPT, ProjectLanguage.TYPESCRIPT] },
            { name: '.prettierrc.json', tool: 'Prettier', languages: [ProjectLanguage.JAVASCRIPT, ProjectLanguage.TYPESCRIPT] },
            
            // Java
            { name: 'checkstyle.xml', tool: 'Checkstyle', languages: [ProjectLanguage.JAVA] },
            { name: '.checkstyle', tool: 'Checkstyle', languages: [ProjectLanguage.JAVA] },
            
            // Python
            { name: '.pylintrc', tool: 'Pylint', languages: [ProjectLanguage.PYTHON] },
            { name: 'setup.cfg', tool: 'Flake8/Pylint', languages: [ProjectLanguage.PYTHON] },
            { name: 'pyproject.toml', tool: 'Black/Ruff', languages: [ProjectLanguage.PYTHON] },
            
            // Rust
            { name: 'rustfmt.toml', tool: 'rustfmt', languages: [ProjectLanguage.RUST] },
            { name: '.rustfmt.toml', tool: 'rustfmt', languages: [ProjectLanguage.RUST] },
            
            // 通用
            { name: '.editorconfig', tool: 'EditorConfig' }
        ];

        for (const config of styleConfigs) {
            // 如果配置指定了语言，检查是否匹配
            if (config.languages && !config.languages.includes(language)) {
                continue;
            }
            
            const configPath = path.join(rootPath, config.name);
            if (this.fileExists(configPath)) {
                styleInfo.push(`使用 ${config.tool}`);
            }
        }

        // 检测命名风格
        const namingStyle = this.detectNamingStyle(rootPath, language);
        if (namingStyle) {
            styleInfo.push(namingStyle);
        }

        // 如果没有找到特定配置，返回语言默认值
        if (styleInfo.length === 0) {
            return this.getDefaultCodeStyle(language);
        }

        return styleInfo.join(', ');
    }

    // 获取默认代码风格描述
    private getDefaultCodeStyle(language: ProjectLanguage): string {
        const defaultStyles: Record<ProjectLanguage, string> = {
            [ProjectLanguage.GO]: '使用 gofmt 默认代码风格，遵循 Go 官方代码规范',
            [ProjectLanguage.JAVA]: '使用 Java 标准代码风格',
            [ProjectLanguage.JAVASCRIPT]: '使用 JavaScript 标准代码风格',
            [ProjectLanguage.TYPESCRIPT]: '使用 TypeScript 标准代码风格',
            [ProjectLanguage.PYTHON]: '遵循 PEP 8 Python 代码规范',
            [ProjectLanguage.RUST]: '使用 rustfmt 默认代码风格',
            [ProjectLanguage.C]: '使用 C 标准代码风格',
            [ProjectLanguage.CPP]: '使用 C++ 标准代码风格',
            [ProjectLanguage.CSHARP]: '使用 C# 标准代码风格',
            [ProjectLanguage.PHP]: '遵循 PSR 代码规范',
            [ProjectLanguage.RUBY]: '遵循 Ruby 社区代码规范',
            [ProjectLanguage.KOTLIN]: '遵循 Kotlin 官方代码规范',
            [ProjectLanguage.SWIFT]: '遵循 Swift API 设计指南',
            [ProjectLanguage.DART]: '遵循 Dart 官方代码规范',
            [ProjectLanguage.UNKNOWN]: '使用项目默认代码风格'
        };
        return defaultStyles[language] || '使用项目默认代码风格';
    }

    // 检测命名风格（支持多语言）
    private detectNamingStyle(rootPath: string, language: ProjectLanguage): string | undefined {
        try {
            // 根据语言扫描相应的源代码文件
            const sourceFiles = this.findSourceFilesByLanguage(rootPath, language, 10);
            
            if (sourceFiles.length === 0) {
                return undefined;
            }

            let camelCaseCount = 0;
            let snakeCaseCount = 0;
            let pascalCaseCount = 0;

            for (const filePath of sourceFiles) {
                const content = this.readFile(filePath);
                if (!content) {
                    continue;
                }

                // 命名风格检测：查找变量和函数名
                // 驼峰命名：userName, getUserInfo
                // 蛇形命名：user_name, get_user_info
                // 帕斯卡命名：UserName, GetUserInfo
                const camelCasePattern = /\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g;
                const snakeCasePattern = /\b[a-z][a-z0-9]*_[a-z0-9_]+\b/g;
                const pascalCasePattern = /\b[A-Z][a-zA-Z0-9]+\b/g;

                const camelMatches = content.match(camelCasePattern);
                const snakeMatches = content.match(snakeCasePattern);
                const pascalMatches = content.match(pascalCasePattern);

                if (camelMatches && camelMatches.length > 0) {
                    camelCaseCount += camelMatches.length;
                }
                if (snakeMatches && snakeMatches.length > 0) {
                    snakeCaseCount += snakeMatches.length;
                }
                if (pascalMatches && pascalMatches.length > 0) {
                    // 排除一些常见的关键字和类型名
                    const filteredPascal = pascalMatches.filter(m => 
                        !['String', 'Int', 'Bool', 'Error', 'Context', 'Request', 'Response'].includes(m)
                    );
                    pascalCaseCount += filteredPascal.length;
                }
            }

            // 根据语言判断主要使用的命名风格
            // Go: 导出函数/类型用 PascalCase，其他用 camelCase
            // Python: 主要用 snake_case
            // Java/C#: 类用 PascalCase，变量/方法用 camelCase
            // JavaScript/TypeScript: 主要用 camelCase，类用 PascalCase
            
            if (language === ProjectLanguage.PYTHON) {
                if (snakeCaseCount > camelCaseCount * 2) {
                    return '命名风格：蛇形命名（snake_case）';
                }
            } else if (language === ProjectLanguage.GO) {
                if (pascalCaseCount > 0 && camelCaseCount > 0) {
                    return '命名风格：Go 标准（导出用 PascalCase，其他用 camelCase）';
                }
            } else if (language === ProjectLanguage.JAVA || language === ProjectLanguage.CSHARP) {
                if (pascalCaseCount > 0 && camelCaseCount > 0) {
                    return '命名风格：类用 PascalCase，变量/方法用 camelCase';
                }
            }

            // 通用判断
            if (camelCaseCount > snakeCaseCount * 2 && camelCaseCount > pascalCaseCount) {
                return '命名风格：驼峰命名（camelCase）';
            } else if (snakeCaseCount > camelCaseCount * 2) {
                return '命名风格：蛇形命名（snake_case）';
            } else if (pascalCaseCount > camelCaseCount && pascalCaseCount > snakeCaseCount) {
                return '命名风格：帕斯卡命名（PascalCase）';
            } else if (camelCaseCount > 0 || snakeCaseCount > 0 || pascalCaseCount > 0) {
                return '命名风格：混合使用';
            }
        } catch (error) {
            console.debug('检测命名风格失败:', error);
        }

        return undefined;
    }

    // 根据语言查找源代码文件
    private findSourceFilesByLanguage(rootPath: string, language: ProjectLanguage, maxFiles: number): string[] {
        const fileExtensions: Record<ProjectLanguage, string[]> = {
            [ProjectLanguage.GO]: ['.go'],
            [ProjectLanguage.JAVA]: ['.java'],
            [ProjectLanguage.JAVASCRIPT]: ['.js', '.jsx'],
            [ProjectLanguage.TYPESCRIPT]: ['.ts', '.tsx'],
            [ProjectLanguage.PYTHON]: ['.py'],
            [ProjectLanguage.RUST]: ['.rs'],
            [ProjectLanguage.C]: ['.c', '.h'],
            [ProjectLanguage.CPP]: ['.cpp', '.cxx', '.cc', '.hpp'],
            [ProjectLanguage.CSHARP]: ['.cs'],
            [ProjectLanguage.PHP]: ['.php'],
            [ProjectLanguage.RUBY]: ['.rb'],
            [ProjectLanguage.KOTLIN]: ['.kt', '.kts'],
            [ProjectLanguage.SWIFT]: ['.swift'],
            [ProjectLanguage.DART]: ['.dart'],
            [ProjectLanguage.UNKNOWN]: []
        };

        const extensions = fileExtensions[language] || [];
        if (extensions.length === 0) {
            return [];
        }

        const sourceFiles: string[] = [];
        const excludeDirs = ['.git', 'vendor', 'node_modules', 'out', '.vscode', 'dist', 'build', 'target'];

        const scanForSourceFiles = (dirPath: string, depth: number = 0): void => {
            if (sourceFiles.length >= maxFiles || depth > 2) {
                return;
            }

            try {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (sourceFiles.length >= maxFiles) {
                        break;
                    }

                    if (entry.isDirectory()) {
                        if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
                            scanForSourceFiles(path.join(dirPath, entry.name), depth + 1);
                        }
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (extensions.includes(ext)) {
                            sourceFiles.push(path.join(dirPath, entry.name));
                        }
                    }
                }
            } catch (error) {
                // 忽略错误
            }
        };

        scanForSourceFiles(rootPath);
        return sourceFiles;
    }

    // 扫描整个项目
    async scan(): Promise<ProjectInfo> {
        // 先检测语言
        const language = await this.detectLanguage();
        
        // 并行扫描各项信息
        const [depsInfo, structure, codeStyle] = await Promise.all([
            this.scanDependencies(),
            this.scanProjectStructure(),
            this.detectCodeStyle()
        ]);

        return {
            language: language,
            languageVersion: depsInfo.languageVersion,
            dependencies: depsInfo.dependencies,
            projectStructure: structure,
            codeStyle: codeStyle,
            framework: depsInfo.framework,
            buildTool: depsInfo.buildTool
        };
    }

    // 将项目信息转换为记忆
    generateMemories(projectInfo: ProjectInfo): Memory[] {
        const memories: Memory[] = [];

        // 生成语言和版本记忆
        const languageName = this.getLanguageName(projectInfo.language);
        if (projectInfo.languageVersion) {
            memories.push({
                id: this.generateId(),
                content: `项目使用 ${languageName} ${projectInfo.languageVersion}`,
                category: MemoryCategory.CONFIG,
                timestamp: Date.now(),
                tags: [projectInfo.language, 'version'],
                importance: ImportanceLevel.HIGH,
                confidence: 1.0
            });
        } else {
            memories.push({
                id: this.generateId(),
                content: `项目使用 ${languageName}`,
                category: MemoryCategory.CONFIG,
                timestamp: Date.now(),
                tags: [projectInfo.language],
                importance: ImportanceLevel.HIGH,
                confidence: 0.9
            });
        }

        // 生成框架记忆
        if (projectInfo.framework) {
            memories.push({
                id: this.generateId(),
                content: `项目使用框架: ${projectInfo.framework}`,
                category: MemoryCategory.ARCHITECTURE,
                timestamp: Date.now(),
                tags: ['framework', projectInfo.language],
                importance: ImportanceLevel.HIGH,
                confidence: 1.0
            });
        }

        // 生成构建工具记忆
        if (projectInfo.buildTool) {
            memories.push({
                id: this.generateId(),
                content: `项目构建工具: ${projectInfo.buildTool}`,
                category: MemoryCategory.CONFIG,
                timestamp: Date.now(),
                tags: ['build-tool', projectInfo.language],
                importance: ImportanceLevel.MEDIUM,
                confidence: 1.0
            });
        }

        // 生成依赖记忆
        if (projectInfo.dependencies.length > 0) {
            const topDependencies = projectInfo.dependencies.slice(0, 10); // 只保存前10个
            memories.push({
                id: this.generateId(),
                content: `项目主要依赖: ${topDependencies.join(', ')}`,
                category: MemoryCategory.CONFIG,
                timestamp: Date.now(),
                tags: ['dependencies', 'go-mod'],
                importance: ImportanceLevel.MEDIUM,
                confidence: 1.0
            });
        }

        // 生成项目结构记忆
        if (projectInfo.projectStructure.length > 0) {
            memories.push({
                id: this.generateId(),
                content: `项目目录结构: ${projectInfo.projectStructure.join(', ')}`,
                category: MemoryCategory.ARCHITECTURE,
                timestamp: Date.now(),
                tags: ['structure', 'architecture'],
                importance: ImportanceLevel.HIGH,
                confidence: 0.9
            });
        }

        // 生成代码风格记忆
        if (projectInfo.codeStyle) {
            memories.push({
                id: this.generateId(),
                content: `代码风格: ${projectInfo.codeStyle}`,
                category: MemoryCategory.CODE_STYLE,
                timestamp: Date.now(),
                tags: ['code-style'],
                importance: ImportanceLevel.HIGH,
                confidence: 0.8
            });
        }

        return memories;
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // 获取语言名称（中文）
    private getLanguageName(language: ProjectLanguage): string {
        const languageNames: Record<ProjectLanguage, string> = {
            [ProjectLanguage.GO]: 'Go',
            [ProjectLanguage.JAVA]: 'Java',
            [ProjectLanguage.JAVASCRIPT]: 'JavaScript',
            [ProjectLanguage.TYPESCRIPT]: 'TypeScript',
            [ProjectLanguage.PYTHON]: 'Python',
            [ProjectLanguage.RUST]: 'Rust',
            [ProjectLanguage.C]: 'C',
            [ProjectLanguage.CPP]: 'C++',
            [ProjectLanguage.CSHARP]: 'C#',
            [ProjectLanguage.PHP]: 'PHP',
            [ProjectLanguage.RUBY]: 'Ruby',
            [ProjectLanguage.KOTLIN]: 'Kotlin',
            [ProjectLanguage.SWIFT]: 'Swift',
            [ProjectLanguage.DART]: 'Dart',
            [ProjectLanguage.UNKNOWN]: '未知语言'
        };
        return languageNames[language] || language;
    }
}

