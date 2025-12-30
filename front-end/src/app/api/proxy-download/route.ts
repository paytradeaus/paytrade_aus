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
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error("File fetch failed");

    const buffer = await res.arrayBuffer();
    return new NextResponse(Buffer.from(buffer), {
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
