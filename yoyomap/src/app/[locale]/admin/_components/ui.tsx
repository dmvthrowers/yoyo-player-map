// Small presentational pieces of the admin dashboard: stat tiles, badges, row actions, icons.
import type { ReactNode } from 'react';
import type { AdminEntry } from './types';

export function Stat({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: ReactNode }) {
  return (
    <div className="card py-3">
      {icon && <div className="flex justify-center mb-1">{icon}</div>}
      <p className={`font-display text-3xl ${color || ''}`}>{value}</p>
      <p className="text-xs uppercase tracking-wider text-navy/60">{label}</p>
    </div>
  );
}

export function EntityTypeBadge({ type, verified }: { type: AdminEntry['entity_type']; verified?: boolean }) {
  const entityType = type || 'person';
  const colors = {
    person: 'bg-[#B80000]/10 text-[#B80000]',
    shop: 'bg-[#2E8B57]/10 text-[#2E8B57]',
    club: 'bg-[#1B2A49]/10 text-[#1B2A49]',
  };
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 ${colors[entityType]}`}>
      {entityType}
      {entityType === 'shop' && verified && (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      )}
    </span>
  );
}

export function StatusBadge({ entry }: { entry: AdminEntry }) {
  if (entry.deleted_at) return <StatusChip tone="muted" label="deleted" />;
  if (entry.is_flagged) return <StatusChip tone="danger" label="flagged" />;
  if (entry.auto_hidden_by_reports) {
    return (
      <StatusChip tone="warning" label="auto-hidden">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
      </StatusChip>
    );
  }
  if (entry.is_visible) return <StatusChip tone="success" label="visible" />;
  return <StatusChip tone="neutral" label="pending" />;
}

export function prettyLocationStatus(status: AdminEntry['location_status']) {
  if (status === 'auto_geocoded') return 'auto geocoded';
  if (status === 'needs_research') return 'needs research';
  if (status === 'awaiting_owner_response') return 'awaiting owner response';
  if (status === 'dead_pin') return 'dead pin';
  return 'verified';
}

export function LocationStatusBadge({ status }: { status: AdminEntry['location_status'] }) {
  const tones: Record<AdminEntry['location_status'], 'success' | 'neutral' | 'warning' | 'info' | 'danger'> = {
    verified: 'success',
    auto_geocoded: 'neutral',
    needs_research: 'warning',
    awaiting_owner_response: 'info',
    dead_pin: 'danger',
  };
  return <StatusChip tone={tones[status]} label={prettyLocationStatus(status)} />;
}

export function StatusChip({
  tone,
  label,
  children,
}: {
  tone: 'success' | 'neutral' | 'warning' | 'info' | 'danger' | 'muted';
  label: string;
  children?: React.ReactNode;
}) {
  const colors: Record<'success' | 'neutral' | 'warning' | 'info' | 'danger' | 'muted', string> = {
    success: 'bg-green-100 text-green-800 ring-green-700/15',
    neutral: 'bg-navy/10 text-navy/80 ring-navy/15',
    warning: 'bg-amber-100 text-amber-800 ring-amber-700/20',
    info: 'bg-blue-100 text-blue-800 ring-blue-700/15',
    danger: 'bg-brand-red/10 text-brand-red ring-brand-red/20',
    muted: 'bg-navy/5 text-navy/45 ring-navy/10',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold ring-1 ${colors[tone]}`}>
      {children}
      {label}
    </span>
  );
}

export function EntryActions({ entry, act }: { entry: AdminEntry; act: (action: string, id: string) => void }) {
  return (
    <>
      {entry.auto_hidden_by_reports && (
        <button className="text-xs underline text-amber-600" onClick={() => act('clear_auto_hide', entry.id)}>
          Clear auto-hide
        </button>
      )}
      {entry.is_flagged ? (
        <button className="text-xs underline" onClick={() => act('unflag_entry', entry.id)}>Unflag</button>
      ) : (
        <button className="text-xs underline" onClick={() => act('flag_entry', entry.id)}>Flag</button>
      )}
      <button className="text-xs underline" onClick={() => act('regeocode_entry', entry.id)}>Re-geocode</button>
      {!entry.verified_at && (
        <button
          className="text-xs underline"
          onClick={() => act('send_reminder', entry.id)}
          title={`Reminders sent: ${entry.reminder_count}${entry.last_reminder_at ? ' · last ' + new Date(entry.last_reminder_at).toLocaleDateString() : ''}`}
        >
          Remind ({entry.reminder_count})
        </button>
      )}
      <button className="text-xs underline text-brand-red" onClick={() => act('delete_entry', entry.id)}>Delete</button>
    </>
  );
}

export function getReasonColor(reason: string): string {
  const colors: Record<string, string> = {
    impersonation: 'text-amber-600 font-semibold',
    fake_business: 'text-amber-600 font-semibold',
    unauthorized_listing: 'text-amber-600 font-semibold',
    harassment: 'text-brand-red font-semibold',
    minor_unsafe: 'text-brand-red font-semibold',
    spam: 'text-navy/70',
    other: 'text-navy/70',
  };
  return colors[reason] || 'text-navy/70';
}

// Icons
export function PersonIcon() {
  return (
    <svg className="w-5 h-5 text-brand-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

export function ShopIcon() {
  return (
    <svg className="w-5 h-5 text-[#2E8B57]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function ClubIcon() {
  return (
    <svg className="w-5 h-5 text-[#1B2A49]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function VerifiedIcon() {
  return (
    <svg className="w-5 h-5 text-[#2E8B57]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );
}
