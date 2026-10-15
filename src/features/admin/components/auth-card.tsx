import Link from "next/link";
import { Wordmark } from "@/components/common/wordmark";

/** The centred card used by the sign-in, forgot-password and set-password screens. */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 rounded-sm border border-border bg-background p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <Link href="/" className="font-serif text-2xl">
            <Wordmark />
          </Link>
          <h1 className="font-sans text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{title}</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
