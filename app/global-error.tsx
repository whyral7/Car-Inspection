"use client";

// Last resort when the root layout itself fails: plain HTML, no app styles guaranteed.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center", color: "#0b1220" }}>
        <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
        <p>Please try again in a minute.</p>
        <button onClick={reset} style={{ minHeight: 48, padding: "0 20px", borderRadius: 12, border: 0, background: "#115e59", color: "#fff", fontSize: 16, fontWeight: 600 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
