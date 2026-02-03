export async function GET() {
  return Response.json(
    {
      ok: false,
            error: "This diagnostic route has been removed.",
    },
    { status: 410 }
  );
}