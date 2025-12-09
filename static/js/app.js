/**
 * Power BI Data Chat - Simple data analysis with Claude
 */

// Application State
const state = {
    selectedModel: 'claude-sonnet-4-5-20250929',
    parsedData: null,
    conversationHistory: [],
    totalInputTokens: 0,
    totalOutputTokens: 0
};

// DOM Elements
const elements = {
    modelSelect: document.getElementById('model-select'),
    dataInput: document.getElementById('data-input'),
    parseBtn: document.getElementById('parse-btn'),
    clearDataBtn: document.getElementById('clear-data-btn'),
    dataSummarySection: document.getElementById('data-summary-section'),
    dataSummary: document.getElementById('data-summary'),
    quickActionsSection: document.getElementById('quick-actions-section'),
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
    async parseData(text) {
        const response = await fetch('/api/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, type: 'auto' })
        });
        return response.json();
    },

    async chat(question, model, parsedData, conversationHistory) {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                model,
                parsed_data: parsedData,
                conversation_history: conversationHistory
            })
        });
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

    updateDataSummary(data) {
        if (!data || data.error) {
            elements.dataSummarySection.style.display = 'none';
            elements.quickActionsSection.style.display = 'none';
            return;
        }

        elements.dataSummarySection.style.display = 'block';
        elements.quickActionsSection.style.display = 'block';

        const columns = data.columns?.length || 0;
        const rows = data.row_count || 0;

        elements.dataSummary.innerHTML = `
            <div class="data-summary-item">
                <span class="data-summary-label">Columns</span>
                <span class="data-summary-value">${columns}</span>
            </div>
            <div class="data-summary-item">
                <span class="data-summary-label">Rows</span>
                <span class="data-summary-value">${rows}</span>
            </div>
            <div class="data-summary-item" style="flex-direction: column; align-items: flex-start;">
                <span class="data-summary-label" style="margin-bottom: 4px;">Fields:</span>
                <span class="data-summary-value" style="font-size: 11px; word-break: break-word;">
                    ${data.columns?.slice(0, 5).join(', ')}${data.columns?.length > 5 ? '...' : ''}
                </span>
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

        // Apply syntax highlighting
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
        if (indicator) indicator.remove();
    },

    scrollToBottom() {
        elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
    },

    clearChat() {
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
    },

    showSuccess(message) {
        ui.addMessage('assistant', message);
    }
};

// Helper Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Handlers
async function handleParseData() {
    const text = elements.dataInput.value.trim();
    if (!text) {
        ui.showError('Please paste some data first');
        return;
    }

    ui.showLoading('Parsing data...');

    try {
        const result = await api.parseData(text);

        if (result.success && result.data && !result.data.error) {
            state.parsedData = result.data;
            ui.updateDataSummary(result.data);
            ui.showSuccess(`Data loaded successfully! Found **${result.data.row_count} rows** and **${result.data.columns.length} columns**. You can now ask questions about your data.`);
        } else {
            ui.showError(result.data?.error || result.error || 'Could not parse the data. Try copying it again.');
        }
    } catch (error) {
        ui.showError('Failed to parse data: ' + error.message);
    }

    ui.hideLoading();
}

function handleClearData() {
    elements.dataInput.value = '';
    state.parsedData = null;
    ui.updateDataSummary(null);
}

async function handleSendMessage(e) {
    e.preventDefault();

    const question = elements.chatInput.value.trim();
    if (!question) return;

    elements.chatInput.value = '';
    elements.chatInput.style.height = 'auto';

    ui.addMessage('user', question);

    state.conversationHistory.push({
        role: 'user',
        content: question
    });

    ui.addTypingIndicator();
    elements.sendBtn.disabled = true;

    try {
        const result = await api.chat(
            question,
            state.selectedModel,
            state.parsedData,
            state.conversationHistory.slice(0, -1)
        );

        ui.removeTypingIndicator();

        if (result.success) {
            ui.addMessage('assistant', result.response);

            state.conversationHistory.push({
                role: 'assistant',
                content: result.response
            });

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

function handleQuickAction(action) {
    let question = '';

    switch (action) {
        case 'summarize':
            question = 'Please summarize this data. What are the key statistics and what does this data represent?';
            break;
        case 'insights':
            question = 'What patterns, trends, or interesting insights can you find in this data?';
            break;
        case 'issues':
            question = 'Are there any data quality issues, missing values, or anomalies in this data?';
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

// Initialize
function init() {
    // Event Listeners
    elements.chatForm.addEventListener('submit', handleSendMessage);
    elements.chatInput.addEventListener('input', handleInputResize);
    elements.chatInput.addEventListener('keydown', handleKeyDown);
    elements.parseBtn.addEventListener('click', handleParseData);
    elements.clearDataBtn.addEventListener('click', handleClearData);
    elements.clearChatBtn.addEventListener('click', () => ui.clearChat());
    elements.modelSelect.addEventListener('change', (e) => {
        state.selectedModel = e.target.value;
    });

    // Quick actions
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleQuickAction(btn.dataset.action);
        });
    });

    // Allow paste directly into data textarea
    elements.dataInput.addEventListener('paste', (e) => {
        // Let the paste happen, then auto-parse after a short delay
        setTimeout(() => {
            if (elements.dataInput.value.trim()) {
                handleParseData();
            }
        }, 100);
    });
}

document.addEventListener('DOMContentLoaded', init);
