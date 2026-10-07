import type { AdminEntry, EntityFilter, LocationStatusFilter, StatusFilter } from './types';

export interface EntryFilters {
  entityFilter: EntityFilter;
  statusFilter: StatusFilter;
  locationStatusFilter: LocationStatusFilter;
}

/** The entries on the current page that match the type, status and location filters. */
export function filterEntries(
  entries: AdminEntry[],
  { entityFilter, statusFilter, locationStatusFilter }: EntryFilters,
): AdminEntry[] {
  return entries.filter((e) => {
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

    if (locationStatusFilter !== 'all' && e.location_status !== locationStatusFilter) {
      return false;
    }

    return true;
  });
}
