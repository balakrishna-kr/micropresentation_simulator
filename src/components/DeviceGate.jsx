"use client";

import { useState, useEffect } from "react";

export default function DeviceGate({ children }) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // Run on mount
    checkDevice();

    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (!mounted) {
    // Hide content before mounting to prevent flash of content on load
    return <div style={{ opacity: 0 }}>{children}</div>;
  }

  if (isMobile) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          background: "radial-gradient(circle at center, #12132e 0%, #0a0b1a 100%)",
          color: "#f0f0f8",
          zIndex: 999999,
          padding: "2rem",
          textAlign: "center",
          overflow: "hidden",
          fontFamily: 'var(--font-geist-sans), "Inter", system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            width: "100%",
            padding: "3rem 2rem",
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(25px)",
            WebkitBackdropFilter: "blur(25px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow:
              "0 24px 50px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "80px",
              height: "80px",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "20px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "-10px",
                background: "rgba(255, 255, 255, 0.15)",
                filter: "blur(20px)",
                borderRadius: "50%",
                zIndex: -1,
              }}
            ></div>
            <span style={{ fontSize: "2.5rem", lineHeight: 1 }} role="img" aria-label="Laptop">
              💻
            </span>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#cbd5e1",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                backgroundColor: "#f87171",
                borderRadius: "50%",
              }}
            ></span>
            Desktop Required
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              lineHeight: 1.2,
              color: "#ffffff",
              margin: 0,
            }}
          >
            Laptop Only
          </h1>
          <p
            style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "#cbd5e1",
              fontWeight: 500,
              margin: 0,
            }}
          >
            This application is not compatible for phone or tablet, only for laptops.
          </p>
          <p
            style={{
              fontSize: "0.85rem",
              lineHeight: 1.5,
              color: "#94a3b8",
              margin: 0,
            }}
          >
            The simulator requires a larger screen, camera, and microphone to run the interactive speech and expression analysis.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
