import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");
  if (!data || data.length > 2048) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const size = Math.min(512, Math.max(64, Number(searchParams.get("size") ?? 160)));
  const download = searchParams.get("download") === "1";
  const filename = searchParams.get("filename") ?? "qr-code.png";

  const buffer = await QRCode.toBuffer(data, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#111111", light: "#FFFFFF" },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
      ...(download && {
        "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
      }),
    },
  });
}
