"use client";

import {
  Activity,
  Bell,
  BookOpenCheck,
  Building2,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  HandCoins,
  Hotel,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Plane,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { logout } from "@/app/actions/auth";
import type { AuthenticatedUser } from "@/lib/auth";

const navigation = [
  {
    title: "OVERVIEW",
    links: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "TRAVEL MANAGEMENT",
    links: [
      { label: "Customers", href: "/customers", icon: UsersRound },
      { label: "Umrah packages", href: "/packages", icon: BookOpenCheck },
      { label: "Bookings", href: "/bookings", icon: CalendarCheck },
      { label: "Passengers", href: "/passengers", icon: Users },
      { label: "Visa management", href: "/visas", icon: ShieldCheck },
      { label: "Flight management", href: "/flights", icon: Plane },
      { label: "Hotel management", href: "/hotels", icon: Hotel },
      { label: "Transport", href: "/transport", icon: Truck },
      { label: "Suppliers", href: "/suppliers", icon: Building2 },
    ],
  },
  {
    title: "FINANCE",
    links: [
      { label: "Payments & accounts", href: "/payments", icon: CircleDollarSign },
      { label: "Expenses", href: "/expenses", icon: HandCoins },
      { label: "Invoices & receipts", href: "/invoices", icon: FileText },
      { label: "Reports & analytics", href: "/reports", icon: Activity },
    ],
  },
  {
    title: "ADMINISTRATION",
    links: [
      { label: "Staff & users", href: "/staff", icon: Users },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const descriptions: Record<string, string> = {
  "/": "A clear picture of your agency operations.",
  "/customers": "Manage customer profiles and their booking history.",
  "/packages": "Organize your Umrah offers, dates, and package details.",
  "/bookings": "Track reservations, passengers, and booking progress.",
  "/passengers": "Manage traveler details and required documents.",
  "/visas": "Monitor visa applications, requirements, and status.",
  "/flights": "Keep flight schedules and ticket information organized.",
  "/hotels": "Manage accommodation and hotel reservations.",
  "/transport": "Coordinate ground transport for your travelers.",
  "/suppliers": "Maintain your supplier directory and balances.",
  "/payments": "Review receipts, refunds, and customer balances.",
  "/expenses": "Record and organize agency expenses.",
  "/invoices": "Prepare invoices, receipts, and customer statements.",
  "/reports": "Review booking, finance, and operations performance.",
  "/staff": "Manage agency users and their access.",
  "/notifications": "Review reminders and important activity.",
  "/settings": "Configure agency information and preferences.",
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  BOOKING_AGENT: "Booking Agent",
  ACCOUNTS_OFFICER: "Accounts Officer",
  VISA_OFFICER: "Visa Officer",
};

function Sidebar({
  collapsed,
  mobileOpen,
  onCollapse,
  onClose,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapse: () => void;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "sidebar-mobile-open" : ""}`}
      >
        <div className="flex h-[68px] items-center justify-between border-b border-slate-100 px-5">
          <Link className="flex min-w-0 items-center gap-3" href="/" onClick={onClose}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-700 text-white">
              <Plane size={19} strokeWidth={2.2} />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">SafarDesk</span>
                <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">Travel operations</span>
              </span>
            )}
          </Link>
          <button
            aria-label="Close navigation"
            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-scroll px-3 pb-5 pt-5">
          {navigation.map((group) => (
            <section key={group.title} className="mb-6">
              {!collapsed && <h2 className="sidebar-heading">{group.title}</h2>}
              <nav aria-label={group.title} className="space-y-1">
                {group.links.map(({ label, href, icon: Icon }) => {
                  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={`nav-link ${active ? "nav-link-active" : ""}`}
                      href={href}
                      key={href}
                      onClick={onClose}
                      title={collapsed ? label : undefined}
                    >
                      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                      {!collapsed && <span className="truncate">{label}</span>}
                      {!collapsed && active && <span className="ml-auto size-1.5 rounded-full bg-blue-600" />}
                    </Link>
                  );
                })}
              </nav>
            </section>
          ))}

          {!collapsed && (
            <div className="mx-1 mt-8 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5">
              <div className="flex items-center gap-2 text-blue-800">
                <LifeBuoy size={16} />
                <span className="text-xs font-semibold">Need a hand?</span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">Your operations team can find guides and support here.</p>
              <Link className="mt-2 inline-block text-xs font-semibold text-blue-700 hover:text-blue-900" href="/settings">
                Visit help center →
              </Link>
            </div>
          )}
        </div>

        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="sidebar-collapse"
          onClick={onCollapse}
          type="button"
        >
          {collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /><span>Collapse sidebar</span></>}
        </button>
      </aside>
    </>
  );
}

export function AppShell({
  children,
  user,
  notifications,
  unreadNotificationCount,
}: {
  children: ReactNode;
  user: AuthenticatedUser;
  notifications: { id: string; title: string; message: string; created_at: string }[];
  unreadNotificationCount: number;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const title = useMemo(() => {
    const item = navigation.flatMap((section) => section.links).find(
      (link) => link.href === pathname || (link.href !== "/" && pathname.startsWith(`${link.href}/`)),
    );
    return item?.label ?? "Travel operations";
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={() => setCollapsed((value) => !value)}
        onClose={() => setMobileOpen(false)}
      />
      <div className={`app-content ${collapsed ? "app-content-collapsed" : ""}`}>
        <header className="topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              type="button"
            >
              <Menu size={20} />
            </button>
            <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
              <span>Workspace</span>
              <ChevronRight size={13} />
              <span className="font-medium text-slate-700">{title}</span>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <label className="search-box hidden md:flex">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input aria-label="Search workspace" placeholder="Search anything..." type="search" />
              <kbd>⌘ K</kbd>
            </label>
            <div className="relative">
              <button
                aria-expanded={notificationsOpen}
                aria-label="Notifications"
                className="icon-button relative"
                onClick={() => {
                  setNotificationsOpen((value) => !value);
                  setProfileOpen(false);
                }}
                type="button"
              >
                <Bell size={18} />
                {unreadNotificationCount > 0 && <span className="absolute right-[9px] top-[8px] size-1.5 rounded-full border border-white bg-rose-500" />}
              </button>
              {notificationsOpen && (
                <div className="topbar-popover right-0 w-72">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-800">Notifications</span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{unreadNotificationCount} new</span>
                  </div>
                  {notifications.length ? <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.map((notification) => <li className="px-4 py-3" key={notification.id}>
                      <p className="text-xs font-semibold text-slate-700">{notification.title}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{notification.message}</p>
                      <time className="mt-1 block text-[10px] text-slate-400">{new Date(notification.created_at).toLocaleString()}</time>
                    </li>)}
                  </ul> : <div className="px-4 py-8 text-center">
                    <Bell size={20} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-xs font-medium text-slate-600">You&apos;re all caught up</p>
                    <p className="mt-1 text-[11px] text-slate-400">New reminders will appear here.</p>
                  </div>}
                  <Link className="block border-t border-slate-100 px-4 py-3 text-center text-xs font-medium text-blue-700" href="/notifications" onClick={() => setNotificationsOpen(false)}>
                    View notifications
                  </Link>
                </div>
              )}
            </div>
            <span className="hidden h-7 w-px bg-slate-200 sm:block" />
            <div className="relative">
              <button
                aria-expanded={profileOpen}
                className="flex items-center gap-2 rounded-lg p-1.5 text-left hover:bg-slate-100"
                onClick={() => {
                  setProfileOpen((value) => !value);
                  setNotificationsOpen(false);
                }}
                type="button"
              >
                <span className="grid size-8 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800">
                  {user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U"}
                </span>
                <span className="hidden sm:block">
                  <span className="block max-w-32 truncate text-xs font-semibold leading-4 text-slate-800">{user.name}</span>
                  <span className="block text-[10px] leading-4 text-slate-400">{roleLabels[user.role.name] ?? "Staff"}</span>
                </span>
                <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
              </button>
              {profileOpen && (
                <div className="topbar-popover right-0 w-48 py-1">
                  <Link className="block px-3 py-2 text-xs text-slate-600 hover:bg-slate-50" href="/staff" onClick={() => setProfileOpen(false)}>Staff &amp; users</Link>
                  <Link className="block px-3 py-2 text-xs text-slate-600 hover:bg-slate-50" href="/settings" onClick={() => setProfileOpen(false)}>Agency settings</Link>
                  <form action={logout} className="border-t border-slate-100">
                    <button className="block w-full px-3 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50" type="submit">Sign out</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page-content">
          {pathname !== "/" && (
            <div className="mb-6">
              <p className="mb-1.5 text-xs text-slate-400">Workspace / {title}</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
              <p className="mt-1.5 text-sm text-slate-500">{descriptions[pathname] ?? "Manage your travel operations in one place."}</p>
            </div>
          )}
          {children}
        </main>
        <footer className="px-5 pb-5 text-center text-[11px] text-slate-400 sm:px-8">
          SafarDesk · Travel operations workspace
        </footer>
      </div>
    </div>
  );
}
