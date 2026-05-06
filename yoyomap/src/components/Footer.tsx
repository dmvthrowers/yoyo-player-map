import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-navy-deep border-t-4 border-brand-red mt-12">
      <div className="bg-navy-deep">
        <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-4 gap-6 text-sm text-cream/80">
          <div>
            <p className="text-lg font-black text-cream font-display">YoYo Map</p>
            <p className="mt-2">A community project of DMV Throwers Yo-Yo &amp; Skill Toy Club.</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wider text-xs mb-2 text-cream">DMV Throwers</p>
            <ul className="space-y-1">
              <li><a href="https://dmvthrowers.club/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">Home ↗</a></li>
              <li><a href="https://dmvthrowers.club/vsyc26.html" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">VSYC-26 ↗</a></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wider text-xs mb-2 text-cream">Legal</p>
            <ul className="space-y-1">
              <li><Link href="/legal/privacy" className="hover:opacity-80 transition-opacity">Privacy Policy</Link></li>
              <li><Link href="/legal/terms" className="hover:opacity-80 transition-opacity">Terms of Service</Link></li>
            </ul>
            <p className="font-semibold uppercase tracking-wider text-xs mt-4 mb-2 text-cream">Security</p>
            <ul className="space-y-1">
              <li><Link href="/legal/security" className="hover:opacity-80 transition-opacity">Security Bulletin</Link></li>
              <li><Link href="/status" className="hover:opacity-80 transition-opacity">Service Status</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wider text-xs mb-2 text-cream">Project</p>
            <ul className="space-y-1">
              <li><a href="https://github.com/dmvthrowers/yoyo-player-map" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">GitHub ↗</a></li>
              <li><Link href="/contact" className="hover:opacity-80 transition-opacity">Contact</Link></li>
              <li className="text-xs opacity-60">DC · MD · VA</li>
            </ul>
          </div>
        </div>
        <div className="py-3 text-center text-xs bg-navy text-cream/60">
          <p>© {new Date().getFullYear()} DMV Throwers. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
