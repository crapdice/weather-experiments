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

  useEffect(() => {
    if (hostRef.current) {
      // Create shadow root if it doesn't exist
      const shadowRoot = hostRef.current.shadowRoot || hostRef.current.attachShadow({ mode: 'open' });
      
      // Create a container inside the shadow root to portal into
      let shadowContainer = shadowRoot.querySelector(`#${id}`) as HTMLElement;
      if (!shadowContainer) {
        shadowContainer = document.createElement('div');
        shadowContainer.id = id;
        shadowRoot.appendChild(shadowContainer);
      }
      
      setContainer(shadowContainer);
    }
  }, [id]);

  return (
    <div ref={hostRef}>
      {container && createPortal(children, container)}
    </div>
  );
}
