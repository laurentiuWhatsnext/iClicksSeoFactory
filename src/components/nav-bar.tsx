"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/import", label: "Assignment" },
  { href: "/pipeline", label: "Pipeline" },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-[#e5e7eb] bg-white px-6">
      <div className="flex items-center gap-4">
        <Link href="/import" className="flex items-center gap-1.5">
          <span className="text-[15px] font-semibold text-[#534AB7]">iClicks</span>
        </Link>

        <div className="h-4 w-px bg-[#e5e7eb]" />

        <div className="flex items-center">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? "text-[#111827]" : "text-[#6b7280] hover:text-[#374151]"
                }`}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-[-10px] left-2 right-2 h-0.5 rounded-full bg-[#534AB7]" />
                )}
              </Link>
            );
          })}
          <span className="px-3 py-1.5 text-sm font-medium text-[#d1d5db] cursor-default select-none">
            Review
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-[#6b7280]">Laurentiu</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#534AB7] text-[10px] font-medium text-white">
          LR
        </div>
      </div>
    </nav>
  );
}
