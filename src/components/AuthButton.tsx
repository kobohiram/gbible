"use client";

import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name ?? ""}
            width={28}
            height={28}
            className="rounded-full"
          />
        )}
        <button
          type="button"
          onClick={() => signOut()}
          className="text-xs text-primary-foreground/75 hover:text-primary-foreground"
        >
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signIn("google")}
      className="rounded-md bg-primary-foreground/15 px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary-foreground/25"
    >
      Googleでログイン
    </button>
  );
}
