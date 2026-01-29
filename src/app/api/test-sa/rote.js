import { NextResponse } from "next/server";
import { getGoogleServiceAccount } from "@/lib/googleServiceAccount";

export async function GET() {
  const sa = getGoogleServiceAccount();

  // Return only safe fields (never return private_key)
  return NextResponse.json({
    ok: true,
    project_id: sa.project_id,
    client_email: sa.client_email,
  });
}
