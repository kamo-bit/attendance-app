"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page">
      <section className="panel empty-state" role="alert">
        <AlertCircle />
        <h1>Halaman belum bisa dimuat</h1>
        <p>
          Coba muat ulang halaman. Catatan yang sudah tersimpan tetap tersedia.
        </p>
        <button className="btn btn-primary" onClick={reset}>
          <RefreshCw />
          Coba lagi
        </button>
      </section>
    </div>
  );
}
