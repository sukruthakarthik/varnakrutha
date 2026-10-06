"use client";

// Last-resort boundary when the root layout itself fails; must render its own <html>.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem", textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>Please refresh the page or try again later.</p>
        <button type="button" onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1.25rem" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
