"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const nav = [
  { href: "/heute", label: "Heute" },
  { href: "/chat", label: "Chat" },
  { href: "/aufgaben", label: "Aufgaben" },
  { href: "/gedaechtnis", label: "Gedächtnis" },
  { href: "/einstellungen", label: "Einstellungen" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [modeLabel, setModeLabel] = useState<string>("…");

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setModeLabel(d.mode === "live" ? "Live" : "Demo"))
      .catch(() => setModeLabel("Demo"));
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col md:flex-row">
      <header className="md:hidden border-b border-stone-200 bg-white px-4 py-3 flex items-center justify-between">
        <span className="font-semibold tracking-tight text-teal-800">Nexo</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            modeLabel === "Live" ? "bg-teal-100 text-teal-900" : "bg-amber-100 text-amber-900"
          }`}
        >
          {modeLabel}
        </span>
      </header>
      <nav className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-stone-200 bg-white md:min-h-screen p-3 flex md:flex-col gap-1 overflow-x-auto">
        <div className="hidden md:flex items-center justify-between px-2 py-3 mb-2">
          <span className="font-semibold text-lg tracking-tight text-teal-800">Nexo</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              modeLabel === "Live" ? "bg-teal-100 text-teal-900" : "bg-amber-100 text-amber-900"
            }`}
          >
            {modeLabel}
          </span>
        </div>
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                active ? "bg-teal-50 text-teal-900 font-medium" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <main className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto">{children}</main>
    </div>
  );
}
