import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { GoogleAdSenseAdUnits } from "@/components/adsense-ad-units";
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
  { href: "/weekly", label: "주간" },
  { href: "/sets", label: "편성" },
  { href: "/calendar", label: "가능 시간" },
];

const secondaryNavItems: AppNavItem[] = [
  { href: "/homework", label: "숙제" },
  { href: "/signup", label: "신청" },
  { href: "/templates", label: "템플릿" },
  { href: "/notifications", label: "알림" },
  { href: "/members", label: "공대원" },
];

const publicNavItems: AppNavItem[] = [
  { href: "/about", label: "소개" },
  { href: "/guides/raid-schedule", label: "일정 가이드" },
  { href: "/guides/party-matching", label: "편성 가이드" },
  { href: "/privacy", label: "개인정보" },
  { href: "/contact", label: "문의" },
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
      <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 [&::-webkit-details-marker]:hidden">
        더보기
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg shadow-slate-300/40">
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
      <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 shadow-sm shadow-slate-200/40 backdrop-blur">
        <div className={`${contentShellClassName} py-2.5`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:flex-nowrap">
            <Link className="flex min-w-0 items-center gap-2 font-semibold text-slate-950" href="/">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-sm text-white shadow-sm">
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
                <div className="hidden max-w-48 truncate rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 lg:block">
                  {member.group.name}
                </div>
                <AccountMenu
                  groupName={member.group.name}
                  secondaryItems={secondaryNavItems}
                  utilityItems={utilityItems}
                />
              </>
            ) : (
              <>
                <nav
                  aria-label="공개 메뉴"
                  className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:ml-4 sm:w-auto"
                >
                  <AppNavLinks items={publicNavItems} />
                </nav>
                <nav
                  aria-label="인증 메뉴"
                  className="ml-auto flex items-center gap-2 text-sm text-slate-600"
                >
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
              </>
            )}
          </div>
        </div>
      </header>
      {children}
      <GoogleAdSenseAdUnits />
    </div>
  );
}
