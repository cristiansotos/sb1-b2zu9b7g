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

export interface MemoryRecording {
  id: string;
  memory_id: string;
  question: string;
  audio_url?: string;
  transcript?: string;
  audio_duration_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface MemoryWithDetails extends MemoryEntry {
  images: MemoryImage[];
  tags: MemoryTag[];
  measurements: MemoryMeasurement[];
  recordings: MemoryRecording[];
}

export interface CreateMemoryData {
  title: string;
  memory_date: string;
  notes?: string;
  is_quote?: boolean;
  quote_text?: string;
  place?: string;
  developmental_stage?: string;
  images?: File[];
  audioBlob?: Blob;
  audioDuration?: number;
  tags?: { name: string; type: string }[];
  measurements?: {
    height_cm?: number;
    weight_kg?: number;
    measurement_date: string;
  };
}

export interface UpdateMemoryData extends Partial<CreateMemoryData> {
  id: string;
}

export interface MemoryFilters {
  searchTerm?: string;
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface MemoryStats {
  totalMemories: number;
  memoriesThisWeek: number;
  activityStreak: number;
  totalImages: number;
  totalRecordings: number;
}