import type { AdminData } from './types';
import { Stat, PersonIcon, ShopIcon, ClubIcon, VerifiedIcon } from './ui';

export function StatsPanel({ stats }: { stats: AdminData['stats'] }) {
  return (
    <>
      {/* Main stats */}
      <div className="grid md:grid-cols-7 gap-3 mb-4 text-center">
        <Stat label="Total" value={stats.total} />
        <Stat label="Visible" value={stats.visible} />
        <Stat label="Pending" value={stats.pending} />
        <Stat label="Flagged" value={stats.flagged} color="text-brand-red" />
        <Stat label="Auto-hidden" value={stats.autoHidden} color={stats.autoHidden > 0 ? 'text-amber-600' : ''} />
        <Stat label="Minors" value={stats.minors} />
        <Stat label="Reports" value={stats.openReports} color={stats.openReports > 0 ? 'text-brand-red' : ''} />
      </div>

      {/* Entity type breakdown */}
      <div className="grid md:grid-cols-4 gap-3 mb-8 text-center">
        <Stat label="People" value={stats.byType.person} icon={<PersonIcon />} />
        <Stat label="Shops" value={stats.byType.shop} icon={<ShopIcon />} />
        <Stat label="Clubs" value={stats.byType.club} icon={<ClubIcon />} />
        <Stat label="Verified Shops" value={stats.verifiedOwners} icon={<VerifiedIcon />} />
      </div>

      <div className="grid md:grid-cols-5 gap-3 mb-8 text-center">
        <Stat label="Loc: Verified" value={stats.locationStatus.verified} />
        <Stat label="Loc: Auto" value={stats.locationStatus.auto_geocoded} />
        <Stat label="Loc: Research" value={stats.locationStatus.needs_research} />
        <Stat label="Loc: Awaiting" value={stats.locationStatus.awaiting_owner_response} />
        <Stat label="Loc: Dead Pin" value={stats.locationStatus.dead_pin} />
      </div>
    </>
  );
}
