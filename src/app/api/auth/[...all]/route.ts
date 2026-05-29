import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  try {
    console.log("AUTH GET REQUEST:", request.url);
    return await handler.GET(request);
  } catch (error) {
    console.error("SERVER ERROR IN AUTH GET:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log("AUTH POST REQUEST:", request.url);
    return await handler.POST(request);
  } catch (error) {
    console.error("SERVER ERROR IN AUTH POST:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
