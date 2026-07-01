export type UserRole = "student" | "admin" | "technician";

export type MaintenanceCategory =
  | "electrical"
  | "plumbing"
  | "cleaning"
  | "hvac"
  | "infrastructure"
  | "security"
  | "other";

export type DashboardData = {
  totals: {
    reports: number;
    open_incidents: number;
    unclaimed_items: number;
    pending_claims: number;
  };
  reports_by_status: Record<string, number>;
  reports_by_type: Record<string, number>;
  reports_by_building: Record<string, number>;
  maintenance_by_urgency: Record<string, number>;
  maintenance_by_category: Record<string, number>;
};

export type CampusZone = {
  id: string;
  name: string;
  building: string;
  floor: string | null;
  area_type: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at?: string;
};

export type ProfileSummary = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type TechnicianSummary = {
  id: string;
  specialty: MaintenanceCategory | null;
  active: boolean;
  created_at: string;
};

export type Profile = ProfileSummary & {
  technicians?: TechnicianSummary[] | TechnicianSummary | null;
};

export type Technician = TechnicianSummary & {
  profiles?: ProfileSummary | null;
};

export type Report = {
  id: string;
  created_by: string;
  type: "maintenance" | "lost_item" | "found_item" | "unknown";
  status: string;
  title: string;
  description: string;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  ai_confidence: number | null;
  classification_reason: string | null;
  created_at: string;
  updated_at: string;
  campus_zones?: CampusZone | null;
};

export type MaintenanceIncident = {
  report_id: string;
  category: string;
  urgency: string;
  assigned_to: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  reports: Report | null;
};

export type LostItem = {
  report_id: string;
  item_name: string;
  item_category: string;
  color: string | null;
  brand: string | null;
  distinguishing_marks: string | null;
  status: string;
  custody_location: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  reports: Report | null;
};

export type Claim = {
  id: string;
  lost_item_id: string;
  claimed_by: string;
  status: string;
  evidence: string;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  lost_items: (LostItem & { reports: Report | null }) | null;
  claimant?: {
    email: string;
    full_name: string;
  } | null;
};

export type Match = {
  id: string;
  source_report_id: string;
  target_report_id: string;
  score: number;
  reason: string;
  status: string;
  created_at: string;
  source?: Report | null;
  target?: Report | null;
};

export type AppNotification = {
  id: string;
  user_id: string;
  report_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type SystemSettings = {
  general: {
    institution_name: string;
    campus_name: string;
    timezone: string;
    language: string;
    support_email: string;
  };
  notifications: {
    email_enabled: boolean;
    push_enabled: boolean;
    daily_summary: boolean;
    notify_on_new_incident: boolean;
    notify_on_status_change: boolean;
    notify_on_new_object: boolean;
    notify_on_match: boolean;
  };
  maintenance: {
    auto_assign: boolean;
    default_sla_hours: number;
    require_photos: boolean;
    escalation_enabled: boolean;
    escalation_hours: number;
  };
  lost_found: {
    retention_days: number;
    auto_archive: boolean;
    auto_archive_days: number;
    require_photo: boolean;
    public_catalog: boolean;
    matching_notes: string;
  };
};
