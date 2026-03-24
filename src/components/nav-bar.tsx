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
    <nav className="sticky top-0 z-50 flex h-[56px] items-center justify-between border-b border-[#d8dbe3] bg-gradient-to-r from-white via-white to-[#faf9ff] backdrop-blur-lg px-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-5">
        {/* Logo */}
        <Link href="/import" className="flex items-center gap-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#534AB7] to-[#7C6FD4] shadow-sm shadow-[#534AB7]/20 group-hover:shadow-md group-hover:shadow-[#534AB7]/25 transition-shadow">
            <span className="text-[11px] font-extrabold text-white tracking-tight">iC</span>
          </div>
          <span className="text-[17px] font-bold tracking-tight bg-gradient-to-r from-[#534AB7] to-[#6C5FD9] bg-clip-text text-transparent">
            iClicks
          </span>
        </Link>

        {/* Divider */}
        <div className="h-5 w-px bg-gradient-to-b from-transparent via-[#d0d3db] to-transparent" />

        {/* Nav tabs */}
        <div className="flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`relative rounded-lg px-3.5 py-2 text-[13.5px] font-semibold transition-all ${
                  isActive
                    ? "text-[#0f172a] bg-[#f0eeff]/60"
                    : "text-[#64748b] hover:text-[#334155] hover:bg-[#f1f3f8]"
                }`}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-[-12px] left-3 right-3 h-[2.5px] rounded-full bg-gradient-to-r from-[#534AB7] to-[#7C6FD4]" />
                )}
              </Link>
            );
          })}
          <span className="rounded-lg px-3.5 py-2 text-[13.5px] font-semibold text-[#b0b5c3] cursor-default select-none">
            Review
          </span>
        </div>
      </div>

      {/* Right — user */}
      <div className="flex items-center gap-3">
        <span className="text-[12.5px] font-semibold text-[#64748b]">Laurentiu</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#534AB7] to-[#7C6FD4] text-[10.5px] font-bold text-white shadow-md shadow-[#534AB7]/25 ring-2 ring-white">
          LR
        </div>
      </div>
    </nav>
  );
}
