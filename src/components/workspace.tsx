"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  LoaderCircle,
  RefreshCw,
  Check,
  Pencil,
  Trash2,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getWorkspaceData } from "@/app/actions";
import { activity, type AttendanceRecord } from "@/lib/attendance";

export function useWorkspace() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getWorkspaceData>
  > | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [session, isPending, router]);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    getWorkspaceData()
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError("Data belum bisa dimuat. Periksa koneksi lalu coba lagi.");
      });
    return () => {
      active = false;
    };
  }, [userId, retry]);
  const reload = useCallback(async () => {
    const result = await getWorkspaceData();
    setData(result);
    setError("");
  }, []);
  return {
    data,
    session,
    loading: isPending || !session || !data,
    error,
    reload,
    retry: () => {
      setError("");
      setRetry((value) => value + 1);
    },
  };
}
export function WorkspaceState({
  error,
  retry,
}: {
  error?: string;
  retry?: () => void;
}) {
  return (
    <div className="page">
      <div className="loading-state" role={error ? "alert" : "status"}>
        {error ? (
          <>
            <AlertCircle style={{ animation: "none" }} />
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={retry}>
              <RefreshCw />
              Coba lagi
            </button>
          </>
        ) : (
          <>
            <LoaderCircle aria-hidden="true" />
            <p>Memuat catatan kerjamu…</p>
          </>
        )}
      </div>
    </div>
  );
}
export function StatusBadge({ record }: { record: AttendanceRecord }) {
  const status = activity(record);
  const Icon =
    status.className === "deleted"
      ? Trash2
      : status.className === "edited"
        ? Pencil
        : Check;
  return (
    <span className={`status ${status.className}`}>
      <Icon aria-hidden="true" />
      {status.label}
      {record.status === "draft" ? " · Draf" : ""}
    </span>
  );
}
