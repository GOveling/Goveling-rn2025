// src/types/place.ts
// Types for place survey and interest level functionality

export type InterestLevel = 'must_see' | 'maybe' | 'just_in_case';

export interface PlaceSurveyData {
  interest_level: InterestLevel;
  user_note?: string;
}

export interface TripPlace {
  id: string;
  trip_id: string;
  place_id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  category?: string;
  added_by?: string;
  added_at?: string;
  notes?: string;
  visited?: boolean;
  visit_date?: string;
  rating?: number;
  photo_url?: string;
  interest_level?: InterestLevel;
  user_note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InterestLevelConfig {
  key: InterestLevel;
  icon: string;
  sortOrder: number;
  color: string;
}

export const INTEREST_LEVEL_CONFIG: Record<InterestLevel, InterestLevelConfig> = {
  must_see: {
    key: 'must_see',
    icon: '⭐⭐⭐',
    sortOrder: 1,
    color: '#FFD700',
  },
  maybe: {
    key: 'maybe',
    icon: '⭐⭐',
    sortOrder: 2,
    color: '#FFA500',
  },
  just_in_case: {
    key: 'just_in_case',
    icon: '⭐',
    sortOrder: 3,
    color: '#C0C0C0',
  },
};
