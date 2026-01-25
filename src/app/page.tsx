"use client";

import { useEffect } from "react";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  useEffect(() => {
    // Dynamically import the custom element only on the client
    import("@/utils/UniversalFeedbackWidget");
  }, []);

  return (
    <>
      <Dashboard />
      <kord-feedback-widget />
    </>
  );
}

// Exhaustive JSX declarations for React 19 / Next.js
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'kord-feedback-widget': any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'kord-feedback-widget': any;
      }
    }
  }
}
