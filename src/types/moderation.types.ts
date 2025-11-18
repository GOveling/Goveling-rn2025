// src/types/moderation.types.ts
// Type definitions for content moderation

export type ContentType = 'post' | 'comment' | 'bio' | 'avatar' | 'username';

export type ModerationStatus = 'approved' | 'rejected' | 'pending_review';

export interface ModerationLog {
  id: string;
  user_id: string;
  content_type: ContentType;
  content_id: string | null;
  content_text: string | null;
  image_urls: string[] | null;
  status: ModerationStatus;
  reason: string | null;
  text_violations: Record<string, unknown> | null;
  image_violations: Record<string, unknown> | null;
  confidence_score: number | null;
  auto_moderated: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// Text Moderation

export interface TextModerationResult {
  is_clean: boolean;
  cleaned_text?: string;
  detected_words?: string[];
  severity?: 'low' | 'medium' | 'high';
}

// Image Moderation (AWS Rekognition)

export type ImageModerationLabelType =
  | 'Explicit Nudity'
  | 'Suggestive'
  | 'Violence'
  | 'Visually Disturbing'
  | 'Rude Gestures'
  | 'Drugs'
  | 'Tobacco'
  | 'Alcohol'
  | 'Gambling'
  | 'Hate Symbols';

export interface ImageModerationLabel {
  name: ImageModerationLabelType;
  confidence: number;
  parent_name?: string;
}

export interface ImageModerationResult {
  is_clean: boolean;
  labels: ImageModerationLabel[];
  highest_confidence?: number;
}

// Combined Moderation

export interface ContentModerationRequest {
  text?: string;
  image_urls?: string[];
  content_type: ContentType;
  user_id: string;
}

export interface ContentModerationResponse {
  approved: boolean;
  reason?: string;
  message?: string;
  text_result?: TextModerationResult;
  image_results?: ImageModerationResult[];
  moderation_log_id?: string;
}

// Moderation Config

export interface ModerationConfig {
  text: {
    enabled: boolean;
    strict_mode: boolean;
    custom_words: string[];
    languages: string[];
  };
  image: {
    enabled: boolean;
    min_confidence: number;
    blocked_labels: ImageModerationLabelType[];
  };
}

// Error types

export interface ModerationError {
  code: 'INAPPROPRIATE_TEXT' | 'INAPPROPRIATE_IMAGE' | 'VALIDATION_ERROR' | 'SERVICE_ERROR';
  message: string;
  details?: {
    field?: string;
    detected_violations?: string[];
    labels?: ImageModerationLabel[];
  };
}

// UI Feedback

export interface ModerationFeedback {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  suggestions?: string[];
  can_retry: boolean;
}
