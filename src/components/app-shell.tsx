import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { AppNavLinks, type AppNavItem } from "@/components/app-nav";
import { getCurrentMember, getCurrentUser } from "@/server/auth-context";
import { isAdminUser } from "@/server/admin";
import {
  contentShellClassName,
  mutedButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";

const primaryNavItems: AppNavItem[] = [
  { href: "/", label: "대시보드" },
  { href: "/calendar", label: "가능 시간" },
  { href: "/schedules", label: "일정" },
  { href: "/members", label: "공대원" },
];

const secondaryNavItems: AppNavItem[] = [
  { href: "/templates", label: "템플릿" },
  { href: "/notifications", label: "알림" },
];

function AccountMenu({
  groupName,
  secondaryItems,
  utilityItems,
}: {
  groupName: string;
  secondaryItems: AppNavItem[];
  utilityItems: AppNavItem[];
}) {
  return (
    <details
      aria-label="계정 메뉴"
      className="relative ml-auto"
    >
      <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-900 [&::-webkit-details-marker]:hidden">
        더보기
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
        <div className="border-b border-slate-100 px-3 py-2">
          <div className="text-xs font-semibold text-slate-500">현재 공대</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-slate-950">
            {groupName}
          </div>
        </div>
        <div className="grid gap-1 p-1 sm:hidden">
          <AppNavLinks items={secondaryItems} variant="menu" />
        </div>
        {utilityItems.length > 0 ? (
          <div className="grid gap-1 border-t border-slate-100 p-1">
            <AppNavLinks items={utilityItems} variant="menu" />
          </div>
        ) : null}
        <form action={logoutAction} className="border-t border-slate-100 p-1">
          <button className="flex h-9 w-full items-center rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
            로그아웃
          </button>
        </form>
      </div>
    </details>
  );
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  const user = await getCurrentUser();
  const isAdmin = isAdminUser(user);
  const utilityItems: AppNavItem[] = [
    ...(member?.role === "LEADER"
      ? [{ href: "/settings", label: "공대 설정" }]
      : []),
    ...(isAdmin ? [{ href: "/admin", label: "관리자" }] : []),
  ];

  return (
    <div className="min-h-screen text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className={`${contentShellClassName} py-2`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:flex-nowrap">
            <Link className="flex min-w-0 items-center gap-2 font-semibold" href="/">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-700 text-sm text-white">
                LA
              </span>
              <span className="truncate">
                <span className="hidden sm:inline">로스트아크 공대관리</span>
                <span className="sm:hidden">공대관리</span>
              </span>
            </Link>
            {member ? (
              <>
                <nav
                  aria-label="주요 메뉴"
                  className="order-3 grid w-full grid-cols-4 gap-1 sm:order-none sm:flex sm:w-auto sm:flex-1"
                >
                  <AppNavLinks items={primaryNavItems} />
                </nav>
                <nav
                  aria-label="보조 메뉴"
                  className="hidden items-center gap-1 sm:flex"
                >
                  <AppNavLinks items={secondaryNavItems} />
                </nav>
                <div className="hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 lg:block">
                  {member.group.name}
                </div>
                <AccountMenu
                  groupName={member.group.name}
                  secondaryItems={secondaryNavItems}
                  utilityItems={utilityItems}
                />
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
