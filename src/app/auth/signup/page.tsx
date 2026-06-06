import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/app/auth/signup/signup-form";
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

export default async function SignupPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const nextPath = readNextPath(params.next);
  const user = await getCurrentUser();

  if (user) {
    redirect(nextPath || "/groups/new");
  }

  return (
    <main className={narrowPageShellClassName}>
      <SectionPanel className={narrowContentClassName} title="회원가입">
        <SignupForm nextPath={nextPath} />
        <p className="mt-4 text-sm text-zinc-600">
          이미 계정이 있다면{" "}
          <Link
            className="font-medium text-zinc-950 underline"
            href={`/auth/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
          >
            로그인
          </Link>
        </p>
      </SectionPanel>
    </main>
  );
}
