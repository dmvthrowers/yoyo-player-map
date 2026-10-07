import type { AdminEntry } from './types';
import { EntityTypeBadge, StatusBadge, LocationStatusBadge, EntryActions } from './ui';

export function EntriesTable({ entries, act }: {
  entries: AdminEntry[];
  act: (action: string, id: string) => void;
}) {
  return (
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
            <th>Location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
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
              <td>
                <LocationStatusBadge status={e.location_status} />
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
  );
}
