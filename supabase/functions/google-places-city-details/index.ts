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

    // Step 3: Extract photos
    const photos: string[] = [];

    // Get main page image (thumbnail)
    if (page.thumbnail?.source) {
      photos.push(page.thumbnail.source);
      console.log(`📸 Main thumbnail: ${page.thumbnail.source}`);
    }

    // Get additional images from the page
    if (page.images && Array.isArray(page.images)) {
      console.log(`🖼️ Found ${page.images.length} images in article`);

      // Filter and fetch image URLs (max 5 total)
      const imagePromises = page.images
        .slice(0, 10) // Get first 10 to filter
        .filter((img: any) => {
          const filename = img.title.toLowerCase();
          // Filter out icons, logos, flags, maps
          return (
            !filename.includes('bandera') &&
            !filename.includes('escudo') &&
            !filename.includes('logo') &&
            !filename.includes('coat') &&
            !filename.includes('flag') &&
            !filename.includes('map') &&
            !filename.includes('mapa') &&
            filename.match(/\.(jpg|jpeg|png)$/i)
          );
        })
        .slice(0, 5) // Max 5 images
        .map(async (img: any) => {
          try {
            // Get image URL using imageinfo
            const imgUrl = new URL('https://es.wikipedia.org/w/api.php');
            imgUrl.searchParams.set('action', 'query');
            imgUrl.searchParams.set('titles', img.title);
            imgUrl.searchParams.set('prop', 'imageinfo');
            imgUrl.searchParams.set('iiprop', 'url');
            imgUrl.searchParams.set('iiurlwidth', '800');
            imgUrl.searchParams.set('format', 'json');

            const imgResponse = await fetch(imgUrl.toString());
            if (imgResponse.ok) {
              const imgData = await imgResponse.json();
              const imgPages = imgData.query?.pages;
              if (imgPages) {
                const imgPage = Object.values(imgPages)[0] as any;
                const imageUrl = imgPage.imageinfo?.[0]?.thumburl || imgPage.imageinfo?.[0]?.url;
                if (imageUrl && !photos.includes(imageUrl)) {
                  return imageUrl;
                }
              }
            }
          } catch (error) {
            console.warn('⚠️ Failed to fetch image:', img.title);
          }
          return null;
        });

      const imageUrls = (await Promise.all(imagePromises)).filter(Boolean) as string[];
      photos.push(...imageUrls);
    }

    // Limit to 5 photos total
    const finalPhotos = photos.slice(0, 5);
    console.log(`✅ Total photos collected: ${finalPhotos.length}`);

    // Step 4: Try to get population from Wikidata (structured data)
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
    console.log('   Photos:', finalPhotos.length);

    return {
      description: extract || null,
      population: population || null,
      photos: finalPhotos,
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
    // STEP 1: Get Wikipedia data (FREE)
    // ========================================
    const wikipediaData = await fetchWikipediaData(cityName, countryName);

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
    const enrichedDetails = {
      // Wikipedia data (free, detailed)
      description: wikipediaData?.description,
      population: wikipediaData?.population,
      photos: wikipediaData?.photos || [], // ← FIX: Include photos from Wikipedia!

      // Google Places data (only technical info)
      timezone: googleData?.timezone,
      formattedAddress: googleData?.formattedAddress,
      types: googleData?.types || [],

      // Source attribution
      source:
        wikipediaData && googleData
          ? 'hybrid'
          : wikipediaData
            ? 'wikipedia'
            : googleData
              ? 'google'
              : 'none',
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
