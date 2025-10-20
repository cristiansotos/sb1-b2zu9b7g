export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string; // Deprecated: kept for backward compatibility
  created_by?: string;
  title: string;
  relationship: string;
  photo_url?: string;
  progress: number;
  is_complete: boolean;
  mode: 'adult' | 'child';
  date_of_birth?: string;
  created_at: string;
  updated_at: string;
}

export type FamilyRole = 'owner' | 'editor' | 'viewer';

export interface FamilyGroup {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  settings?: Record<string, any>;
}

export interface FamilyMember {
  id: string;
  family_group_id: string;
  user_id: string;
  role: FamilyRole;
  invited_by?: string;
  joined_at: string;
  user?: User;
}

export interface StoryFamilyGroup {
  id: string;
  story_id: string;
  family_group_id: string;
  added_by?: string;
  added_at: string;
  family?: FamilyGroup;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface FamilyInvitation {
  id: string;
  family_group_id: string;
  email: string;
  role: FamilyRole;
  invited_by?: string;
  token: string;
  expires_at: string;
  status: InvitationStatus;
  accepted_at?: string;
  created_at: string;
  inviter?: User;
  family?: FamilyGroup;
}

export type PermissionKey =
  | 'story.create'
  | 'story.edit.own'
  | 'story.edit.all'
  | 'story.delete.own'
  | 'story.delete.all'
  | 'story.associate'
  | 'recording.add'
  | 'recording.edit'
  | 'recording.delete'
  | 'image.add'
  | 'image.delete'
  | 'member.invite'
  | 'member.invite.owner'
  | 'member.invite.editor'
  | 'member.invite.viewer'
  | 'member.remove'
  | 'member.change_role'
  | 'family.edit'
  | 'family.delete'
  | 'content.view'
  | 'content.export';

export interface RolePermission {
  id: string;
  role_name: FamilyRole;
  permission_key: PermissionKey;
  is_enabled: boolean;
  updated_by?: string;
  updated_at: string;
}

export interface FamilyGroupWithMembers extends FamilyGroup {
  members: FamilyMember[];
  member_count: number;
  user_role: FamilyRole;
}

export interface StoryWithFamilies extends Story {
  families: StoryFamilyGroup[];
}

export interface Chapter {
  id: string;
  story_id: string;
  title: string;
  order: number;
  custom_questions: string[];
  question_order: string[];
  created_at: string;
  updated_at: string;
}

export interface TranscriptFormatted {
  html: string;
  plain: string;
  version: number;
}

export interface Recording {
  id: string;
  chapter_id?: string;
  memory_id?: string;
  question: string;
  audio_url?: string;
  transcript?: string;
  transcript_formatted?: TranscriptFormatted;
  has_speech_detected: boolean;
  audio_duration_ms?: number;
  silence_ratio?: number;
  audio_energy_average?: number;
  confidence_score?: number;
  validation_flags?: string[];
  quality_warnings?: string[];
  transcription_attempts?: number;
  last_transcription_error?: string;
  created_at: string;
  updated_at: string;
  transcribing?: boolean; // For UI loading state
}

export interface Image {
  id: string;
  chapter_id: string;
  question: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface ShareToken {
  id: string;
  story_id: string;
  token: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  user_email: string;
  message: string;
  created_at: string;
  updated_at: string;
}