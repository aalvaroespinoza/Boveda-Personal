'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SyncStatus from '@/components/SyncStatus';

const NAV = [
  { href: '/', label: 'Inicio', icon: '⌂' },
  { href: '/tareas', label: 'Tareas', icon: '☑' },
  { href: '/proyectos', label: 'Proyectos', icon: '□' },
  { href: '/entrada', label: 'Entrada', icon: '＋' },
  { href: '/actividad', label: 'Actividad', icon: '≡' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = NAV.find((item) => isActive(pathname, item.href)) ?? NAV[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          Bóveda Personal
          <small>Panel operativo</small>
        </div>

        <nav className="nav" aria-label="Secciones principales">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${isActive(pathname, item.href) ? ' active' : ''}`}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sync-dot" aria-hidden="true" />
          <span title={email}>Supabase · RLS</span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="crumb">
            Bóveda Personal / <strong>{current.label}</strong>
          </span>
          <SyncStatus />
        </header>

        {children}
      </div>

      <nav className="mobile-nav" aria-label="Navegación móvil">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(pathname, item.href) ? 'active' : ''}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
          >
            <span className="mobile-icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
