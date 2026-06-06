import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { getCurrentMember, getCurrentUser } from "@/server/auth-context";
import { isAdminUser } from "@/server/admin";
import {
  contentShellClassName,
  mutedButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";

const baseNavItems = [
  { href: "/", label: "대시보드" },
  { href: "/calendar", label: "가능 시간" },
  { href: "/schedules", label: "일정" },
  { href: "/members", label: "공대원" },
  { href: "/templates", label: "템플릿" },
  { href: "/notifications", label: "알림" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-900"
      href={href}
    >
      {label}
    </Link>
  );
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  const user = await getCurrentUser();
  const isAdmin = isAdminUser(user);
  const memberNavItems =
    member?.role === "LEADER"
      ? [...baseNavItems, { href: "/settings", label: "공대 설정" }]
      : baseNavItems;
  const navItems = isAdmin
    ? [...memberNavItems, { href: "/admin", label: "관리자" }]
    : memberNavItems;

  return (
    <div className="min-h-screen text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className={`${contentShellClassName} py-3`}>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="flex min-w-fit items-center gap-2 font-semibold" href="/">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-700 text-sm text-white">
                LA
              </span>
              <span>로스트아크 공대관리</span>
            </Link>
            {member ? (
              <>
                <nav className="-mx-1 order-3 flex w-full gap-1 overflow-x-auto px-1 pb-1 sm:order-none sm:w-auto sm:flex-1 sm:pb-0">
                  {navItems.map((item) => (
                    <NavLink href={item.href} key={item.href} label={item.label} />
                  ))}
                </nav>
                <div className="ml-auto hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 sm:block">
                  {member.group.name}
                </div>
                <form action={logoutAction}>
                  <button className={mutedButtonClassName}>
                    로그아웃
                  </button>
                </form>
              </>
            ) : (
              <nav className="ml-auto flex items-center gap-2 text-sm text-slate-600">
                {user ? (
                  <>
                    <Link className={secondaryButtonClassName} href="/groups/new">
                      새 공대 만들기
                    </Link>
                    <form action={logoutAction}>
                      <button className={mutedButtonClassName}>
                        로그아웃
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link className={mutedButtonClassName} href="/auth/login">
                      로그인
                    </Link>
                    <Link className={secondaryButtonClassName} href="/auth/signup">
                      회원가입
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
