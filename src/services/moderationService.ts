import { supabase } from '../lib/supabase';

export interface ModerationRequest {
  content_type: 'post' | 'comment' | 'bio' | 'avatar' | 'username';
  text?: string;
  image_urls?: string[];
  user_id: string;
}

export interface TextModerationResult {
  is_clean: boolean;
  detected_words?: string[];
  cleaned_text?: string;
}

export interface ImageModerationResult {
  is_safe: boolean;
  labels?: Array<{
    name: string;
    confidence: number;
  }>;
  moderation_labels?: Array<{
    name: string;
    confidence: number;
  }>;
}

export interface ModerationResponse {
  approved: boolean;
  text_result?: TextModerationResult;
  image_result?: ImageModerationResult;
  reason?: string;
  message?: string;
}

export interface ModerationError {
  code: 'INAPPROPRIATE_TEXT' | 'INAPPROPRIATE_IMAGE' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details?: {
    detected_words?: string[];
    cleaned_text?: string;
    unsafe_labels?: string[];
  };
}

export class ModerationService {
  /**
   * Moderate content (text and/or images)
   */
  static async moderateContent(request: ModerationRequest): Promise<ModerationResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: request,
      });

      if (error) {
        throw new Error(error.message || 'Moderation request failed');
      }

      if (!data) {
        throw new Error('No response from moderation service');
      }

      return data as ModerationResponse;
    } catch (error) {
      console.error('Moderation error:', error);
      throw this.handleModerationError(error);
    }
  }

  /**
   * Moderate text only
   */
  static async moderateText(
    text: string,
    userId: string,
    contentType: 'post' | 'comment' | 'bio' | 'username'
  ): Promise<ModerationResponse> {
    return this.moderateContent({
      content_type: contentType,
      text,
      user_id: userId,
    });
  }

  /**
   * Moderate images only
   */
  static async moderateImages(
    imageUrls: string[],
    userId: string,
    contentType: 'post' | 'avatar'
  ): Promise<ModerationResponse> {
    return this.moderateContent({
      content_type: contentType,
      image_urls: imageUrls,
      user_id: userId,
    });
  }

  /**
   * Moderate post (text + images)
   */
  static async moderatePost(
    text: string | undefined,
    imageUrls: string[],
    userId: string
  ): Promise<ModerationResponse> {
    return this.moderateContent({
      content_type: 'post',
      text,
      image_urls: imageUrls,
      user_id: userId,
    });
  }

  /**
   * Check if content is safe to post
   */
  static async isContentSafe(request: ModerationRequest): Promise<boolean> {
    try {
      const result = await this.moderateContent(request);
      return result.approved;
    } catch {
      return false;
    }
  }

  /**
   * Get moderation history for user
   */
  static async getModerationHistory(
    userId: string,
    limit: number = 20
  ): Promise<
    Array<{
      id: string;
      content_type: string;
      is_approved: boolean;
      moderation_reason: string | null;
      created_at: string;
    }>
  > {
    const { data, error } = await supabase
      .from('moderation_logs')
      .select('id, content_type, is_approved, moderation_reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch moderation history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Handle moderation errors
   */
  private static handleModerationError(error: unknown): ModerationError {
    if (error instanceof Error) {
      if (error.message.includes('inappropriate language')) {
        return {
          code: 'INAPPROPRIATE_TEXT',
          message: 'Text contains inappropriate language',
        };
      }
      if (error.message.includes('inappropriate content')) {
        return {
          code: 'INAPPROPRIATE_IMAGE',
          message: 'Image contains inappropriate content',
        };
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return {
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection.',
        };
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred during moderation',
    };
  }

  /**
   * Format moderation error for display
   */
  static formatErrorMessage(error: ModerationError, locale: 'en' | 'es' | 'fr' = 'en'): string {
    const messages = {
      en: {
        INAPPROPRIATE_TEXT: 'Your text contains inappropriate language. Please revise it.',
        INAPPROPRIATE_IMAGE: 'One or more images contain inappropriate content.',
        NETWORK_ERROR: 'Network error. Please try again.',
        UNKNOWN_ERROR: 'An error occurred. Please try again later.',
      },
      es: {
        INAPPROPRIATE_TEXT: 'Tu texto contiene lenguaje inapropiado. Por favor revísalo.',
        INAPPROPRIATE_IMAGE: 'Una o más imágenes contienen contenido inapropiado.',
        NETWORK_ERROR: 'Error de red. Por favor intenta de nuevo.',
        UNKNOWN_ERROR: 'Ocurrió un error. Por favor intenta más tarde.',
      },
      fr: {
        INAPPROPRIATE_TEXT: 'Votre texte contient un langage inapproprié. Veuillez le réviser.',
        INAPPROPRIATE_IMAGE: 'Une ou plusieurs images contiennent du contenu inapproprié.',
        NETWORK_ERROR: 'Erreur réseau. Veuillez réessayer.',
        UNKNOWN_ERROR: 'Une erreur est survenue. Veuillez réessayer plus tard.',
      },
    };

    return messages[locale][error.code] || messages[locale].UNKNOWN_ERROR;
  }

  /**
   * Pre-validate text before moderation
   */
  static preValidateText(text: string): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: 'Text cannot be empty' };
    }

    if (text.length > 2000) {
      return { valid: false, error: 'Text exceeds maximum length (2000 characters)' };
    }

    return { valid: true };
  }

  /**
   * Get cleaned text from moderation result
   */
  static getCleanedText(result: ModerationResponse): string | undefined {
    return result.text_result?.cleaned_text;
  }

  /**
   * Get detected inappropriate words
   */
  static getDetectedWords(result: ModerationResponse): string[] {
    return result.text_result?.detected_words || [];
  }
}
