"use client";

import React, { useState } from 'react';
import { ShadowPortal } from './ShadowPortal';
import { MessageSquare, X, Send } from 'lucide-react';

export function FeedbackForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback }),
        });
        if (res.ok) {
          setIsSubmitted(true);
          setTimeout(() => {
            setIsSubmitted(false);
            setFeedback('');
            setIsOpen(false);
          }, 3000);
        }
      } catch (err) {
        console.error("Communication failure", err);
      }
    }
  };

  return (
    <ShadowPortal id="feedback-form-root">
      <style>{`
        :host {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .feedback-trigger {
          width: 56px;
          height: 56px;
          border-radius: 28px;
          background: rgba(0, 210, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .feedback-trigger:hover {
          transform: scale(1.1);
          background: #00D2FF;
        }

        .feedback-container {
          position: absolute;
          bottom: 70px;
          right: 0;
          width: 320px;
          background: rgba(15, 20, 30, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          gap: 16px;
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          pointer-events: none;
          transition: all 0.3s ease;
        }

        .feedback-container.open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: all;
        }

        .feedback-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .feedback-header h2 {
          margin: 0;
          font-size: 1.1rem;
          color: #00D2FF;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .close-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .close-btn:hover {
          color: white;
        }

        textarea {
          width: 100%;
          min-height: 100px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          padding: 12px;
          font-family: inherit;
          font-size: 0.9rem;
          resize: none;
          box-sizing: border-box;
        }

        textarea:focus {
          outline: none;
          border-color: #00D2FF;
          background: rgba(255, 255, 255, 0.08);
        }

        .submit-btn {
          background: #00D2FF;
          color: #0B0E14;
          border: none;
          border-radius: 8px;
          padding: 10px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .submit-btn:hover {
          background: white;
          transform: translateY(-2px);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .success-message {
          text-align: center;
          color: #00F260;
          font-weight: bold;
          padding: 20px 0;
        }
      `}</style>

      <button
        className="feedback-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Feedback"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      <div className={`feedback-container ${isOpen ? 'open' : ''}`}>
        <div className="feedback-header">
          <h2>Intelligence Feed</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {isSubmitted ? (
          <div className="success-message">
            Transmission Received. Thank you.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <textarea
              placeholder="Report anomalies or suggest improvements..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
            />
            <button type="submit" className="submit-btn" disabled={!feedback.trim()}>
              <Send size={16} />
              Transmit
            </button>
          </form>
        )}
      </div>
    </ShadowPortal>
  );
}
