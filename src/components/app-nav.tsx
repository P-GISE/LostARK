"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export type AppNavItem = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavLinks({
  items,
  variant = "tab",
}: {
  items: AppNavItem[];
  variant?: "tab" | "menu";
}) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cx(
              variant === "tab"
                ? "inline-flex h-9 min-w-0 items-center justify-center rounded-md px-2 text-sm font-semibold transition sm:justify-start sm:px-3"
                : "flex h-9 w-full items-center rounded-md px-3 text-sm font-semibold transition",
              active
                ? variant === "tab"
                  ? "bg-teal-700 text-white shadow-sm hover:bg-teal-800"
                  : "bg-teal-50 text-teal-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
