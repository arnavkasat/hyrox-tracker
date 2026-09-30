import { LoginForm } from "./login-form";
import { QuoteCard } from "@/components/ios/quote-card";
import { today as todayIn } from "@/lib/date";

const ERRORS: Record<string, string> = {
  not_allowed: "That account can't sign in to this app.",
  link: "That link didn't work. Request a new one.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;
  const initialError = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="flex min-h-full flex-col justify-center px-6 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-sm space-y-8">
        <div className="space-y-1.5 text-center">
          <div className="surface mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl">
            <span className="brand-text text-[32px] leading-none font-bold">H</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight">Hyrox Tracker</h1>
          <p className="text-[15px] text-muted-foreground">
            Sign in with a magic link to your email.
          </p>
        </div>

        <LoginForm initialError={initialError} />

        <QuoteCard date={todayIn()} />
      </div>
    </main>
  );
}
