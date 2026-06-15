"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
    else setOk(true);
  }, [router]);

  if (!ok) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-sm text-gray-400">Chargement...</div>
    </div>
  );
  return <>{children}</>;
}
