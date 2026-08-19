import { Link, useRouterState } from "@tanstack/react-router";
import { Briefcase, Building2, LayoutDashboard, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Tarefas", icon: Briefcase },
  { to: "/clientes", label: "Clientes", icon: Building2 },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

function Logo() {
  return (
    <span className="flex items-baseline text-xl font-semibold text-foreground">
      lawi
      <span className="mx-0.5 text-teal">•</span>
      <span className="tracking-[0.22em] text-foreground">HUB</span>
    </span>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <button
      type="button"
      onClick={() => setDark((v) => !v)}
      aria-label="Alternar tema"
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-5 md:flex">
        <Logo />
        <p className="mt-1 text-xs text-muted-foreground">Legal Department</p>
        <nav className="mt-8 flex flex-col gap-1">
          {links.map((l) => {
            const active = l.to === "/" ? pathname === "/" : pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <div className="text-xs">
            <p className="font-medium text-foreground">Gabriella Consoli</p>
            <p className="text-muted-foreground">Jurídico interno</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-card/90 px-5 py-3 backdrop-blur">
          <div className="md:hidden">
            <Logo />
          </div>
          <nav className="flex gap-2 md:hidden">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="text-sm text-muted-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
          <span className="hidden md:block" />
          <ThemeToggle />
        </header>
        <main className="flex-1 px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
