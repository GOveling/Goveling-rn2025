// @ts-ignore Deno global
declare const Deno: any;

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

/**
 * Edge Function: google-places-city-details
 * Obtiene información detallada de una ciudad usando:
 * - Wikipedia API (GRATIS): description, population, extract
 * - Google Places API (New): timezone, coordinates (solo datos técnicos)
 *
 * Request body:
 * {
 *   cityName: string;
 *   stateName?: string;
 *   countryName: string;
 *   countryCode: string;
 * }
 *
 * Response:
 * {
 *   status: 'OK' | 'ERROR';
 *   details?: {
 *     description?: string;
 *     population?: string;
 *     timezone?: string;
 *     formattedAddress?: string;
 *     types?: string[];
 *     source?: 'wikipedia' | 'google' | 'hybrid';
 *   };
 *   error?: string;
 * }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GOOGLE_PLACES_KEY =
  Deno.env.get('GOOGLE_PLACES_API_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY');

const PEXELS_API_KEY = 'FiZKukOZgoEtIs4txpu4eyyvqynG8jXRe5gcdroujQiEd0K00Z2HRUbR';

/**
 * Fetch city landscape photos from Pexels API
 * Returns: array of photo URLs (max 6, landscape orientation)
 */
async function fetchPexelsCityPhotos(
  cityName: string,
  stateName: string,
  countryName: string
): Promise<string[]> {
  try {
    console.log(`🌄 Searching Pexels for landscape photos of: ${cityName}`);

    // Build search query with city, state/region, and country
    const searchQuery = `${cityName} ${stateName || ''} ${countryName} landscape scenic cityscape`;
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
      console.warn(`⚠️ No photos found for: ${cityName}, trying with just city name...`);

      // Fallback: try with just city name + country
      const fallbackQuery = `${cityName} ${countryName} landscape`;
      const fallbackUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(fallbackQuery)}&per_page=6&orientation=landscape`;

      const fallbackResponse = await fetch(fallbackUrl, {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.photos && fallbackData.photos.length > 0) {
          const photoUrls = fallbackData.photos.map((photo: any) => photo.src.large).slice(0, 6);
          console.log(`✅ Found ${photoUrls.length} photos (fallback search)`);
          return photoUrls;
        }
      }

      return [];
    }

    // Extract photo URLs (use 'large' size for good quality)
    const photoUrls = data.photos.map((photo: any) => photo.src.large).slice(0, 6);

    console.log(`✅ Found ${photoUrls.length} landscape photos for ${cityName}`);
    return photoUrls;
  } catch (error) {
    console.error('❌ Pexels photos fetch error:', error);
    return [];
  }
}

/**
 * Fetch city data from Wikipedia API (FREE)
 * Returns: description, population, extract
 */
async function fetchWikipediaData(cityName: string, countryName: string) {
  try {
    // Build search query
    const searchQuery = `${cityName} ${countryName}`;

    // Step 1: Search for the article
    const searchUrl = new URL('https://es.wikipedia.org/w/api.php');
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('list', 'search');
    searchUrl.searchParams.set('srsearch', searchQuery);
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('srlimit', '1');

    console.log('📚 Searching Wikipedia for:', searchQuery);

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      console.warn('⚠️ Wikipedia search failed');
      return null;
    }

    const searchData = await searchResponse.json();
    if (!searchData.query?.search?.[0]) {
      console.warn('⚠️ No Wikipedia article found for:', searchQuery);
      return null;
    }

    const pageTitle = searchData.query.search[0].title;
    console.log('📖 Found Wikipedia article:', pageTitle);

    // Step 2: Get article details with extract and pageprops
    const pageUrl = new URL('https://es.wikipedia.org/w/api.php');
    pageUrl.searchParams.set('action', 'query');
    pageUrl.searchParams.set('titles', pageTitle);
    pageUrl.searchParams.set('prop', 'extracts|pageprops|pageimages|images');
    pageUrl.searchParams.set('exintro', '1'); // Only introduction
    pageUrl.searchParams.set('explaintext', '1'); // Plain text
    pageUrl.searchParams.set('exsentences', '3'); // First 3 sentences
    pageUrl.searchParams.set('piprop', 'thumbnail|original');
    pageUrl.searchParams.set('pithumbsize', '800'); // High quality thumbnail
    pageUrl.searchParams.set('imlimit', '10'); // Get up to 10 images
    pageUrl.searchParams.set('format', 'json');

    const pageResponse = await fetch(pageUrl.toString());
    if (!pageResponse.ok) {
      console.warn('⚠️ Wikipedia page fetch failed');
      return null;
    }

    const pageData = await pageResponse.json();
    const pages = pageData.query?.pages;
    if (!pages) {
      return null;
    }

    const page = Object.values(pages)[0] as any;
    const extract = page.extract;

    // Step 3: Try to get population from Wikidata (structured data)
    let population = null;

    // Check if page has Wikidata ID
    const wikidataId = page.pageprops?.wikibase_item;
    if (wikidataId) {
      console.log(`🔗 Found Wikidata ID: ${wikidataId}`);

      try {
        // Query Wikidata for population (P1082)
        const wikidataUrl = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
        const wikidataResponse = await fetch(wikidataUrl);

        if (wikidataResponse.ok) {
          const wikidataData = await wikidataResponse.json();
          const entity = wikidataData.entities?.[wikidataId];

          // P1082 is the property for population
          const populationClaims = entity?.claims?.P1082;
          if (populationClaims && populationClaims.length > 0) {
            // Get the most recent population value
            const latestClaim = populationClaims[populationClaims.length - 1];
            const popValue = latestClaim.mainsnak?.datavalue?.value?.amount;

            if (popValue) {
              const num = parseInt(popValue.replace('+', ''));
              if (!isNaN(num) && num > 1000) {
                population = num.toLocaleString('es-CL');
                console.log(`   Wikidata population: ${population}`);
              }
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Wikidata fetch failed:', error);
      }
    }

    console.log('✅ Wikipedia data extracted');
    console.log('   Description:', extract ? `${extract.substring(0, 100)}...` : 'N/A');
    console.log('   Population:', population || 'N/A');

    return {
      description: extract || null,
      population: population || null,
      source: 'wikipedia' as const,
    };
  } catch (error) {
    console.error('❌ Wikipedia API error:', error);
    return null;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_PLACES_KEY) {
      console.error('❌ GOOGLE_PLACES_API_KEY not configured');
      return new Response(JSON.stringify({ status: 'ERROR', error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { cityName, stateName, countryName, countryCode } = body;

    if (!cityName || !countryName) {
      return new Response(
        JSON.stringify({ status: 'ERROR', error: 'cityName and countryName required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Searching for city: ${cityName}, ${countryName}`);

    // ========================================
    // STEP 1: Get Wikipedia data (FREE) + Pexels photos
    // ========================================
    const wikipediaData = await fetchWikipediaData(cityName, countryName);

    // Fetch Pexels photos separately
    console.log(`📸 Fetching Pexels photos for ${cityName}, ${countryName}...`);
    const photos = await fetchPexelsCityPhotos(cityName, stateName || '', countryName);
    console.log(`✅ Pexels photos fetched: ${photos.length}`);

    // ========================================
    // STEP 2: Get Google Places data for technical info only
    // (Only if API key is available)
    // ========================================
    let googleData = null;

    if (GOOGLE_PLACES_KEY) {
      console.log('📡 Fetching technical data from Google Places...');

      // Build search query
      const searchQuery = stateName
        ? `${cityName}, ${stateName}, ${countryName}`
        : `${cityName}, ${countryName}`;

      // Text Search to find the city
      const textSearchUrl = 'https://places.googleapis.com/v1/places:searchText';
      const textSearchBody = {
        textQuery: searchQuery,
        languageCode: 'es',
        maxResultCount: 1,
        includedType: 'locality',
      };

      try {
        const textSearchResponse = await fetch(textSearchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
            'X-Goog-FieldMask':
              'places.name,places.id,places.displayName,places.formattedAddress,places.location,places.types',
          },
          body: JSON.stringify(textSearchBody),
        });

        if (textSearchResponse.ok) {
          const textSearchData = await textSearchResponse.json();

          if (textSearchData.places?.[0]) {
            const place = textSearchData.places[0];
            const placeId = place.name || `places/${place.id}`;

            console.log(`✅ Found place ID: ${placeId}`);

            // Get Place Details for timezone only
            const detailsUrl = `https://places.googleapis.com/v1/${placeId}`;
            const detailsResponse = await fetch(detailsUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
                'X-Goog-FieldMask': 'utcOffsetMinutes,formattedAddress,types',
              },
            });

            if (detailsResponse.ok) {
              const detailsData = await detailsResponse.json();

              // Calculate timezone from UTC offset
              let timezone = undefined;
              if (detailsData.utcOffsetMinutes !== undefined) {
                const hours = Math.floor(Math.abs(detailsData.utcOffsetMinutes) / 60);
                const minutes = Math.abs(detailsData.utcOffsetMinutes) % 60;
                const sign = detailsData.utcOffsetMinutes >= 0 ? '+' : '-';
                timezone = `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              }

              googleData = {
                timezone,
                formattedAddress: detailsData.formattedAddress,
                types: detailsData.types || [],
              };

              console.log('✅ Google Places data obtained (timezone only)');
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Google Places API error (non-critical):', error);
      }
    } else {
      console.log('ℹ️ Google Places API key not configured, skipping technical data');
    }

    // ========================================
    // STEP 3: Merge data with priority: Wikipedia > Google
    // ========================================
    const enrichedDetails: any = {
      name: cityName,
      description: wikipediaData?.description || 'No description available',
      population: wikipediaData?.population || null,
      timezone: googleData?.timezone || null,
      formattedAddress: googleData?.formattedAddress || null,
      types: googleData?.types || [],
      photos: photos, // Use Pexels photos
      source: 'wikipedia+pexels',
    };

    console.log('✅ Final enriched details:', enrichedDetails);

    return new Response(JSON.stringify({ status: 'OK', details: enrichedDetails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Error in google-places-city-details:', error);
    return new Response(
      JSON.stringify({ status: 'ERROR', error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
