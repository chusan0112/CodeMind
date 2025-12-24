import * as vscode from 'vscode';
import { MemoryStorage, Memory, MemoryCategory, ImportanceLevel } from './memoryStorage';

// 记忆 WebView 提供者
export class MemoryWebViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'memoryManager.memoryView';

    private _view?: vscode.WebviewView;
    private storage: MemoryStorage;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        storage: MemoryStorage
    ) {
        this.storage = storage;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // 监听消息
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'refresh':
                    await this.refresh();
                    break;
                case 'delete':
                    await this.deleteMemory(data.id);
                    break;
                case 'view':
                    await this.viewMemory(data.id);
                    break;
                case 'edit':
                    await this.editMemory(data.id);
                    break;
                case 'update':
                    await this.updateMemory(data.id, data.updates);
                    break;
                case 'search':
                    await this.searchMemories(data.query, data.fuzzy || false);
                    break;
                case 'filter':
                    await this.filterMemories(data.category, data.importance);
                    break;
            }
        });

        // 初始加载记忆
        this.refresh();
    }

    // 刷新记忆列表
    public async refresh() {
        if (this._view) {
            const memories = await this.storage.loadMemories();
            this._view.webview.postMessage({
                type: 'update',
                memories: memories
            });
        }
    }

    // 删除记忆
    private async deleteMemory(id: string) {
        await this.storage.deleteMemory(id);
        vscode.window.showInformationMessage('记忆已删除');
        await this.refresh();
    }

    // 查看记忆详情
    private async viewMemory(id: string) {
        const memories = await this.storage.loadMemories();
        const memory = memories.find(m => m.id === id);
        if (memory) {
            const doc = await vscode.workspace.openTextDocument({
                content: this.formatMemoryDetail(memory),
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        }
    }

    // 编辑记忆
    private async editMemory(id: string) {
        const memories = await this.storage.loadMemories();
        const memory = memories.find(m => m.id === id);
        if (!memory) {
            vscode.window.showErrorMessage('找不到要编辑的记忆');
            return;
        }

        // 发送记忆数据到 WebView 进行编辑
        if (this._view) {
            this._view.webview.postMessage({
                type: 'edit',
                memory: memory
            });
        }
    }

    // 更新记忆
    private async updateMemory(id: string, updates: Partial<Memory>) {
        try {
            await this.storage.updateMemory(id, updates);
            vscode.window.showInformationMessage('记忆已更新');
            await this.refresh();
        } catch (error) {
            vscode.window.showErrorMessage('更新记忆失败: ' + (error as Error).message);
        }
    }

    // 搜索记忆（支持模糊搜索）
    private async searchMemories(query: string, fuzzy: boolean = false) {
        if (fuzzy) {
            const memories = await this.storage.fuzzySearchMemories(query);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'update',
                    memories: memories
                });
            }
        } else {
            const memories = await this.storage.searchMemories(query);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'update',
                    memories: memories
                });
            }
        }
    }

    // 筛选记忆
    private async filterMemories(category?: string, importance?: string) {
        const memories = await this.storage.loadMemories();
        let filtered = memories;
        
        if (category && category !== 'all') {
            filtered = filtered.filter(m => m.category === category);
        }
        
        if (importance && importance !== 'all') {
            filtered = filtered.filter(m => m.importance === importance);
        }
        
        if (this._view) {
            this._view.webview.postMessage({
                type: 'update',
                memories: filtered
            });
        }
    }

    // 格式化记忆详情
    private formatMemoryDetail(memory: Memory): string {
        const categoryLabels: Record<MemoryCategory, string> = {
            [MemoryCategory.ARCHITECTURE]: '架构',
            [MemoryCategory.CODE_STYLE]: '代码风格',
            [MemoryCategory.BUSINESS_RULE]: '业务规则',
            [MemoryCategory.API_SPEC]: 'API 规范',
            [MemoryCategory.DATABASE]: '数据库',
            [MemoryCategory.CONFIG]: '配置',
            [MemoryCategory.CONSTRAINT]: '约束',
            [MemoryCategory.DOCUMENTATION]: '文档',
            [MemoryCategory.OTHER]: '其他'
        };

        const importanceLabels: Record<ImportanceLevel, string> = {
            [ImportanceLevel.CRITICAL]: '强制级',
            [ImportanceLevel.HIGH]: '推荐级',
            [ImportanceLevel.MEDIUM]: '参考级',
            [ImportanceLevel.LOW]: '低优先级'
        };

        let content = `# 记忆详情\n\n`;
        content += `**内容**:\n${memory.content}\n\n`;
        content += `**分类**: ${categoryLabels[memory.category] || memory.category}\n\n`;
        content += `**重要性**: ${importanceLabels[memory.importance] || memory.importance}\n\n`;
        content += `**时间**: ${new Date(memory.timestamp).toLocaleString()}\n\n`;
        
        if (memory.tags.length > 0) {
            content += `**标签**: ${memory.tags.join(', ')}\n\n`;
        }
        
        if (memory.relatedFiles && memory.relatedFiles.length > 0) {
            content += `**相关文件**:\n`;
            for (const file of memory.relatedFiles) {
                content += `- ${file}\n`;
            }
            content += `\n`;
        }
        
        if (memory.confidence !== undefined) {
            content += `**置信度**: ${(memory.confidence * 100).toFixed(0)}%\n\n`;
        }

        return content;
    }

    // 生成 WebView HTML
    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>项目记忆</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
        }
        
        .header {
            margin-bottom: 15px;
        }
        
        .search-box {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
        }
        
        .filters {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        
        .filter-select {
            flex: 1;
            min-width: 100px;
            padding: 6px;
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 2px;
        }
        
        .memory-list {
            list-style: none;
        }
        
        .memory-item {
            background-color: var(--vscode-list-hoverBackground);
            border: 1px solid var(--vscode-list-activeSelectionBackground);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .memory-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .memory-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        
        .memory-content {
            color: var(--vscode-foreground);
            margin-bottom: 8px;
            line-height: 1.5;
            word-break: break-word;
        }
        
        .memory-meta {
            display: flex;
            gap: 10px;
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }
        
        .memory-tags {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
            margin-top: 8px;
        }
        
        .tag {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.85em;
        }
        
        .importance-critical {
            color: var(--vscode-errorForeground);
        }
        
        .importance-high {
            color: var(--vscode-textLink-foreground);
        }
        
        .importance-medium {
            color: var(--vscode-descriptionForeground);
        }
        
        .importance-low {
            color: var(--vscode-descriptionForeground);
            opacity: 0.7;
        }
        
        .actions {
            display: flex;
            gap: 5px;
        }
        
        .btn {
            padding: 4px 8px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 0.85em;
        }
        
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-danger {
            background-color: var(--vscode-errorForeground);
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        
        .refresh-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 6px 12px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
        }
        
        .refresh-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
        }
        
        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            border-radius: 4px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            margin-bottom: 15px;
            font-size: 1.2em;
            font-weight: bold;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        .form-input, .form-textarea, .form-select {
            width: 100%;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-family: inherit;
        }
        
        .form-textarea {
            min-height: 100px;
            resize: vertical;
        }
        
        .form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <button class="refresh-btn" onclick="refresh()">刷新</button>
        <div style="display: flex; gap: 5px; margin-bottom: 10px; align-items: center;">
            <input type="text" class="search-box" id="searchInput" placeholder="搜索记忆..." oninput="handleSearch()" style="flex: 1;">
            <label style="display: flex; align-items: center; gap: 5px; font-size: 0.9em; white-space: nowrap; cursor: pointer;">
                <input type="checkbox" id="fuzzySearch" onchange="handleSearch()"> 模糊搜索
            </label>
        </div>
        <div class="filters">
            <select class="filter-select" id="categoryFilter" onchange="handleFilter()">
                <option value="all">所有分类</option>
                <option value="architecture">架构</option>
                <option value="code_style">代码风格</option>
                <option value="business_rule">业务规则</option>
                <option value="api_spec">API 规范</option>
                <option value="config">配置</option>
                <option value="constraint">约束</option>
            </select>
            <select class="filter-select" id="importanceFilter" onchange="handleFilter()">
                <option value="all">所有重要性</option>
                <option value="critical">强制级</option>
                <option value="high">推荐级</option>
                <option value="medium">参考级</option>
                <option value="low">低优先级</option>
            </select>
        </div>
    </div>
    
    <ul class="memory-list" id="memoryList">
        <li class="empty-state">加载中...</li>
    </ul>

    <!-- 编辑对话框 -->
    <div id="editModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">编辑记忆</div>
            <form id="editForm">
                <div class="form-group">
                    <label class="form-label">内容</label>
                    <textarea class="form-textarea" id="editContent" required></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">分类</label>
                    <select class="form-select" id="editCategory" required>
                        <option value="architecture">架构</option>
                        <option value="code_style">代码风格</option>
                        <option value="business_rule">业务规则</option>
                        <option value="api_spec">API 规范</option>
                        <option value="database">数据库</option>
                        <option value="config">配置</option>
                        <option value="constraint">约束</option>
                        <option value="documentation">文档</option>
                        <option value="other">其他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">重要性</label>
                    <select class="form-select" id="editImportance" required>
                        <option value="critical">强制级</option>
                        <option value="high">推荐级</option>
                        <option value="medium">参考级</option>
                        <option value="low">低优先级</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">标签（用逗号分隔）</label>
                    <input type="text" class="form-input" id="editTags" placeholder="例如: go, api, handler">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn" onclick="closeEditModal()">取消</button>
                    <button type="submit" class="btn">保存</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        const categoryLabels = {
            'architecture': '架构',
            'code_style': '代码风格',
            'business_rule': '业务规则',
            'api_spec': 'API 规范',
            'database': '数据库',
            'config': '配置',
            'constraint': '约束',
            'documentation': '文档',
            'other': '其他'
        };
        
        const importanceLabels = {
            'critical': '强制级',
            'high': '推荐级',
            'medium': '参考级',
            'low': '低优先级'
        };
        
        function formatDate(timestamp) {
            return new Date(timestamp).toLocaleString('zh-CN');
        }
        
        function renderMemories(memories) {
            const list = document.getElementById('memoryList');
            
            if (memories.length === 0) {
                list.innerHTML = '<li class="empty-state">暂无记忆</li>';
                return;
            }
            
            list.innerHTML = memories.map(memory => {
                const content = memory.content.length > 100 
                    ? memory.content.substring(0, 100) + '...' 
                    : memory.content;
                
                const categoryLabel = categoryLabels[memory.category] || memory.category;
                const importanceLabel = importanceLabels[memory.importance] || memory.importance;
                
                return \`
                    <li class="memory-item" onclick="viewMemory('\${memory.id}')">
                        <div class="memory-header">
                            <div>
                                <strong class="importance-\${memory.importance}">[\${importanceLabel}]</strong>
                                <span style="margin-left: 8px;">\${categoryLabel}</span>
                            </div>
                            <div class="actions" onclick="event.stopPropagation()">
                                <button class="btn" onclick="viewMemory('\${memory.id}')">查看</button>
                                <button class="btn" onclick="editMemory('\${memory.id}')">编辑</button>
                                <button class="btn btn-danger" onclick="deleteMemory('\${memory.id}')">删除</button>
                            </div>
                        </div>
                        <div class="memory-content">\${escapeHtml(content)}</div>
                        <div class="memory-meta">
                            <span>\${formatDate(memory.timestamp)}</span>
                            \${memory.confidence ? \`<span>置信度: \${Math.round(memory.confidence * 100)}%</span>\` : ''}
                        </div>
                        \${memory.tags.length > 0 ? \`
                            <div class="memory-tags">
                                \${memory.tags.map(tag => \`<span class="tag">\${escapeHtml(tag)}</span>\`).join('')}
                            </div>
                        \` : ''}
                    </li>
                \`;
            }).join('');
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function refresh() {
            vscode.postMessage({ type: 'refresh' });
        }
        
        function handleSearch() {
            const query = document.getElementById('searchInput').value;
            const fuzzy = document.getElementById('fuzzySearch').checked;
            if (query.trim()) {
                vscode.postMessage({ type: 'search', query: query, fuzzy: fuzzy });
            } else {
                refresh();
            }
        }
        
        function handleFilter() {
            const category = document.getElementById('categoryFilter').value;
            const importance = document.getElementById('importanceFilter').value;
            vscode.postMessage({ type: 'filter', category: category, importance: importance });
        }
        
        function viewMemory(id) {
            vscode.postMessage({ type: 'view', id: id });
        }
        
        function deleteMemory(id) {
            if (confirm('确定要删除这条记忆吗？')) {
                vscode.postMessage({ type: 'delete', id: id });
            }
        }
        
        let editingMemoryId = null;
        
        function editMemory(id) {
            const memories = JSON.parse(localStorage.getItem('memories') || '[]');
            const memory = memories.find(m => m.id === id);
            if (!memory) {
                alert('找不到要编辑的记忆');
                return;
            }
            
            editingMemoryId = id;
            document.getElementById('editContent').value = memory.content;
            document.getElementById('editCategory').value = memory.category;
            document.getElementById('editImportance').value = memory.importance;
            document.getElementById('editTags').value = memory.tags ? memory.tags.join(', ') : '';
            document.getElementById('editModal').style.display = 'block';
        }
        
        function closeEditModal() {
            document.getElementById('editModal').style.display = 'none';
            editingMemoryId = null;
            document.getElementById('editForm').reset();
        }
        
        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            if (!editingMemoryId) return;
            
            const updates = {
                content: document.getElementById('editContent').value,
                category: document.getElementById('editCategory').value,
                importance: document.getElementById('editImportance').value,
                tags: document.getElementById('editTags').value.split(',').map(t => t.trim()).filter(t => t)
            };
            
            vscode.postMessage({ type: 'update', id: editingMemoryId, updates: updates });
            closeEditModal();
        });
        
        // 点击模态框外部关闭
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') {
                closeEditModal();
            }
        });
        
        // 监听来自扩展的消息
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'update':
                    localStorage.setItem('memories', JSON.stringify(message.memories));
                    renderMemories(message.memories);
                    break;
                case 'edit':
                    editingMemoryId = message.memory.id;
                    document.getElementById('editContent').value = message.memory.content;
                    document.getElementById('editCategory').value = message.memory.category;
                    document.getElementById('editImportance').value = message.memory.importance;
                    document.getElementById('editTags').value = message.memory.tags ? message.memory.tags.join(', ') : '';
                    document.getElementById('editModal').style.display = 'block';
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}

