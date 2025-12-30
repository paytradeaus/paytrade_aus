let tempData: any = null; // Temporary in-memory storage

import { ApiResponse } from "@/shared/constant/messages";
import { NextResponse } from "next/server";

// Handle POST request
export async function POST(req: Request) {
  try {
    const body = await req.json();

    tempData = body; // Store data temporarily
    return NextResponse.json(
      { message: "Data saved", data: tempData, status: ApiResponse.SUCCESS },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid data", status: ApiResponse.ERROR },
      { status: 400 }
    );
  }
}

// Handle GET request
export async function GET(req: any) {
  return NextResponse.json(
    { data: tempData, status: ApiResponse.SUCCESS },
    { status: 200 }
  );
}
