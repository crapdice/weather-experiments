'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/context/AdminContext';
import { Terminal, Clock, MapPin, Cpu, ChevronDown, ChevronUp, Database } from 'lucide-react';

interface AILog {
    id: string;
    created_at: string;
    city_name: string;
    model_id: string;
    response_text: any;
    processing_time_ms: number;
    token_usage_total: number;
    status: string;
}

export function AILogsView() {
    const { isAdmin } = useAdmin();
    const [logs, setLogs] = useState<AILog[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    useEffect(() => {
        if (isAdmin) {
            fetchLogs();
        }
    }, [isAdmin]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/logs?limit=50');
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) return null;

    return (
        <div className="ai-logs-container glass-panel">
            <div className="view-header">
                <div className="title-area">
                    <Terminal size={20} className="icon-pulse" />
                    <h2>Intelligence Feed</h2>
                    <span className="log-count">{logs.length} Recent Transmissions</span>
                </div>
                <button onClick={fetchLogs} className="refresh-btn">
                    Sync Archives
                </button>
            </div>

            {loading ? (
                <div className="loading-state">Decrypting neural logs...</div>
            ) : (
                <div className="logs-list">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className={`log-item ${expandedLog === log.id ? 'expanded' : ''}`}
                        >
                            <div
                                className="log-summary"
                                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            >
                                <div className="log-meta">
                                    <span className="timestamp">
                                        <Clock size={12} />
                                        {new Date(log.created_at).toLocaleTimeString()}
                                    </span>
                                    <span className="city">
                                        <MapPin size={12} />
                                        {log.city_name}
                                    </span>
                                    <span className="model">
                                        <Cpu size={12} />
                                        {log.model_id}
                                    </span>
                                </div>
                                <div className="log-metrics">
                                    <span>{log.processing_time_ms}ms</span>
                                    <span className="toggle">
                                        {expandedLog === log.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </span>
                                </div>
                            </div>

                            {expandedLog === log.id && (
                                <div className="log-details">
                                    <div className="response-preview">
                                        <div className="response-header">
                                            <span className="label">Forensic Headline:</span>
                                            <h4 className="log-headline">{log.response_text?.headline || 'STATION_ID_UNAVAILABLE'}</h4>
                                        </div>
                                        <div className="response-body">
                                            <span className="label">Analytical Narrative:</span>
                                            <p className="log-analysis">{log.response_text?.analysis || (typeof log.response_text === 'string' ? log.response_text : JSON.stringify(log.response_text))}</p>
                                        </div>
                                    </div>
                                    <div className="raw-data">
                                        <h4>Metadata:</h4>
                                        <pre>{JSON.stringify({
                                            tokens: log.token_usage_total,
                                            status: log.status,
                                            id: log.id
                                        }, null, 2)}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .ai-logs-container {
                    margin-top: 24px;
                    padding: 20px;
                    background: rgba(10, 15, 25, 0.7);
                    border: 1px solid rgba(0, 210, 255, 0.3);
                    border-radius: 12px;
                }
                .view-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .title-area {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .title-area h2 {
                    font-size: 1.1rem;
                    color: var(--accent-1);
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .log-count {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    background: rgba(255, 255, 255, 0.05);
                    padding: 2px 8px;
                    border-radius: 10px;
                }
                .refresh-btn {
                    background: transparent;
                    border: 1px solid var(--accent-1);
                    color: var(--accent-1);
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .refresh-btn:hover {
                    background: rgba(0, 210, 255, 0.1);
                }
                .loading-state {
                    padding: 40px;
                    text-align: center;
                    color: var(--text-secondary);
                    font-style: italic;
                }
                .logs-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    max-height: 500px;
                    overflow-y: auto;
                    padding-right: 8px;
                }
                .log-item {
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.02);
                    transition: all 0.2s;
                }
                .log-item:hover {
                    background: rgba(255, 255, 255, 0.04);
                    border-color: rgba(0, 210, 255, 0.2);
                }
                .log-item.expanded {
                    background: rgba(0, 210, 255, 0.03);
                    border-color: rgba(0, 210, 255, 0.4);
                }
                .log-summary {
                    padding: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                }
                .log-meta {
                    display: flex;
                    gap: 16px;
                    font-size: 0.8rem;
                }
                .timestamp, .city, .model {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: var(--text-secondary);
                }
                .log-metrics {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }
                .log-details {
                    padding: 16px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    animation: slideDown 0.3s ease-out;
                }
                .response-preview {
                    margin-bottom: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .label {
                    display: block;
                    font-size: 0.65rem;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 4px;
                    opacity: 0.7;
                }
                .log-headline {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #fff;
                    margin: 0;
                    line-height: 1.2;
                }
                .log-analysis {
                    font-size: 0.95rem;
                    line-height: 1.6;
                    color: var(--text-primary);
                    margin: 0;
                }
                .raw-data pre {
                    font-size: 0.75rem;
                    background: rgba(0,0,0,0.3);
                    padding: 8px;
                    border-radius: 4px;
                    color: var(--text-secondary);
                    overflow-x: auto;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes icon-pulse {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
                .icon-pulse {
                    color: var(--accent-1);
                    animation: icon-pulse 2s infinite;
                }
            `}</style>
        </div>
    );
}
