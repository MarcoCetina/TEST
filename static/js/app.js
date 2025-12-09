/**
 * Power BI Claude Chatbot - Frontend Application
 */

// Application State
const state = {
    selectedModel: null,
    selectedWorkspace: null,
    powerbiData: null,
    conversationHistory: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    isConnected: false
};

// DOM Elements
const elements = {
    modelSelect: document.getElementById('model-select'),
    workspaceSelect: document.getElementById('workspace-select'),
    workspaceSection: document.getElementById('workspace-section'),
    connectionStatus: document.getElementById('connection-status'),
    connectBtn: document.getElementById('connect-btn'),
    refreshBtn: document.getElementById('refresh-btn'),
    dataSummarySection: document.getElementById('data-summary-section'),
    dataSummary: document.getElementById('data-summary'),
    chatMessages: document.getElementById('chat-messages'),
    chatContainer: document.getElementById('chat-container'),
    chatForm: document.getElementById('chat-form'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    clearChatBtn: document.getElementById('clear-chat-btn'),
    tokenUsage: document.getElementById('token-usage'),
    loadingOverlay: document.getElementById('loading-overlay')
};

// Initialize marked for Markdown rendering
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});

// API Functions
const api = {
    async getModels() {
        const response = await fetch('/api/models');
        return response.json();
    },

    async getWorkspaces() {
        const response = await fetch('/api/workspaces');
        return response.json();
    },

    async getWorkspaceData(workspaceId) {
        const response = await fetch(`/api/workspace/${workspaceId}/data`);
        return response.json();
    },

    async chat(question, model, workspaceId, powerbiData, conversationHistory) {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                model,
                workspace_id: workspaceId,
                powerbi_data: powerbiData,
                conversation_history: conversationHistory
            })
        });
        return response.json();
    },

    async healthCheck() {
        const response = await fetch('/api/health');
        return response.json();
    }
};

// UI Functions
const ui = {
    showLoading(text = 'Thinking...') {
        const loadingText = elements.loadingOverlay.querySelector('.loading-text');
        loadingText.textContent = text;
        elements.loadingOverlay.style.display = 'flex';
    },

    hideLoading() {
        elements.loadingOverlay.style.display = 'none';
    },

    updateConnectionStatus(connected, error = null) {
        const statusEl = elements.connectionStatus;
        const textEl = statusEl.querySelector('.status-text');

        statusEl.classList.remove('connected', 'disconnected', 'error');

        if (error) {
            statusEl.classList.add('error');
            textEl.textContent = 'Error';
        } else if (connected) {
            statusEl.classList.add('connected');
            textEl.textContent = 'Connected';
            state.isConnected = true;
        } else {
            statusEl.classList.add('disconnected');
            textEl.textContent = 'Not Connected';
            state.isConnected = false;
        }
    },

    updateDataSummary(data) {
        if (!data) {
            elements.dataSummarySection.style.display = 'none';
            return;
        }

        elements.dataSummarySection.style.display = 'block';

        const datasets = data.datasets?.length || 0;
        const reports = data.reports?.length || 0;
        const dashboards = data.dashboards?.length || 0;

        elements.dataSummary.innerHTML = `
            <div class="data-summary-item">
                <span class="data-summary-label">Datasets</span>
                <span class="data-summary-value">${datasets}</span>
            </div>
            <div class="data-summary-item">
                <span class="data-summary-label">Reports</span>
                <span class="data-summary-value">${reports}</span>
            </div>
            <div class="data-summary-item">
                <span class="data-summary-label">Dashboards</span>
                <span class="data-summary-value">${dashboards}</span>
            </div>
        `;
    },

    updateTokenUsage() {
        elements.tokenUsage.textContent =
            `Tokens: ${state.totalInputTokens.toLocaleString()} in / ${state.totalOutputTokens.toLocaleString()} out`;
    },

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;

        const avatarSvg = role === 'assistant'
            ? `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
               </svg>`
            : `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
               </svg>`;

        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${avatarSvg}
            </div>
            <div class="message-content">
                <div class="message-text">
                    ${role === 'assistant' ? marked.parse(content) : escapeHtml(content)}
                </div>
            </div>
        `;

        elements.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        // Apply syntax highlighting to code blocks
        messageDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    },

    addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant-message';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
                </svg>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        elements.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    },

    removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    },

    scrollToBottom() {
        elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
    },

    clearChat() {
        // Keep only the welcome message
        const messages = elements.chatMessages.querySelectorAll('.message');
        messages.forEach((msg, index) => {
            if (index > 0) msg.remove();
        });
        state.conversationHistory = [];
    },

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message assistant-message';
        errorDiv.innerHTML = `
            <div class="message-avatar">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
                </svg>
            </div>
            <div class="message-content">
                <div class="error-message">${escapeHtml(message)}</div>
            </div>
        `;
        elements.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
    }
};

// Helper Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Handlers
async function handleSendMessage(e) {
    e.preventDefault();

    const question = elements.chatInput.value.trim();
    if (!question) return;

    // Clear input
    elements.chatInput.value = '';
    elements.chatInput.style.height = 'auto';

    // Add user message
    ui.addMessage('user', question);

    // Add to conversation history
    state.conversationHistory.push({
        role: 'user',
        content: question
    });

    // Show typing indicator
    ui.addTypingIndicator();
    elements.sendBtn.disabled = true;

    try {
        const result = await api.chat(
            question,
            state.selectedModel,
            state.selectedWorkspace,
            state.powerbiData,
            state.conversationHistory.slice(0, -1) // Exclude last message as it's part of the question
        );

        ui.removeTypingIndicator();

        if (result.success) {
            ui.addMessage('assistant', result.response);

            // Add to conversation history
            state.conversationHistory.push({
                role: 'assistant',
                content: result.response
            });

            // Update token usage
            state.totalInputTokens += result.usage.input_tokens;
            state.totalOutputTokens += result.usage.output_tokens;
            ui.updateTokenUsage();
        } else {
            ui.showError(result.error || 'An error occurred');
        }
    } catch (error) {
        ui.removeTypingIndicator();
        ui.showError('Failed to send message: ' + error.message);
    }

    elements.sendBtn.disabled = false;
}

async function handleConnect() {
    ui.showLoading('Connecting to Power BI...');

    try {
        const result = await api.getWorkspaces();

        if (result.success && result.workspaces.length > 0) {
            // Populate workspace dropdown
            elements.workspaceSelect.innerHTML = '<option value="">Select workspace...</option>';
            result.workspaces.forEach(ws => {
                const option = document.createElement('option');
                option.value = ws.id;
                option.textContent = ws.name;
                elements.workspaceSelect.appendChild(option);
            });

            elements.workspaceSection.style.display = 'block';
            ui.updateConnectionStatus(true);
            elements.connectBtn.style.display = 'none';
            elements.refreshBtn.style.display = 'block';
        } else if (result.success) {
            ui.showError('No workspaces found. Make sure you have access to at least one Power BI workspace.');
            ui.updateConnectionStatus(false);
        } else {
            ui.showError(result.error || 'Failed to connect to Power BI');
            ui.updateConnectionStatus(false, true);
        }
    } catch (error) {
        ui.showError('Connection failed: ' + error.message);
        ui.updateConnectionStatus(false, true);
    }

    ui.hideLoading();
}

async function handleWorkspaceChange(e) {
    const workspaceId = e.target.value;
    if (!workspaceId) {
        state.selectedWorkspace = null;
        state.powerbiData = null;
        ui.updateDataSummary(null);
        return;
    }

    ui.showLoading('Loading workspace data...');

    try {
        const result = await api.getWorkspaceData(workspaceId);

        if (result.success) {
            state.selectedWorkspace = workspaceId;
            state.powerbiData = result.data;
            ui.updateDataSummary(result.data);
        } else {
            ui.showError(result.error || 'Failed to load workspace data');
        }
    } catch (error) {
        ui.showError('Failed to load workspace: ' + error.message);
    }

    ui.hideLoading();
}

function handleQuickAction(action) {
    let question = '';

    switch (action) {
        case 'explain-schema':
            question = 'Can you explain the schema of my Power BI data? What tables, columns, and relationships exist?';
            break;
        case 'suggest-queries':
            question = 'Based on my data structure, what are some useful DAX queries I could run to get insights?';
            break;
        case 'find-insights':
            question = 'What potential insights or analysis opportunities do you see in my Power BI data?';
            break;
    }

    if (question) {
        elements.chatInput.value = question;
        elements.chatInput.focus();
    }
}

function handleInputResize() {
    elements.chatInput.style.height = 'auto';
    elements.chatInput.style.height = Math.min(elements.chatInput.scrollHeight, 150) + 'px';
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        elements.chatForm.dispatchEvent(new Event('submit'));
    }
}

// Initialize Application
async function init() {
    // Load available models
    try {
        const result = await api.getModels();
        if (result.success) {
            elements.modelSelect.innerHTML = '';
            result.models.forEach((model, index) => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                if (index === 0) {
                    option.selected = true;
                    state.selectedModel = model.id;
                }
                elements.modelSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load models:', error);
        elements.modelSelect.innerHTML = '<option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>';
        state.selectedModel = 'claude-sonnet-4-5-20250929';
    }

    // Check health
    try {
        const health = await api.healthCheck();
        console.log('Health check:', health);
    } catch (error) {
        console.error('Health check failed:', error);
    }

    // Event Listeners
    elements.chatForm.addEventListener('submit', handleSendMessage);
    elements.chatInput.addEventListener('input', handleInputResize);
    elements.chatInput.addEventListener('keydown', handleKeyDown);
    elements.connectBtn.addEventListener('click', handleConnect);
    elements.refreshBtn.addEventListener('click', handleConnect);
    elements.clearChatBtn.addEventListener('click', () => ui.clearChat());
    elements.modelSelect.addEventListener('change', (e) => {
        state.selectedModel = e.target.value;
    });
    elements.workspaceSelect.addEventListener('change', handleWorkspaceChange);

    // Quick actions
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleQuickAction(btn.dataset.action);
        });
    });
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
