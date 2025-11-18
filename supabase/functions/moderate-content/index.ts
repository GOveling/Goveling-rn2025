/**
 * Edge Function: moderate-content
 *
 * Sistema de moderación de contenido para posts y comentarios.
 * FASE 1: Moderación de texto con bad-words
 * FASE 2: Agregará moderación de imágenes con AWS Rekognition
 *
 * Request body:
 * {
 *   content_type: 'post' | 'comment' | 'bio' | 'avatar' | 'username';
 *   text?: string;
 *   image_urls?: string[];
 *   user_id: string;
 * }
 *
 * Response:
 * {
 *   approved: boolean;
 *   reason?: string;
 *   message?: string;
 *   text_result?: {
 *     is_clean: boolean;
 *     detected_words?: string[];
 *     cleaned_text?: string;
 *   };
 *   image_results?: Array<{
 *     url: string;
 *     is_clean: boolean;
 *     labels?: Array<{ name: string; confidence: number }>;
 *   }>;
 *   moderation_log_id?: string;
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Bad words lists - Extended for ES, EN, FR
const BAD_WORDS_ES = [
  'puto',
  'puta',
  'mierda',
  'joder',
  'coño',
  'carajo',
  'pendejo',
  'verga',
  'chingar',
  'marica',
  'maricon',
  'huevon',
  'cabron',
];

const BAD_WORDS_EN = [
  'fuck',
  'shit',
  'bitch',
  'ass',
  'damn',
  'crap',
  'dick',
  'pussy',
  'bastard',
  'asshole',
  'motherfucker',
  'cock',
  'cunt',
];

const BAD_WORDS_FR = [
  'merde',
  'putain',
  'con',
  'connard',
  'salope',
  'enculé',
  'bordel',
  'chier',
  'pute',
  'bite',
  'couille',
];

const ALL_BAD_WORDS = [...BAD_WORDS_ES, ...BAD_WORDS_EN, ...BAD_WORDS_FR];

interface ModerationRequest {
  content_type: 'post' | 'comment' | 'bio' | 'avatar' | 'username';
  text?: string;
  image_urls?: string[];
  user_id: string;
}

interface TextModerationResult {
  is_clean: boolean;
  detected_words?: string[];
  cleaned_text?: string;
}

interface ImageModerationResult {
  url: string;
  is_clean: boolean;
  labels?: Array<{ name: string; confidence: number }>;
}

interface ModerationResponse {
  approved: boolean;
  reason?: string;
  message?: string;
  text_result?: TextModerationResult;
  image_results?: ImageModerationResult[];
  moderation_log_id?: string;
}

/**
 * Moderate text content
 */
function moderateText(text: string): TextModerationResult {
  const lowerText = text.toLowerCase();
  const detectedWords: string[] = [];

  // Check for bad words
  for (const word of ALL_BAD_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(lowerText)) {
      detectedWords.push(word);
    }
  }

  const isClean = detectedWords.length === 0;

  // Clean text by replacing bad words with asterisks
  let cleanedText = text;
  if (!isClean) {
    for (const word of detectedWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleanedText = cleanedText.replace(regex, '*'.repeat(word.length));
    }
  }

  return {
    is_clean: isClean,
    detected_words: isClean ? undefined : detectedWords,
    cleaned_text: isClean ? undefined : cleanedText,
  };
}

/**
 * Moderate images (Placeholder for Phase 2)
 * TODO: Integrate AWS Rekognition in Phase 2
 */
async function moderateImages(imageUrls: string[]): Promise<ImageModerationResult[]> {
  // Phase 1: Return all as clean (no image moderation yet)
  // Phase 2: Will integrate AWS Rekognition here
  return imageUrls.map((url) => ({
    url,
    is_clean: true,
    labels: [],
  }));
}

/**
 * Log moderation result to database
 */
async function logModeration(
  supabase: ReturnType<typeof createClient>,
  request: ModerationRequest,
  approved: boolean,
  reason: string | undefined,
  textResult: TextModerationResult | undefined,
  imageResults: ImageModerationResult[] | undefined
): Promise<string | undefined> {
  try {
    const { data, error } = await supabase
      .from('moderation_logs')
      .insert({
        user_id: request.user_id,
        content_type: request.content_type,
        content_text: request.text,
        image_urls: request.image_urls,
        status: approved ? 'approved' : 'rejected',
        reason,
        text_violations:
          textResult && !textResult.is_clean ? { detected_words: textResult.detected_words } : null,
        image_violations: imageResults?.filter((r) => !r.is_clean).length
          ? { flagged_images: imageResults.filter((r) => !r.is_clean) }
          : null,
        auto_moderated: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Moderation] Error logging to database:', error);
      return undefined;
    }

    return data?.id;
  } catch (err) {
    console.error('[Moderation] Exception logging to database:', err);
    return undefined;
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse request
    const request: ModerationRequest = await req.json();

    // Validate request
    if (!request.user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!request.content_type) {
      return new Response(JSON.stringify({ error: 'content_type is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const response: ModerationResponse = {
      approved: true,
    };

    // Moderate text if provided
    if (request.text && request.text.trim().length > 0) {
      const textResult = moderateText(request.text);
      response.text_result = textResult;

      if (!textResult.is_clean) {
        response.approved = false;
        response.reason = 'inappropriate_language';
        response.message = 'Text contains inappropriate language';
      }
    }

    // Moderate images if provided (Phase 2)
    if (request.image_urls && request.image_urls.length > 0) {
      const imageResults = await moderateImages(request.image_urls);
      response.image_results = imageResults;

      const hasInappropriateImages = imageResults.some((r) => !r.is_clean);
      if (hasInappropriateImages) {
        response.approved = false;
        response.reason = 'inappropriate_image';
        response.message = 'One or more images contain inappropriate content';
      }
    }

    // Log moderation result
    const logId = await logModeration(
      supabase,
      request,
      response.approved,
      response.reason,
      response.text_result,
      response.image_results
    );

    if (logId) {
      response.moderation_log_id = logId;
    }

    // Return response
    const status = response.approved ? 200 : 400;
    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Moderation] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
