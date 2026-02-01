"use client";

import React, { useEffect } from "react";
import { Dashboard } from "@/components/Dashboard";


export default function Home() {
  useEffect(() => {
    // Dynamically import the custom element only on the client
    import("@/utils/UniversalFeedbackWidget");
  }, []);

  return (
    <>
      <Dashboard />
      {React.createElement('kord-feedback-widget')}
    </>
  );
}
