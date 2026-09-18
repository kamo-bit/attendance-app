import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="page">
      <section className="panel empty-state">
        <Compass />
        <h1>Halaman tidak ditemukan</h1>
        <p>
          Halaman ini mungkin sudah dipindahkan. Kembali ke catatan kerjamu
          untuk melanjutkan.
        </p>
        <Link className="btn btn-primary" href="/">
          Kembali ke Absensi
        </Link>
      </section>
    </div>
  );
}
