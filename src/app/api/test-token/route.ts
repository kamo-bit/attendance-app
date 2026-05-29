import { NextResponse } from "next/server";
import { developmentResetLinks } from "@/lib/auth";
import { db } from "@/db";
import { verifications } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const links = Array.from(developmentResetLinks.entries());
  
  const dbVerifs = await db.query.verifications.findMany({
    orderBy: [desc(verifications.createdAt)],
    limit: 5
  });
  
  return NextResponse.json({
    links,
    dbVerifs
  });
}
