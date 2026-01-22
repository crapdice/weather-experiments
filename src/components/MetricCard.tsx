"use client";

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  help?: string;
  accent?: 'primary' | 'secondary' | 'ro';
  subValues?: {
    high: string | number;
    low: string | number;
  };
}

export function MetricCard({ label, value, delta, help, accent = 'primary', subValues }: MetricCardProps) {
  const accentColor = accent === 'primary' ? 'var(--accent-1)' :
    accent === 'secondary' ? 'var(--accent-2)' :
      'var(--ro-line)';

  return (
    <div className="metric-card glass-panel" title={help}>
      <span className="metric-label">{label}</span>
      <div className="value-container">
        <div className="metric-value">{value}</div>
        {subValues && (
          <div className="sub-values">
            <div className="sub-value hgh">
              <span className="sub-label">H</span>
              <span className="sub-num">{subValues.high}</span>
            </div>
            <div className="sub-value low">
              <span className="sub-label">L</span>
              <span className="sub-num">{subValues.low}</span>
            </div>
          </div>
        )}
      </div>
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

        .metric-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
          font-weight: 700;
          word-break: break-word;
        }

        .value-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .metric-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: ${accentColor};
          white-space: nowrap;
        }

        .sub-values {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0px;
          line-height: 1;
        }

        .sub-value {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          font-family: monospace;
        }

        .sub-value.hgh { color: #ff4b2b; }
        .sub-value.low { color: #00d2ff; }

        .sub-label {
          opacity: 0.6;
          font-size: 0.6rem;
        }

        .metric-delta {
          font-size: 0.8rem;
          color: var(--text-secondary);
          word-break: break-word;
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
