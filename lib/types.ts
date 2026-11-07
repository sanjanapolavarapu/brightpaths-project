export type Role = "admin" | "volunteer" | "intern";
export type AccountStatus = "applicant" | "active" | "inactive" | "alumni";
export type BackgroundCheck = "not_started" | "pending" | "approved" | "expired";
export type ApplicationStatus =
  | "submitted"
  | "interview"
  | "background_check"
  | "approved"
  | "rejected";
export type EventStatus = "draft" | "open" | "cancelled" | "completed";
export type SignupStatus = "signed_up" | "waitlist" | "cancelled" | "attended" | "no_show";
export type Channel = "email" | "sms";

export type User = {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: Role;
  account_status: AccountStatus;
  background_check: BackgroundCheck;
  availability: string;
  created_at: string;
};

export type Tag = {
  id: number;
  name: string;
  requires_background: number;
};

export type PersonRow = User & {
  tag_names: string;
  hours_total: number;
};

export type ApplicationRow = {
  id: number;
  user_id: number;
  role_interest: "volunteer" | "intern";
  why_join: string;
  experience: string;
  availability: string;
  interests: string;
  volunteer_as: string;
  cadence: string;
  other_help: string;
  status: ApplicationStatus;
  submitted_at: string;
  updated_at: string;
  name: string;
  email: string;
  phone: string;
};

export type EventRow = {
  id: number;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  minimum_volunteers: number;
  hours_credit: number;
  required_background_check: number;
  status: EventStatus;
  created_by: number;
  created_at: string;
};

export type EventDetail = EventRow & {
  tags: Tag[];
  signed_up: number;
};

export type SignupRow = {
  id: number;
  event_id: number;
  user_id: number;
  status: SignupStatus;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  account_status: AccountStatus;
  background_check: BackgroundCheck;
};

export type HoursRow = {
  id: number;
  user_id: number;
  event_id: number | null;
  hours: number;
  served_on: string;
  note: string;
  logged_by: number;
  created_at: string;
  event_title: string | null;
  person_name?: string;
};

export type NoteRow = {
  id: number;
  user_id: number;
  author_id: number;
  body: string;
  created_at: string;
  author_name: string;
};

export type MessageRow = {
  id: number;
  channel: Channel;
  subject: string;
  body: string;
  filter_summary: string;
  sent_by: number;
  sent_at: string;
  sender_name?: string;
  recipient_count?: number;
};

export type NotificationRow = {
  id: number;
  user_id: number;
  kind: string;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

export type ParticipationRow = {
  id: number;
  status: SignupStatus;
  title: string;
  starts_at: string;
  location: string;
  event_status: EventStatus;
  event_id: number;
};

export type RecipientFilters = {
  role: "" | "volunteer" | "intern";
  backgroundApproved: boolean;
  includeArchived: boolean;
  tagIds: number[];
};

export type PeopleFilters = {
  q: string;
  role: string;
  status: string;
  statuses: AccountStatus[];
  tagId: number;
  background: string;
};
