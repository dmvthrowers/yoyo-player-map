'use client';

import { useState, useEffect } from 'react';
import { apiErrorMessage } from '@/lib/api-error-message';
import type { AdminData, AdminEntry, EntityFilter, LocationStatusFilter, StatusFilter } from './_components/types';
import { filterEntries } from './_components/filters';
import { LoginForm } from './_components/LoginForm';
import { StatsPanel } from './_components/StatsPanel';
import { ReportsSection } from './_components/ReportsSection';
import { EntriesTable } from './_components/EntriesTable';
import { prettyLocationStatus } from './_components/ui';

const AdminPage = () => {
  const [pass, setPass] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [locationStatusFilter, setLocationStatusFilter] = useState<LocationStatusFilter>('all');
  const [bulkStatus, setBulkStatus] = useState<AdminEntry['location_status']>('needs_research');
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
      } else {
        const body = await res.json().catch(() => null);
        setError(apiErrorMessage(body, 'Could not load admin data.'));
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
      // Restoring the saved password from sessionStorage on mount is a one-time sync with the
      // browser; load() is the data fetch. Item 3.6 (split this page) can revisit both.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPass(saved);
      load(saved);
    }
    // eslint-disable-next-line
  }, []);

  // Reload on page/sort/search change
  useEffect(() => {
    if (!authed || !pass) return;
    // A data fetch: load() flips its loading flag before awaiting the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setError(apiErrorMessage(body, 'Action failed.'));
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
        setError(apiErrorMessage(body, 'Bulk send failed.'));
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
        setError(apiErrorMessage(body, 'Map refresh failed.'));
      }
    } catch {
      setError('Network error during map refresh.');
    } finally {
      setLoading(false);
    }
  }

  async function bulkSetLocationStatus() {
    const ids = filteredEntries.filter((e) => !e.deleted_at).map((e) => e.id);
    if (ids.length === 0) {
      setError('No entries in the current filter.');
      return;
    }
    if (!confirm(`Set location status to "${prettyLocationStatus(bulkStatus)}" for ${ids.length} entries?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': pass },
        body: JSON.stringify({ action: 'set_location_status', ids, locationStatus: bulkStatus }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiErrorMessage(body, 'Bulk status update failed.'));
      } else {
        setError(`Updated ${body?.updated ?? ids.length} entries.`);
        load(pass);
      }
    } catch {
      setError('Network error during bulk status update.');
    } finally {
      setLoading(false);
    }
  }

  async function sendLocationOutreach() {
    const ids = filteredEntries.filter((e) => !e.deleted_at).map((e) => e.id);
    if (ids.length === 0) {
      setError('No entries in the current filter.');
      return;
    }
    if (!confirm(`Send "Confirm your city" outreach to ${ids.length} entries?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': pass },
        body: JSON.stringify({ action: 'send_location_outreach', ids }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiErrorMessage(body, 'Outreach send failed.'));
      } else {
        setError(`Outreach complete — sent: ${body?.sent ?? 0}, queued: ${body?.queued ?? 0}, failed: ${body?.failed ?? 0}`);
        load(pass);
      }
    } catch {
      setError('Network error during outreach send.');
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
          setError(apiErrorMessage(body, 'Bulk re-geocode failed.'));
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

  const filteredEntries = filterEntries(data?.entries ?? [], { entityFilter, statusFilter, locationStatusFilter });

  if (!authed) {
    return (
      <LoginForm
        pass={pass}
        setPass={setPass}
        error={error}
        loading={loading}
        onSignIn={() => {
          sessionStorage.setItem('admin_token', pass);
          load(pass);
        }}
      />
    );
  }

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-display text-brand-red mb-4">Admin Dashboard</h1>
      <p className="text-navy/80 mb-6">Manage entries and settings for the YoYo Map.</p>

      <StatsPanel stats={data.stats} />

      <ReportsSection reports={data.reports} entries={data.entries} act={act} />

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

          <select
            className="input py-1 text-sm w-auto"
            value={locationStatusFilter}
            onChange={(e) => setLocationStatusFilter(e.target.value as LocationStatusFilter)}
            title="Filter by location status"
          >
            <option value="all">All location statuses</option>
            <option value="verified">Location verified</option>
            <option value="auto_geocoded">Auto geocoded</option>
            <option value="needs_research">Needs research</option>
            <option value="awaiting_owner_response">Awaiting owner response</option>
            <option value="dead_pin">Dead pin</option>
          </select>

          <select
            className="input py-1 text-sm w-auto"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as AdminEntry['location_status'])}
            title="Bulk set location status for filtered entries"
          >
            <option value="verified">Set: verified</option>
            <option value="auto_geocoded">Set: auto_geocoded</option>
            <option value="needs_research">Set: needs_research</option>
            <option value="awaiting_owner_response">Set: awaiting_owner_response</option>
            <option value="dead_pin">Set: dead_pin</option>
          </select>
          <button
            type="button"
            className="btn-ghost py-1 px-3 text-xs"
            disabled={loading}
            onClick={bulkSetLocationStatus}
            title="Apply the chosen location status to all currently filtered entries."
          >
            Bulk set location status
          </button>
          <button
            type="button"
            className="btn-ghost py-1 px-3 text-xs"
            disabled={loading}
            onClick={sendLocationOutreach}
            title="Send confirm-city outreach email to all currently filtered entries."
          >
            Send location outreach
          </button>

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

        <EntriesTable entries={filteredEntries} act={act} />
      </section>
    </div>
  );
};

export default AdminPage;
