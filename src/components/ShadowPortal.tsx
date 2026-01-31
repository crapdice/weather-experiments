"use client";

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ShadowPortalProps {
  children: React.ReactNode;
  id?: string;
}

/**
 * A component that creates a Shadow Root and portals its children into it.
 * This provides CSS isolation from the main document.
 */
export function ShadowPortal({ children, id = 'shadow-portal-root' }: ShadowPortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  // Use useLayoutEffect to ensure the container is ready before children are portaled
  // and to avoid the sync setState warning in useEffect.
  useEffect(() => {
    if (hostRef.current) {
      const shadowRoot = hostRef.current.shadowRoot || hostRef.current.attachShadow({ mode: 'open' });
      let shadowContainer = shadowRoot.querySelector(`#${id}`) as HTMLElement;
      if (!shadowContainer) {
        shadowContainer = document.createElement('div');
        shadowContainer.id = id;
        shadowRoot.appendChild(shadowContainer);
      }

      // Defer to avoid synchronous update during render cycle
      const rafId = requestAnimationFrame(() => {
        setContainer(shadowContainer);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [id]);

  return (
    <div ref={hostRef}>
      {container && createPortal(children, container)}
    </div>
  );
}
