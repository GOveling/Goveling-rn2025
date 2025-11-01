// @ts-ignore Deno global
declare const Deno: any;

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

/**
 * Edge Function: wikipedia-country-photos
 * Obtiene fotos de un país desde Wikipedia (GRATIS)
 *
 * Request body:
 * {
 *   countryName: string; // e.g., "Chile", "France"
 * }
 *
 * Response:
 * {
 *   status: 'OK' | 'ERROR';
 *   photos?: string[]; // Max 5 photo URLs
 *   error?: string;
 * }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Fetch country photos from Wikipedia API (FREE)
 * Returns: array of photo URLs (max 5)
 */
async function fetchWikipediaPhotos(countryName: string): Promise<string[]> {
  try {
    // Step 1: Search for the country article
    const searchUrl = new URL('https://es.wikipedia.org/w/api.php');
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('list', 'search');
    searchUrl.searchParams.set('srsearch', countryName);
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('srlimit', '1');

    console.log('📚 Searching Wikipedia for:', countryName);

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      console.warn('⚠️ Wikipedia search failed');
      return [];
    }

    const searchData = await searchResponse.json();
    if (!searchData.query?.search?.[0]) {
      console.warn('⚠️ No Wikipedia article found for:', countryName);
      return [];
    }

    const pageTitle = searchData.query.search[0].title;
    console.log('📖 Found Wikipedia article:', pageTitle);

    // Step 2: Get page images
    const pageUrl = new URL('https://es.wikipedia.org/w/api.php');
    pageUrl.searchParams.set('action', 'query');
    pageUrl.searchParams.set('titles', pageTitle);
    pageUrl.searchParams.set('prop', 'pageimages|images');
    pageUrl.searchParams.set('piprop', 'thumbnail|original');
    pageUrl.searchParams.set('pithumbsize', '800');
    pageUrl.searchParams.set('imlimit', '10');
    pageUrl.searchParams.set('format', 'json');

    const pageResponse = await fetch(pageUrl.toString());
    if (!pageResponse.ok) {
      console.warn('⚠️ Wikipedia page fetch failed');
      return [];
    }

    const pageData = await pageResponse.json();
    const pages = pageData.query?.pages;
    if (!pages) {
      return [];
    }

    const page = Object.values(pages)[0] as any;
    const photos: string[] = [];

    // Get main page image (thumbnail)
    if (page.thumbnail?.source) {
      photos.push(page.thumbnail.source);
      console.log(`📸 Main thumbnail added`);
    }

    // Get additional images
    if (page.images && Array.isArray(page.images)) {
      console.log(`🖼️ Found ${page.images.length} images in article`);

      const imagePromises = page.images
        .slice(0, 10)
        .filter((img: any) => {
          const filename = img.title.toLowerCase();
          // Filter out flags, coats of arms, maps, icons
          return (
            !filename.includes('bandera') &&
            !filename.includes('escudo') &&
            !filename.includes('coat') &&
            !filename.includes('flag') &&
            !filename.includes('map') &&
            !filename.includes('mapa') &&
            !filename.includes('logo') &&
            !filename.includes('icono') &&
            filename.match(/\.(jpg|jpeg|png)$/i)
          );
        })
        .slice(0, 5)
        .map(async (img: any) => {
          try {
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

    // Limit to 5 photos
    const finalPhotos = photos.slice(0, 5);
    console.log(`✅ Total photos collected: ${finalPhotos.length}`);

    return finalPhotos;
  } catch (error) {
    console.error('❌ Wikipedia photos fetch error:', error);
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
      return new Response(JSON.stringify({ status: 'ERROR', error: 'countryName required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Fetching photos for country: ${countryName}`);

    const photos = await fetchWikipediaPhotos(countryName);

    return new Response(JSON.stringify({ status: 'OK', photos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ status: 'ERROR', error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
