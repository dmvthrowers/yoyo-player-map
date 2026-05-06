import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loc] = useLocation();
  const close = () => setMenuOpen(false);

  function navCls(path: string) {
    return `nav-link whitespace-nowrap${loc === path ? " border-brand-red text-brand-red" : ""}`;
  }

  return (
    <>
      <div className="topbar hidden md:block">
        <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-end gap-5">
          <a
            href="https://dmvthrowers.club/"
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-link"
          >
            DMV Throwers ↗
          </a>
          <a
            href="https://dmvthrowers.club/vsyc26.html"
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-link"
          >
            VSYC-26 ↗
          </a>
        </div>
      </div>

      <nav className="site-nav" aria-label="Main Navigation">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
          <Link href="/" className="brand-lockup whitespace-nowrap" onClick={close}>
            YoYo <span className="text-brand-red">Map</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <ul className="flex items-center gap-6">
              <li><Link href="/map" className={navCls("/map")}>Map</Link></li>
              <li><Link href="/players" className={navCls("/players")}>Players</Link></li>
              <li><Link href="/submit" className={navCls("/submit")}>Submit</Link></li>
              <li><Link href="/profile" className={navCls("/profile")}>Profile</Link></li>
              <li>
                <a
                  href="https://ko-fi.com/dmvthrowers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="donate-btn"
                  title="Support DMV Throwers on Ko-fi"
                >
                  Donate ☕
                </a>
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="md:hidden p-2 -mr-1 text-navy-deep"
            aria-expanded={menuOpen ? "true" : "false"}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-menu" className="md:hidden border-t px-4 pb-4 pt-2 bg-cream">
            <ul className="flex flex-col">
              <li><Link href="/map" className="nav-link block py-2" onClick={close}>Map</Link></li>
              <li><Link href="/players" className="nav-link block py-2" onClick={close}>Players</Link></li>
              <li><Link href="/submit" className="nav-link block py-2" onClick={close}>Submit</Link></li>
              <li><Link href="/profile" className="nav-link block py-2" onClick={close}>Profile</Link></li>
              <li className="py-2">
                <a href="https://ko-fi.com/dmvthrowers" target="_blank" rel="noopener noreferrer" className="donate-btn inline-block" onClick={close}>Donate ☕</a>
              </li>
              <li>
                <a href="https://dmvthrowers.club/" target="_blank" rel="noopener noreferrer" className="nav-link block py-2" onClick={close}>DMV Throwers ↗</a>
              </li>
              <li>
                <a href="https://dmvthrowers.club/vsyc26.html" target="_blank" rel="noopener noreferrer" className="nav-link block py-2 text-brand-red" onClick={close}>VSYC-26 ↗</a>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </>
  );
}
