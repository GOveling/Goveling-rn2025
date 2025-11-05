/**
 * Utilidades para procesar y mejorar la presentación de categorías de lugares
 */

import type { TFunction } from 'i18next';

/**
 * Categorías que deben ser filtradas por no ser útiles para el usuario
 */
const FILTERED_CATEGORIES = new Set([
  'establishment',
  'premise',
  'subpremise',
  'geocode',
  'plus_code',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'administrative_area_level_4',
  'administrative_area_level_5',
  'locality',
  'sublocality',
  'sublocality_level_1',
  'sublocality_level_2',
  'sublocality_level_3',
  'sublocality_level_4',
  'sublocality_level_5',
  'neighborhood',
  'route',
  'street_number',
  'postal_code',
  'country',
  'political',
]);

/**
 * Procesa una categoría individual para mejorar su presentación
 * @param category - Categoría en formato snake_case de Google Places API
 * @param t - Función de traducción de i18next
 * @returns Categoría traducida y formateada
 */
function processCategory(category: string, t: TFunction): string {
  // Intentar obtener la traducción desde i18n
  const translationKey = `explore.categories.${category}`;

  // Crear fallback formateado (capitalizar y reemplazar guiones bajos)
  const fallback = category
    .replace(/_/g, ' ') // Eliminar guiones bajos
    .split(' ') // Dividir en palabras
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + // Primera letra mayúscula
        word.slice(1).toLowerCase() // Resto en minúscula
    )
    .join(' '); // Unir con espacios

  // Usar traducción si existe, sino usar fallback
  return t(translationKey, { defaultValue: fallback });
}

/**
 * Procesa un array de categorías para mostrar al usuario
 * - Elimina duplicados
 * - Filtra categorías no útiles
 * - Traduce según el idioma actual
 * - Mejora el formato (capitalización, espacios)
 * - Limita el número de categorías mostradas
 *
 * @param categories - Array de categorías de Google Places API
 * @param category - Categoría principal del lugar
 * @param maxCategories - Número máximo de categorías a retornar
 * @param t - Función de traducción de i18next
 * @returns Array de categorías procesadas y traducidas
 */
export function processPlaceCategories(
  categories: string[] = [],
  category?: string,
  maxCategories: number = 3,
  t?: TFunction
): string[] {
  // Combinar category principal con types
  const allCategories = category ? [category, ...categories] : categories;

  // Filtrar categorías no útiles y procesar
  const processedCategories = allCategories
    .filter((cat) => cat && !FILTERED_CATEGORIES.has(cat))
    .map((cat) => (t ? processCategory(cat, t) : cat)) // Traducir si se proporciona función t
    .filter((cat, index, arr) => arr.indexOf(cat) === index) // Eliminar duplicados
    .slice(0, maxCategories); // Limitar cantidad

  return processedCategories;
}

/**
 * Obtiene la categoría principal más relevante para un lugar
 * @param categories - Array de categorías de Google Places API
 * @param category - Categoría principal del lugar
 * @param t - Función de traducción de i18next
 * @returns Categoría principal procesada o null
 */
export function getPrimaryCategory(
  categories: string[] = [],
  category?: string,
  t?: TFunction
): string | null {
  const processed = processPlaceCategories(categories, category, 1, t);
  return processed.length > 0 ? processed[0] : null;
}

/**
 * Verifica si una categoría es relevante para mostrar al usuario
 */
export function isCategoryRelevant(category: string): boolean {
  return !FILTERED_CATEGORIES.has(category);
}
