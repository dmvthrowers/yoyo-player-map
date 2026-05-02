import { Link } from "wouter";

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#0e1833", borderTop: "4px solid #D42B2B", marginTop: "3rem" }}>
      <div style={{ backgroundColor: "#0e1833" }}>
        <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-4 gap-6 text-sm" style={{ color: "rgba(245,240,232,0.8)" }}>
          <div>
            <p className="text-lg font-black" style={{ color: "#f5f0e8", fontFamily: "Georgia, serif" }}>YoYo Map</p>
            <p className="mt-2">A community project of DMV Throwers Yo-Yo &amp; Skill Toy Club.</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wider text-xs mb-2" style={{ color: "#f5f0e8" }}>DMV Throwers</p>
            <ul className="space-y-1">
              <li><a href="https://dmvthrowers.club/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ color: "inherit" }}>Home ↗</a></li>
              <li><a href="https://dmvthrowers.club/vsyc26.html" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ color: "inherit" }}>VSYC-26 ↗</a></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wider text-xs mb-2" style={{ color: "#f5f0e8" }}>Legal</p>
            <ul className="space-y-1">
              <li><Link href="/legal/privacy" style={{ color: "inherit" }} className="hover:opacity-80 transition-opacity">Privacy Policy</Link></li>
              <li><Link href="/legal/terms" style={{ color: "inherit" }} className="hover:opacity-80 transition-opacity">Terms of Service</Link></li>
            </ul>
            <p className="font-semibold uppercase tracking-wider text-xs mt-4 mb-2" style={{ color: "#f5f0e8" }}>Security</p>
            <ul className="space-y-1">
              <li><Link href="/legal/security" style={{ color: "inherit" }} className="hover:opacity-80 transition-opacity">Security Bulletin</Link></li>
              <li><Link href="/status" style={{ color: "inherit" }} className="hover:opacity-80 transition-opacity">Service Status</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wider text-xs mb-2" style={{ color: "#f5f0e8" }}>Project</p>
            <ul className="space-y-1">
              <li><a href="https://github.com/dmvthrowers/yoyo-player-map" target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }} className="hover:opacity-80 transition-opacity">GitHub ↗</a></li>
              <li><Link href="/contact" style={{ color: "inherit" }} className="hover:opacity-80 transition-opacity">Contact</Link></li>
              <li className="text-xs opacity-60">DC · MD · VA</li>
            </ul>
          </div>
        </div>
        <div className="py-3 text-center text-xs" style={{ backgroundColor: "#1a2744", color: "rgba(245,240,232,0.6)" }}>
          <p>© {new Date().getFullYear()} DMV Throwers. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
