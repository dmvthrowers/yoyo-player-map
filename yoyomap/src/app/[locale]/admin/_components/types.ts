// Shapes returned by /api/admin/data and the filters the dashboard applies to them.

export interface AdminEntry {
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
  location_status: 'verified' | 'auto_geocoded' | 'needs_research' | 'awaiting_owner_response' | 'dead_pin';
}

export interface AdminData {
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
    locationStatus: {
      verified: number;
      auto_geocoded: number;
      needs_research: number;
      awaiting_owner_response: number;
      dead_pin: number;
    };
  };
}

export type EntityFilter = 'all' | 'person' | 'shop' | 'club';
export type StatusFilter = 'all' | 'visible' | 'pending' | 'flagged' | 'auto_hidden';
export type LocationStatusFilter = 'all' | AdminEntry['location_status'];
