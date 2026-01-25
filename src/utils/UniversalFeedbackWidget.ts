"use client";

/**
 * UniversalFeedbackWidget (V2)
 * A framework-agnostic feedback widget built with Native Web Components and Shadow DOM.
 * Supports style isolation and developer theming via ::part() selectors.
 */
class UniversalFeedbackWidget extends HTMLElement {
  private _isOpen = false;
  private _shadowRoot: ShadowRoot;

  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  set isOpen(value: boolean) {
    this._isOpen = value;
    this.updateUI();
  }

  get isOpen() {
    return this._isOpen;
  }

  private updateUI() {
    const container = this._shadowRoot.querySelector('.feedback-container');
    const trigger = this._shadowRoot.querySelector('.feedback-trigger');
    if (container && trigger) {
      if (this._isOpen) {
        container.classList.add('open');
        trigger.innerHTML = this.getCloseIcon();
      } else {
        container.classList.remove('open');
        trigger.innerHTML = this.getMessageIcon();
      }
    }
  }

  private getMessageIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
  }

  private getCloseIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  }

  private render() {
    this._shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          --primary-color: #00D2FF;
          --bg-color: rgba(15, 20, 30, 0.85);
          --text-color: #ffffff;
        }

        .feedback-trigger {
          width: 56px;
          height: 56px;
          border-radius: 28px;
          background: var(--primary-color);
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
          filter: brightness(1.1);
        }

        .feedback-container {
          position: absolute;
          bottom: 70px;
          right: 0;
          width: 320px;
          background: var(--bg-color);
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
          color: var(--primary-color);
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
          color: var(--text-color);
          padding: 12px;
          font-family: inherit;
          font-size: 0.9rem;
          resize: none;
          box-sizing: border-box;
        }

        textarea:focus {
          outline: none;
          border-color: var(--primary-color);
          background: rgba(255, 255, 255, 0.08);
        }

        .submit-btn {
          background: var(--primary-color);
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
          filter: brightness(1.1);
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
          display: none;
        }

        .success .success-message {
          display: block;
        }

        .success form, .success .feedback-header {
          display: none;
        }
      </style>

      <button class="feedback-trigger" part="trigger" aria-label="Feedback">
        ${this.getMessageIcon()}
      </button>

      <div class="feedback-container" part="panel">
        <div class="feedback-header" part="header">
          <h2>Intelligence Feed</h2>
          <button class="close-btn" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="success-message" part="success">
          Transmission Received. Thank you.
        </div>

        <form>
          <textarea
            part="textarea"
            placeholder="Report anomalies or suggest improvements..."
            required
          ></textarea>
          <button type="submit" class="submit-btn" part="submit">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            Transmit
          </button>
        </form>
      </div>
    `;

    this._shadowRoot.querySelector('.feedback-trigger')?.addEventListener('click', () => {
      this.isOpen = !this.isOpen;
    });

    this._shadowRoot.querySelector('.close-btn')?.addEventListener('click', () => {
      this.isOpen = false;
    });

    const form = this._shadowRoot.querySelector('form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const textarea = this._shadowRoot.querySelector('textarea');
      if (textarea?.value.trim()) {
        try {
          const res = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback: textarea.value }),
          });

          if (res.ok) {
            const container = this._shadowRoot.querySelector('.feedback-container');
            container?.classList.add('success');
            setTimeout(() => {
              container?.classList.remove('success');
              textarea.value = '';
              this.isOpen = false;
            }, 3000);
          }
        } catch (err) {
          console.error("Transmission error");
        }
      }
    });
  }
}

// Define the custom element if in a browser environment
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  if (!customElements.get('kord-feedback-widget')) {
    customElements.define('kord-feedback-widget', UniversalFeedbackWidget);
  }

  // Auto-injection logic: check if tag exists, if not, append to body
  const injectWidget = () => {
    if (!document.querySelector('kord-feedback-widget')) {
      const widget = document.createElement('kord-feedback-widget');
      document.body.appendChild(widget);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWidget);
  } else {
    injectWidget();
  }
}

export default UniversalFeedbackWidget;
