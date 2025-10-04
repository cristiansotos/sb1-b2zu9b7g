export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
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
  photo_url?: string;
  has_speech_detected: boolean;
  duration_seconds?: number;
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

export interface MemoryEntry {
  id: string;
  story_id: string;
  title: string;
  memory_date: string;
  notes?: string;
  photo_url?: string;
  is_quote: boolean;
  quote_text?: string;
  place?: string;
  developmental_stage?: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryImage {
  id: string;
  memory_id: string;
  image_url: string;
  created_at: string;
}

export interface MemoryTag {
  id: string;
  memory_id: string;
  tag_name: string;
  tag_type: string;
  created_at: string;
}

export interface MemoryMeasurement {
  id: string;
  memory_id: string;
  height_cm?: number;
  weight_kg?: number;
  measurement_date: string;
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