/**
 * Utilidades para procesar y mejorar la presentación de categorías de lugares
 */

/**
 * Mapeo de categorías en inglés a español con mejor presentación
 */
const CATEGORY_TRANSLATIONS: Record<string, string> = {
  // Alojamiento
  hotel: 'Hotel',
  lodging: 'Alojamiento',
  motel: 'Motel',
  hostel: 'Hostal',
  guest_house: 'Casa de Huéspedes',
  bed_and_breakfast: 'Bed & Breakfast',
  resort: 'Resort',
  apartment: 'Apartamento',
  vacation_rental: 'Alquiler Vacacional',

  // Comida y bebida
  restaurant: 'Restaurante',
  food: 'Comida',
  fast_food: 'Comida Rápida',
  fast_food_restaurant: 'Restaurante de Comida Rápida',
  meal_takeaway: 'Comida para Llevar',
  meal_delivery: 'Entrega a Domicilio',
  cafe: 'Café',
  bar: 'Bar',
  night_club: 'Club Nocturno',
  bakery: 'Panadería',
  grocery_or_supermarket: 'Supermercado',
  liquor_store: 'Licorería',

  // Entretenimiento
  tourist_attraction: 'Atracción Turística',
  amusement_park: 'Parque de Diversiones',
  aquarium: 'Acuario',
  art_gallery: 'Galería de Arte',
  casino: 'Casino',
  movie_theater: 'Cine',
  museum: 'Museo',
  zoo: 'Zoológico',
  park: 'Parque',
  stadium: 'Estadio',
  gym: 'Gimnasio',
  spa: 'Spa',

  // Servicios
  gas_station: 'Gasolinera',
  atm: 'Cajero Automático',
  bank: 'Banco',
  hospital: 'Hospital',
  pharmacy: 'Farmacia',
  police: 'Policía',
  post_office: 'Oficina Postal',
  airport: 'Aeropuerto',
  subway_station: 'Estación de Metro',
  train_station: 'Estación de Tren',
  bus_station: 'Estación de Autobús',
  taxi_stand: 'Parada de Taxi',
  car_rental: 'Alquiler de Coches',

  // Compras
  shopping_mall: 'Centro Comercial',
  department_store: 'Tienda Departamental',
  clothing_store: 'Tienda de Ropa',
  electronics_store: 'Tienda de Electrónicos',
  jewelry_store: 'Joyería',
  shoe_store: 'Zapatería',
  book_store: 'Librería',
  convenience_store: 'Tienda de Conveniencia',

  // Lugares religiosos y gobierno
  church: 'Iglesia',
  mosque: 'Mezquita',
  synagogue: 'Sinagoga',
  temple: 'Templo',
  city_hall: 'Ayuntamiento',
  courthouse: 'Juzgado',
  embassy: 'Embajada',
  local_government_office: 'Oficina Gubernamental',

  // Educación
  school: 'Escuela',
  university: 'Universidad',
  library: 'Biblioteca',

  // Puntos de interés general
  point_of_interest: 'Punto de Interés',
  establishment: 'Establecimiento',
  premise: 'Local',
  subpremise: 'Sub-local',
  geocode: 'Ubicación',
  plus_code: 'Código Plus',

  // Ubicaciones geográficas
  country: 'País',
  administrative_area_level_1: 'Región',
  administrative_area_level_2: 'Provincia',
  locality: 'Localidad',
  sublocality: 'Barrio',
  neighborhood: 'Vecindario',
  route: 'Calle',
  street_number: 'Número',
  postal_code: 'Código Postal',
};

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
 */
function processCategory(category: string): string {
  // Si está en nuestro mapeo, usar la traducción
  if (CATEGORY_TRANSLATIONS[category]) {
    return CATEGORY_TRANSLATIONS[category];
  }

  // Si no está mapeado, procesarlo manualmente
  return category
    .replace(/_/g, ' ') // Eliminar guiones bajos
    .split(' ') // Dividir en palabras
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + // Primera letra mayúscula
        word.slice(1).toLowerCase() // Resto en minúscula
    )
    .join(' '); // Unir con espacios
}

/**
 * Procesa un array de categorías para mostrar al usuario
 * - Elimina duplicados
 * - Filtra categorías no útiles
 * - Traduce a español cuando es posible
 * - Mejora el formato (capitalización, espacios)
 * - Limita el número de categorías mostradas
 */
export function processPlaceCategories(
  categories: string[] = [],
  category?: string,
  maxCategories: number = 3
): string[] {
  // Combinar category principal con types
  const allCategories = category ? [category, ...categories] : categories;

  // Filtrar categorías no útiles y procesar
  const processedCategories = allCategories
    .filter((cat) => cat && !FILTERED_CATEGORIES.has(cat))
    .map(processCategory)
    .filter((cat, index, arr) => arr.indexOf(cat) === index) // Eliminar duplicados
    .slice(0, maxCategories); // Limitar cantidad

  return processedCategories;
}

/**
 * Obtiene la categoría principal más relevante para un lugar
 */
export function getPrimaryCategory(categories: string[] = [], category?: string): string | null {
  const processed = processPlaceCategories(categories, category, 1);
  return processed.length > 0 ? processed[0] : null;
}

/**
 * Verifica si una categoría es relevante para mostrar al usuario
 */
export function isCategoryRelevant(category: string): boolean {
  return !FILTERED_CATEGORIES.has(category);
}
