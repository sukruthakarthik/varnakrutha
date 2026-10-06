import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#f3eadf",
          color: "#222222",
          fontFamily: "serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 8, textTransform: "uppercase", color: "#9c4a2f" }}>
          Original Art
        </div>
        <div style={{ fontSize: 110, marginTop: 24 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 34, marginTop: 24, maxWidth: 900, color: "#3b2a20" }}>{siteConfig.tagline}</div>
      </div>
    ),
    size,
  );
}
