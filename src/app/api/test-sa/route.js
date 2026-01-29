import { NextResponse } from "next/server";
import { getGoogleServiceAccount } from "../../../../lib/google-sa";

export async function GET() {
  const sa = getGoogleServiceAccount();

  // NEVER return private_key
  return NextResponse.json({
    ok: true,
    project_id: sa.project_id,
    client_email: sa.client_email,
  });
}
