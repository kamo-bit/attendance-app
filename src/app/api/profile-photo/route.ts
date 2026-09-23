import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profilePhotos, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { MAX_PROFILE_PHOTO_BYTES, normalizeProfilePhoto, ProfilePhotoError } from "@/lib/profile-photo";

export const runtime = "nodejs";
export const maxDuration = 30;

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Vary": "Cookie",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
};

function failure(error: unknown) {
  if (error instanceof ProfilePhotoError) {
    return Response.json({ error: error.message }, { status: error.status, headers: privateHeaders });
  }
  // Do not include uploaded content, account data, or database details in logs/responses.
  console.error("Profile photo request failed.");
  return Response.json({ error: "Foto belum bisa diproses. Silakan coba lagi." }, { status: 500, headers: privateHeaders });
}

async function userId(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } });
  if (!session?.user) throw new ProfilePhotoError("Sesi berakhir. Silakan masuk kembali.", 401);
  return session.user.id;
}

function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    throw new ProfilePhotoError("Permintaan unggah tidak valid. Muat ulang halaman lalu coba lagi.", 403);
  }
}

async function readUpload(request: Request) {
  const declaredSize = Number(request.headers.get("content-length"));
  if (declaredSize > MAX_PROFILE_PHOTO_BYTES) {
    throw new ProfilePhotoError("Ukuran foto maksimal 2 MB.", 413);
  }
  if (!request.body) throw new ProfilePhotoError("Pilih gambar terlebih dahulu.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PROFILE_PHOTO_BYTES) {
        await reader.cancel();
        throw new ProfilePhotoError("Ukuran foto maksimal 2 MB.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) throw new ProfilePhotoError("File gambar kosong. Pilih gambar lain.");
  // Decode actual bytes rather than trusting a file name or a browser's MIME type.
  return Buffer.concat(chunks, size);
}

function imageResponse(data: Uint8Array) {
  return new Response(new Uint8Array(data), {
    headers: { ...privateHeaders, "Content-Type": "image/webp", "Content-Disposition": 'inline; filename="foto-profil.webp"' },
  });
}

// Private endpoint: only the signed-in user's image can be read, regardless of query parameters.
export async function GET(request: Request) {
  try {
    const id = await userId(request);
    const [photo] = await db.select().from(profilePhotos).where(eq(profilePhotos.userId, id)).limit(1);
    const version = new URL(request.url).searchParams.get("v");
    if (!photo || (version && version !== photo.version)) {
      throw new ProfilePhotoError("Foto profil tidak ditemukan.", 404);
    }
    return imageResponse(photo.data);
  } catch (error) { return failure(error); }
}

// A preview is normalized on the server so HEIC and TIFF also work in all supported browsers.
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await userId(request);
    const photo = await normalizeProfilePhoto(await readUpload(request));
    return imageResponse(photo);
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const id = await userId(request);
    const data = await normalizeProfilePhoto(await readUpload(request));
    // A password change/logout during decoding must also revoke this write.
    if (await userId(request) !== id) throw new ProfilePhotoError("Sesi berakhir. Silakan masuk kembali.", 401);
    const version = randomUUID();
    const image = `/api/profile-photo?v=${version}`;
    const updatedAt = new Date();
    // LibSQL batch is atomic: the photo and the session's image URL change together.
    await db.batch([
      db.insert(profilePhotos).values({ userId: id, data, version, updatedAt })
        .onConflictDoUpdate({ target: profilePhotos.userId, set: { data, version, updatedAt } }),
      db.update(users).set({ image, updatedAt }).where(eq(users.id, id)),
    ]);
    return Response.json({ image }, { headers: privateHeaders });
  } catch (error) { return failure(error); }
}
