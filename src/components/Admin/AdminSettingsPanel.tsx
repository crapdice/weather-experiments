'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAdmin } from '@/context/AdminContext';
import { Settings, Save, X } from 'lucide-react';

export function AdminSettingsPanel() {
    const { isAdmin } = useAdmin();
    const [isOpen, setIsOpen] = useState(false);
    const [weeks, setWeeks] = useState(2);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && isAdmin) {
            setLoading(true);
            fetch('/api/admin/settings')
                .then(res => {
                    if (!res.ok) throw new Error('Network response was not ok');
                    return res.text(); // Read as text first
                })
                .then(text => {
                    if (!text) return {}; // Handle empty response
                    return JSON.parse(text);
                })
                .then(data => {
                    if (data && typeof data.publicApiWeeks === 'number') {
                        setWeeks(data.publicApiWeeks);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch settings:", err);
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen, isAdmin]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weeks: Number(weeks) })
            });
            if (res.ok) {
                alert('Settings saved!');
                setIsOpen(false);
            } else {
                alert('Failed to save settings.');
            }
        } catch (e) {
            alert('Error saving settings.');
        } finally {
            setSaving(false);
        }
    };

    if (!isAdmin) return null;

    return (
        <React.Fragment>
            <button
                className="admin-settings-btn"
                onClick={() => setIsOpen(true)}
                title="Admin Settings"
            >
                <Settings size={16} />
                API Config
            </button>

            {isOpen && createPortal(
                <div className="admin-modal-overlay">
                    <div className="admin-modal glass-panel">
                        <div className="modal-header">
                            <h2>Admin Configuration</h2>
                            <button onClick={() => setIsOpen(false)} className="close-btn"><X size={20} /></button>
                        </div>

                        <div className="modal-body">
                            <div className="setting-group">
                                <label>Public API Data Limit (Weeks)</label>
                                <p className="description">Determine how much historical data is exposed via /api/public/weather.</p>
                                <div className="input-row">
                                    <input
                                        type="number"
                                        min="1"
                                        max="52"
                                        value={weeks}
                                        onChange={(e) => setWeeks(Number(e.target.value))}
                                    />
                                    <span>Allows {(weeks * 7)} days of history</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="save-btn" onClick={handleSave} disabled={saving || loading}>
                                <Save size={16} />
                                {saving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style jsx>{`
                .admin-settings-btn {
                    background: transparent;
                    border: 1px solid var(--accent-1);
                    color: var(--accent-1);
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 10px;
                    width: 100%;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .admin-settings-btn:hover {
                    background: var(--accent-1);
                    color: var(--bg-page);
                }

                .admin-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.8);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }

                .admin-modal {
                    width: 100%;
                    max-width: 500px;
                    background: #0B0E14;
                    padding: 24px;
                    border: 1px solid var(--accent-1);
                    box-shadow: 0 0 40px rgba(0, 210, 255, 0.2);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    border-bottom: 1px solid var(--border-subtle);
                    padding-bottom: 12px;
                }

                .modal-header h2 {
                    font-size: 1.2rem;
                    color: var(--accent-1);
                    margin: 0;
                }

                .close-btn {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                }
                .close-btn:hover { color: var(--text-primary); }

                .setting-group {
                    margin-bottom: 24px;
                }

                .setting-group label {
                    display: block;
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: var(--text-primary);
                }

                .description {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin-bottom: 12px;
                }

                .input-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                input[type="number"] {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--border-subtle);
                    color: var(--text-primary);
                    padding: 8px;
                    border-radius: 4px;
                    width: 80px;
                    font-size: 1rem;
                }

                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    padding-top: 12px;
                }

                .save-btn {
                    background: var(--accent-1);
                    color: var(--bg-page);
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .save-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </React.Fragment>
    );
}
