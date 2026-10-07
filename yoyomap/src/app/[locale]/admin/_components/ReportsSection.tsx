import type { AdminData } from './types';
import { getReasonColor } from './ui';

export function ReportsSection({ reports, entries, act }: {
  reports: AdminData['reports'];
  entries: AdminData['entries'];
  act: (action: string, id: string) => void;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl mb-4">Open reports</h2>
      {reports.length === 0 ? (
        <p className="text-navy/60 text-sm">No open reports.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const entry = entries.find((e) => e.id === r.entry_id);
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
  );
}
