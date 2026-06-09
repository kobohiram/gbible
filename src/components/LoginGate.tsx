"use client";

import { useSession, signIn } from "next-auth/react";

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          この機能を使うにはログインが必要です。
        </p>
        <button
          type="button"
          onClick={() => signIn("google")}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Googleでログイン
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
