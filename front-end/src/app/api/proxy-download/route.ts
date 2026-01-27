import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url");
  const filename = searchParams.get("filename");

  if (!fileUrl || !filename) {
    return NextResponse.json(
      { error: "Missing url or filename" },
      { status: 400 }
    );
  }

  try {
    // Construct full URL for backend - use BACKEND_URL for server-to-server requests
    let fullUrl = fileUrl;
    if (fileUrl.startsWith('/')) {
      const backendBase = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
      fullUrl = `${backendBase}${fileUrl}`;
    }

    const res = await fetch(fullUrl);
    if (!res.ok) throw new Error(`File fetch failed: ${res.status} ${res.statusText}`);

    const buffer = await res.arrayBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to download file", detail: err.message },
      { status: 500 }
    );
  }
}
