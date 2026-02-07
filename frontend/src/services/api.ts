/**
 * API service for Email-Manager frontend.
 * Handles all communication with the FastAPI backend.
 */

// Use relative path - works for packaged app (same origin) and dev server (with proxy)
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

// ============ Email APIs ============

import type { Email, OverviewData, UrgentDDL, SettingsConfig } from '@/types';

export interface SyncResult {
    success: boolean;
    message: string;
    emails_synced: number;
    emails_processed: number;
}

export interface TestConnectionResult {
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
}

/**
 * Get list of emails with optional filtering
 */
export async function fetchEmails(params?: {
    time_range?: string;
    priority?: string;
    is_archived?: boolean;
    limit?: number;
    offset?: number;
}): Promise<Email[]> {
    const searchParams = new URLSearchParams();
    if (params?.time_range) searchParams.set('time_range', params.time_range);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.is_archived !== undefined) searchParams.set('is_archived', String(params.is_archived));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const query = searchParams.toString();
    return fetchApi<Email[]>(`/emails${query ? `?${query}` : ''}`);
}

/**
 * Get a single email by ID
 */
export async function fetchEmail(id: string): Promise<Email> {
    return fetchApi<Email>(`/emails/${id}`);
}

/**
 * Sync emails from IMAP server
 */
export async function syncEmails(days: number = 7): Promise<SyncResult> {
    return fetchApi<SyncResult>(`/emails/sync?days=${days}`, {
        method: 'POST',
    });
}

/**
 * Mark an email as read
 */
export async function markAsRead(id: string): Promise<void> {
    await fetchApi(`/emails/${id}/read`, {
        method: 'PUT',
    });
}

/**
 * Archive an email
 */
export async function archiveEmail(id: string): Promise<void> {
    await fetchApi(`/emails/${id}/archive`, {
        method: 'PUT',
    });
}

/**
 * Unarchive an email
 */
export async function unarchiveEmail(id: string): Promise<void> {
    await fetchApi(`/emails/${id}/unarchive`, {
        method: 'PUT',
    });
}

/**
 * Delete an email
 */
export async function deleteEmail(id: string): Promise<void> {
    await fetchApi(`/emails/${id}`, {
        method: 'DELETE',
    });
}

// ============ Stats APIs ============

/**
 * Get overview statistics
 */
export async function fetchStats(timeRange: string = '本周'): Promise<OverviewData> {
    return fetchApi<OverviewData>(`/stats?time_range=${encodeURIComponent(timeRange)}`);
}

/**
 * Get urgent DDL items
 */
export async function fetchDDL(days: number = 7): Promise<UrgentDDL[]> {
    return fetchApi<UrgentDDL[]>(`/ddl?days=${days}`);
}

// ============ Settings APIs ============

/**
 * Get current settings
 */
export async function fetchSettings(): Promise<SettingsConfig> {
    const data = await fetchApi<Record<string, unknown>>('/settings');

    // Transform backend response to frontend format
    return {
        email: {
            imap_server: (data.email as Record<string, string>)?.imap_server || '',
            email: (data.email as Record<string, string>)?.email || '',
            password: (data.email as Record<string, string>)?.password || '',
        },
        ai_mode: ((data.ai as Record<string, unknown>)?.mode as 'local' | 'api' | 'hybrid') || 'hybrid',
        local: {
            model: ((data.ai as Record<string, Record<string, string>>)?.local?.model) || 'llama3.1:8b',
            host: ((data.ai as Record<string, Record<string, string>>)?.local?.host) || 'http://localhost:11434',
        },
        api: {
            provider: ((data.ai as Record<string, Record<string, string>>)?.api?.provider as 'openai' | 'anthropic') || 'openai',
            model: ((data.ai as Record<string, Record<string, string>>)?.api?.model) || 'gpt-4o-mini',
            key: ((data.ai as Record<string, Record<string, string>>)?.api?.key) || '',
        },
        hybrid: {
            local_model: ((data.ai as Record<string, Record<string, unknown>>)?.hybrid?.local_model as string) || 'llama3.1:8b',
            api_provider: ((data.ai as Record<string, Record<string, unknown>>)?.hybrid?.api_provider as 'openai' | 'anthropic') || 'openai',
            api_model: ((data.ai as Record<string, Record<string, unknown>>)?.hybrid?.api_model as string) || 'gpt-4o-mini',
            api_key: ((data.ai as Record<string, Record<string, unknown>>)?.hybrid?.api_key as string) || '',
            confirm_before_api: ((data.ai as Record<string, Record<string, unknown>>)?.hybrid?.confirm_before_api as boolean) ?? true,
        },
        theme: ((data.ui as Record<string, string>)?.theme as 'light' | 'dark') || 'light',
        language: ((data.ui as Record<string, string>)?.language as 'zh' | 'en') || 'zh',
    };
}

/**
 * Save settings
 */
export async function saveSettings(settings: Partial<SettingsConfig>): Promise<void> {
    // Transform frontend format to backend format
    const payload: Record<string, unknown> = {};

    if (settings.email) {
        payload.email = settings.email;
    }
    if (settings.ai_mode) {
        payload.ai_mode = settings.ai_mode;
    }
    if (settings.local) {
        payload.local = settings.local;
    }
    if (settings.api) {
        payload.api = settings.api;
    }
    if (settings.hybrid) {
        payload.hybrid = settings.hybrid;
    }
    if (settings.theme) {
        payload.theme = settings.theme;
    }
    if (settings.language) {
        payload.language = settings.language;
    }

    await fetchApi('/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

/**
 * Test IMAP connection
 */
export async function testIMAPConnection(): Promise<TestConnectionResult> {
    return fetchApi<TestConnectionResult>('/settings/test-imap', {
        method: 'POST',
    });
}

/**
 * Test local AI (Ollama) connection
 */
export async function testLocalAIConnection(): Promise<TestConnectionResult> {
    return fetchApi<TestConnectionResult>('/settings/test-ai-local', {
        method: 'POST',
    });
}

/**
 * Test cloud AI API connection
 */
export async function testAPIConnection(): Promise<TestConnectionResult> {
    return fetchApi<TestConnectionResult>('/settings/test-ai-api', {
        method: 'POST',
    });
}

// ============ API availability check ============

/**
 * Check if the backend API is available
 */
// Use relative URL to avoid hardcoded localhost issues
export async function checkApiHealth(): Promise<boolean> {
    try {
        const response = await fetch('/health');
        return response.ok;
    } catch {
        return false;
    }
}
