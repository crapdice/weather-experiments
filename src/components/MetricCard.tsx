"use client";

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  help?: string;
  accent?: 'primary' | 'secondary' | 'ro';
}

export function MetricCard({ label, value, delta, help, accent = 'primary' }: MetricCardProps) {
  const accentColor = accent === 'primary' ? 'var(--accent-1)' :
    accent === 'secondary' ? 'var(--accent-2)' :
      'var(--ro-line)';

  return (
    <div className="metric-card glass-panel" title={help}>
      <span className="metric-label">{label}</span>
      <div className="metric-value">{value}</div>
      {delta && <div className="metric-delta">{delta}</div>}

      <style jsx>{`
        .metric-card {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: transform 0.2s ease;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          border-color: ${accentColor};
        }

          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
          font-weight: 700;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: ${accentColor};
        }

        .metric-delta {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .metric-card {
            padding: 12px;
            gap: 4px;
          }
          .metric-value {
            font-size: 1.25rem;
          }
          .metric-label {
            font-size: 0.65rem;
          }
          .metric-delta {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
}
