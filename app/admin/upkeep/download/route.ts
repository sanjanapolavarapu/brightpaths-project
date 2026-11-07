import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resolveBackup } from "@/lib/db";

export async function GET(request: Request) {
  await requireAdmin();
  const name = new URL(request.url).searchParams.get("file") ?? "";
  const full = resolveBackup(name);
  if (!full) return new NextResponse("That copy was not found.", { status: 404 });
  const bytes = await readFile(full);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
