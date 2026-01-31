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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kord-feedback-widget': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
