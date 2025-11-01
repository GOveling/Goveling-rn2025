// @ts-ignore Deno global
declare const Deno: any;

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

/**
 * Edge Function: pexels-country-photos
 * Obtiene fotos de paisajes de un país desde Pexels API
 *
 * Request body:
 * {
 *   countryName: string; // e.g., "Chile", "France"
 *   countryCode: string; // e.g., "CL", "FR"
 * }
 *
 * Response:
 * {
 *   photos: string[]; // Max 6 photo URLs (landscape orientation)
 * }
 */

const PEXELS_API_KEY = 'FiZKukOZgoEtIs4txpu4eyyvqynG8jXRe5gcdroujQiEd0K00Z2HRUbR';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Fetch country landscape photos from Pexels API
 * Returns: array of photo URLs (max 6, landscape orientation)
 */
async function fetchPexelsCountryPhotos(countryName: string): Promise<string[]> {
  try {
    console.log(`🌄 Searching Pexels for landscape photos of: ${countryName}`);

    // Search for landscape/nature photos of the country
    const searchQuery = `${countryName} landscape nature scenic`;
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=6&orientation=landscape`;

    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`❌ Pexels API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.photos || data.photos.length === 0) {
      console.warn(`⚠️ No photos found for: ${countryName}`);
      return [];
    }

    // Extract photo URLs (use 'large' size for good quality)
    const photoUrls = data.photos.map((photo: any) => photo.src.large).slice(0, 6);

    console.log(`✅ Found ${photoUrls.length} landscape photos for ${countryName}`);
    return photoUrls;
  } catch (error) {
    console.error('❌ Pexels photos fetch error:', error);
    return [];
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { countryName } = body;

    if (!countryName) {
      return new Response(JSON.stringify({ photos: [] }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Fetching landscape photos for country: ${countryName}`);

    const photos = await fetchPexelsCountryPhotos(countryName);

    return new Response(JSON.stringify({ photos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ photos: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
