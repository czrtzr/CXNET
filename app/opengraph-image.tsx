import { ImageResponse } from "next/og";
import { crestDataUri } from "@/lib/brand/crest";

// Social preview for shared invite links. Dark luxury: the crest over the
// wordmark inside an engraved brass frame. No webfont is loaded, so the wordmark
// rides on wide tracking rather than the brand serif (which the crest carries).
export const alt = "CXNET, a private wealth command center";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const crest = crestDataUri("#b08d57");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0a0807",
          padding: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            border: "1px solid rgba(176, 141, 87, 0.3)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={crest} width={150} height={188} alt="" />
          <div
            style={{
              display: "flex",
              marginTop: 36,
              fontSize: 86,
              letterSpacing: 18,
              color: "#f1ece4",
            }}
          >
            CXNET
          </div>
          <div
            style={{
              display: "flex",
              width: 120,
              height: 1,
              marginTop: 28,
              background: "#b08d57",
              opacity: 0.7,
            }}
          />
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 30,
              letterSpacing: 2,
              color: "rgba(241, 236, 228, 0.55)",
            }}
          >
            A private wealth command center
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
