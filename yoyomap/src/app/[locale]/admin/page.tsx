'use client';

import { useState, useEffect, useMemo } from 'react';

interface AdminEntry {
  id: string;
  display_name: string;
  email: string;
  city: string;
  region: string | null;
  country: string;
  age_band: string | null;
  entity_type: 'person' | 'shop' | 'club' | null;
  is_visible: boolean;
  is_flagged: boolean;
  auto_hidden_by_reports: boolean;
  verified_owner: boolean;
  verified_at: string | null;
  created_at: string;
  deleted_at: string | null;
  last_reminder_at: string | null;
  reminder_count: number;
}

interface AdminData {
  entries: AdminEntry[];
  reports: Array<{
    id: string;
    entry_id: string;
    reason: string;
    details: string | null;
    resolved_at: string | null;
    created_at: string;
  }>;
  stats: {
    total: number;
    visible: number;
    pending: number;
    flagged: number;
    autoHidden: number;
    minors: number;
    openReports: number;
    byType: {
      person: number;
      shop: number;
      club: number;
    };
    verifiedOwners: number;
  };
}

type EntityFilter = 'all' | 'person' | 'shop' | 'club';
type StatusFilter = 'all' | 'visible' | 'pending' | 'flagged' | 'auto_hidden';

const AdminPage = () => {
  const [pass, setPass] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  // Pagination, sorting, search
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [sort, setSort] = useState('created_at');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  async function load(token: string, opts?: { page?: number; pageSize?: number; sort?: string; direction?: string; search?: string }) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(opts?.page ?? page));
      params.set('pageSize', String(opts?.pageSize ?? pageSize));
      params.set('sort', opts?.sort ?? sort);
      params.set('direction', opts?.direction ?? direction);
      if (opts?.search !== undefined ? opts.search : search) params.set('search', opts?.search !== undefined ? opts.search : search);
      const res = await fetch(`/api/admin/data?${params.toString()}`, {
        headers: { 'x-admin-token': token },
      });
      if (res.status === 401) {
        setError('Wrong password.');
        setAuthed(false);
      } else if (res.ok) {
        const json = await res.json();
        setData(json);
        setAuthed(true);
        setError('');
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
    if (saved) {
      setPass(saved);
      load(saved);
    }
    // eslint-disable-next-line
  }, []);

  // Reload on page/sort/search change
  useEffect(() => {
    if (!authed || !pass) return;
    load(pass, { page, pageSize, sort, direction, search });
    // eslint-disable-next-line
  }, [page, pageSize, sort, direction, search]);

  async function act(action: string, id: string) {
    const res = await fetch('/api/admin/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': pass },
      body: JSON.stringify({ action, id }),
    });
    if (res.ok) {
      load(pass);
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error || 'Action failed.');
    }
  }

  async function sendAllReminders() {
    if (!confirm('Send reminder emails to every eligible unverified entry?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/send-reminders', {
        method: 'POST',
        headers: { 'x-admin-token': pass },
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body) {
        const skipped = body.skipped || {};
        const skippedText = Object.entries(skipped)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        setError(
          `Sent ${body.sent} of ${body.total} reminder(s)` +
            (skippedText ? ` — skipped (${skippedText})` : '')
        );
        load(pass);
      } else {
        setError(body?.error || 'Bulk send failed.');
      }
    } catch {
      setError('Network error during bulk send.');
    } finally {
      setLoading(false);
    }
  }

  async function refreshMap() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/refresh-map', {
        method: 'POST',
        headers: { 'x-admin-token': pass },
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) {
        setError('Map refresh triggered.');
      } else {
        setError(body?.error || 'Map refresh failed.');
      }
    } catch {
      setError('Network error during map refresh.');
    } finally {
      setLoading(false);
    }
  }
  async function regeocodeAll(force = false) {
    const msg = force
      ? 'FORCE RE-GEOCODE: This will re-geocode EVERY entry, even those already geocoded. This can take a long time and may hit rate limits. Are you sure?'
      : 'Re-geocode every entry on the map?\n\nThis processes entries in batches of 10 (≈15s per batch due to Nominatim rate limits) and stops automatically when done or when a batch makes no progress. Pins will shift slightly because jitter is re-randomized.';
    if (!confirm(msg)) return;
    setLoading(true);
    let totalSucceeded = 0;
    let totalFailed = 0;
    const allFailures = [];
    let batch = 0;

    try {
      while (true) {
        batch += 1;
        const res = await fetch('/api/admin/regeocode-all', {
          method: 'POST',
          headers: { 'x-admin-token': pass, 'Content-Type': 'application/json' },
          body: JSON.stringify(force ? { force: true } : {}),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body) {
          setError(body?.error || 'Bulk re-geocode failed.');
          break;
        }

        totalSucceeded += body.succeeded;
        totalFailed += body.failed;
        if (Array.isArray(body.failures)) allFailures.push(...body.failures);

        setError(
          `Batch ${batch}: ${body.succeeded} ok, ${body.failed} failed · ${body.remaining} remaining…`
        );

        // Done, or no progress (only unfixable entries left).
        if (body.remaining === 0 || body.succeeded === 0) {
          break;
        }
      }

      const uniqueFailures = Array.from(new Map(allFailures.map((f) => [f.id, f])).values());
      const summary =
        `Re-geocode complete: ${totalSucceeded} updated, ${totalFailed} failed.` +
        (uniqueFailures.length > 0
          ? ` Unfixable: ${uniqueFailures.map((f) => `${f.display_name} (${f.city}) — ${f.reason}`).join('; ')}`
          : '');
      setError(summary);
      if (uniqueFailures.length > 0) console.warn('Re-geocode failures:', uniqueFailures);
      load(pass);
    } catch {
      setError('Network error during bulk re-geocode.');
    } finally {
      setLoading(false);
    }
  }

  // Filter entries based on selected filters
  const filteredEntries = useMemo(() => {
    if (!data) return [];
    return data.entries.filter((e) => {
      // Entity type filter
      if (entityFilter !== 'all') {
        const entryType = e.entity_type || 'person';
        if (entryType !== entityFilter) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'visible' && (!e.is_visible || e.deleted_at || e.auto_hidden_by_reports)) return false;
        if (statusFilter === 'pending' && (e.is_visible || e.is_flagged || e.deleted_at || e.auto_hidden_by_reports)) return false;
        if (statusFilter === 'flagged' && (!e.is_flagged || e.deleted_at)) return false;
        if (statusFilter === 'auto_hidden' && (!e.auto_hidden_by_reports || e.deleted_at)) return false;
      }
      
      return true;
    });
  }, [data, entityFilter, statusFilter]);

  if (!authed) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="card">
          <h1 className="text-3xl mb-4">Admin</h1>
          <p className="text-sm text-navy/70 mb-4">Enter the admin password to continue.</p>
          <input
            className="input mb-4"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                sessionStorage.setItem('admin_token', pass);
                load(pass);
              }
            }}
            placeholder="Admin password"
          />
          {error && <div className="border-2 border-brand-red bg-brand-red/10 p-3 text-sm mb-3">{error}</div>}
          <button
            className="btn-primary w-full"
            disabled={loading}
            onClick={() => {
              sessionStorage.setItem('admin_token', pass);
              load(pass);
            }}
          >
            {loading ? 'Checking...' : 'Sign In'}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-display text-brand-red mb-4">Admin Dashboard</h1>
      <p className="text-navy/80 mb-6">Manage entries and settings for the YoYo Map.</p>

      {/* Main stats */}
      <div className="grid md:grid-cols-7 gap-3 mb-4 text-center">
        <Stat label="Total" value={data.stats.total} />
        <Stat label="Visible" value={data.stats.visible} />
        <Stat label="Pending" value={data.stats.pending} />
        <Stat label="Flagged" value={data.stats.flagged} color="text-brand-red" />
        <Stat label="Auto-hidden" value={data.stats.autoHidden} color={data.stats.autoHidden > 0 ? 'text-amber-600' : ''} />
        <Stat label="Minors" value={data.stats.minors} />
        <Stat label="Reports" value={data.stats.openReports} color={data.stats.openReports > 0 ? 'text-brand-red' : ''} />
      </div>

      {/* Entity type breakdown */}
      <div className="grid md:grid-cols-4 gap-3 mb-8 text-center">
        <Stat label="People" value={data.stats.byType.person} icon={<PersonIcon />} />
        <Stat label="Shops" value={data.stats.byType.shop} icon={<ShopIcon />} />
        <Stat label="Clubs" value={data.stats.byType.club} icon={<ClubIcon />} />
        <Stat label="Verified Shops" value={data.stats.verifiedOwners} icon={<VerifiedIcon />} />
      </div>

      {/* Reports section */}
      <section className="mb-10">
        <h2 className="text-2xl mb-4">Open reports</h2>
        {data.reports.length === 0 ? (
          <p className="text-navy/60 text-sm">No open reports.</p>
        ) : (
          <div className="space-y-2">
            {data.reports.map((r) => {
              const entry = data.entries.find((e) => e.id === r.entry_id);
              return (
                <div key={r.id} className="card text-sm">
                  <p><strong>Entry:</strong> {entry?.display_name || r.entry_id}</p>
                  <p><strong>Type:</strong> {entry?.entity_type || 'person'}</p>
                  <p><strong>Reason:</strong> <span className={getReasonColor(r.reason)}>{r.reason}</span></p>
                  {r.details && <p className="mt-2 text-navy/70">{r.details}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button className="btn-ghost py-1 px-3 text-xs" onClick={() => act('flag_entry', r.entry_id)}>
                      Hide entry
                    </button>
                    <button className="btn-ghost py-1 px-3 text-xs" onClick={() => act('delete_entry', r.entry_id)}>
                      Delete entry
                    </button>
                    <button className="btn-ghost py-1 px-3 text-xs" onClick={() => act('resolve_report', r.id)}>
                      Resolve report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Entries section */}
      <section>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Search box */}
          <input
            className="input py-1 text-sm w-48"
            type="text"
            placeholder="Search name, email, city..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            title="Search by name, email, or city"
          />
          <h2 className="text-2xl">All entries</h2>


          <button
            type="button"
            className="btn-ghost py-1 px-3 text-xs"
            onClick={sendAllReminders}
            disabled={loading}
            title="Email all unverified owners who are eligible (under the reminder cap, outside the cooldown window)."
          >
            Send all reminders
          </button>

          <button
            type="button"
            className="btn-ghost py-1 px-3 text-xs"
            onClick={() => regeocodeAll(false)}
            disabled={loading}
            title="One-time backfill: re-run geocoding for every entry that hasn't been re-geocoded yet. Uses the fixed structured-query geocoder that ignores county-centroid matches."
          >
            Re-geocode all
          </button>

          <button
            type="button"
            className="btn-ghost py-1 px-3 text-xs text-brand-red border border-brand-red"
            onClick={() => regeocodeAll(true)}
            disabled={loading}
            title="Force: Re-geocode ALL entries, even those already geocoded. Use with caution!"
          >
            Force Re-geocode All
          </button>

          <button
            type="button"
            className="btn-ghost py-1 px-3 text-xs"
            onClick={refreshMap}
            disabled={loading}
            title="Force refresh the map page to show new entries immediately."
          >
            {loading ? 'Refreshing…' : 'Refresh Map'}
          </button>

          {/* Entity type filter */}
          <select
            className="input py-1 text-sm w-auto"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value as EntityFilter)}
            title="Filter by entity type"
          >
            <option value="all">All types</option>
            <option value="person">People only</option>
            <option value="shop">Shops only</option>
            <option value="club">Clubs only</option>
          </select>

          {/* Status filter */}
          <select
            className="input py-1 text-sm w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            title="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="visible">Visible</option>
            <option value="pending">Pending</option>
            <option value="flagged">Flagged</option>
            <option value="auto_hidden">Auto-hidden</option>
          </select>

          {/* Sort controls */}
          <select
            className="input py-1 text-sm w-auto"
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1); }}
            title="Sort by column"
          >
            <option value="created_at">Newest</option>
            <option value="display_name">Name</option>
            <option value="email">Email</option>
            <option value="city">City</option>
          </select>
          <select
            className="input py-1 text-sm w-auto"
            value={direction}
            onChange={e => { setDirection(e.target.value as 'asc' | 'desc'); setPage(1); }}
            title="Sort direction"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>

          {/* Page size */}
          <select
            className="input py-1 text-sm w-auto"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            title="Entries per page"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>

          {/* Pagination controls */}
          <button
            className="btn-ghost py-1 px-2 text-xs"
            disabled={page === 1 || loading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-sm text-navy/60">Page {page}</span>
          <button
            className="btn-ghost py-1 px-2 text-xs"
            disabled={loading || (data && data.entries.length < pageSize)}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
          <span className="text-sm text-navy/60">
            Showing {data.entries.length} of {data.stats.total} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider border-b-2 border-navy">
              <tr>
                <th className="py-2">Type</th>
                <th>Name</th>
                <th>Email</th>
                <th>City</th>
                <th>Age</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((e) => (
                <tr key={e.id} className="border-b border-navy/10">
                  <td className="py-2">
                    <EntityTypeBadge type={e.entity_type} verified={e.verified_owner} />
                  </td>
                  <td>{e.display_name}</td>
                  <td className="text-xs">{e.email}</td>
                  <td>{e.city}, {e.region || e.country}</td>
                  <td>{e.age_band || '-'}</td>
                  <td>
                    <StatusBadge entry={e} />
                  </td>
                  <td className="space-x-1">
                    {!e.deleted_at && (
                      <EntryActions entry={e} act={act} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// Helper components
function Stat({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="card py-3">
      {icon && <div className="flex justify-center mb-1">{icon}</div>}
      <p className={`font-display text-3xl ${color || ''}`}>{value}</p>
      <p className="text-xs uppercase tracking-wider text-navy/60">{label}</p>
    </div>
  );
}

function EntityTypeBadge({ type, verified }: { type: AdminEntry['entity_type']; verified?: boolean }) {
  const entityType = type || 'person';
  const colors = {
    person: 'bg-[#B80000]/10 text-[#B80000]',
    shop: 'bg-[#2E8B57]/10 text-[#2E8B57]',
    club: 'bg-[#1B2A49]/10 text-[#1B2A49]',
  };
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${colors[entityType]}`}>
      {entityType}
      {entityType === 'shop' && verified && (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      )}
    </span>
  );
}

function StatusBadge({ entry }: { entry: AdminEntry }) {
  if (entry.deleted_at) return <span className="text-navy/40">deleted</span>;
  if (entry.is_flagged) return <span className="text-brand-red font-semibold">flagged</span>;
  if (entry.auto_hidden_by_reports) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
        auto-hidden
      </span>
    );
  }
  if (entry.is_visible) return <span className="text-green-700">visible</span>;
  return <span className="text-navy/60">pending</span>;
}

function EntryActions({ entry, act }: { entry: AdminEntry; act: (action: string, id: string) => void }) {
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

function getReasonColor(reason: string): string {
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
function PersonIcon() {
  return (
    <svg className="w-5 h-5 text-brand-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg className="w-5 h-5 text-[#2E8B57]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ClubIcon() {
  return (
    <svg className="w-5 h-5 text-[#1B2A49]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg className="w-5 h-5 text-[#2E8B57]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );
}

export default AdminPage;
