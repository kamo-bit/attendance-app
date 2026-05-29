import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  try {
    return await handler.GET(request);
  } catch (error) {
    console.error("[AUTH GET ERROR]", error);
    return Response.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await handler.POST(request);
  } catch (error) {
    console.error("[AUTH POST ERROR]", error);
    return Response.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}
