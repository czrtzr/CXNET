import { ImageResponse } from "next/og";
import { crestDataUri } from "@/lib/brand/crest";

// Home-screen icon for iOS. The crest in brass on a warm near-black tile; iOS
// rounds the corners itself.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const crest = crestDataUri("#b08d57");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#15120f",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={crest} width={96} height={120} alt="" />
      </div>
    ),
    { ...size },
  );
}
