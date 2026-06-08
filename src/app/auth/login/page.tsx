import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/auth/login/login-form";
import {
  SectionPanel,
  narrowContentClassName,
  narrowPageShellClassName,
} from "@/components/ui";
import { getCurrentUser } from "@/server/auth-context";

type AuthPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

function readNextPath(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return "";
  }
  return path;
}

export default async function LoginPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const nextPath = readNextPath(params.next);
  const user = await getCurrentUser();

  if (user) {
    redirect(nextPath || "/");
  }

  return (
    <main className={narrowPageShellClassName}>
      <SectionPanel className={narrowContentClassName} title="로그인">
        <LoginForm nextPath={nextPath} />
        <p className="mt-4 text-sm text-slate-600">
          계정이 없다면{" "}
          <Link
            className="font-medium text-slate-950 underline decoration-slate-300 underline-offset-4 transition hover:text-teal-800"
            href={`/auth/signup${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
          >
            회원가입
          </Link>
        </p>
      </SectionPanel>
    </main>
  );
}
