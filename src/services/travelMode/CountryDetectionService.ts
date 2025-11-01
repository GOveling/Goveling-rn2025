/**
 * CountryDetectionService - Global country detection system
 *
 * HYBRID STRATEGY:
 * 1. PRIMARY: Nominatim Reverse Geocoding API (covers ALL 195+ countries)
 * 2. FALLBACK: GPS boundaries for 60+ most visited countries (offline support)
 *
 * Benefits:
 * - Global coverage via Nominatim (free, no API key needed)
 * - Rich metadata for top tourist destinations (descriptions, stats)
 * - Offline fallback with GPS boundaries
 * - Optimized for iOS & Android native
 */

import { Coordinates } from './geoUtils';
import { reverseGeocode } from '../../lib/geocoding';

// Currency mapping by country code
const CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  CL: { code: 'CLP', symbol: '$' },
  US: { code: 'USD', symbol: '$' },
  AR: { code: 'ARS', symbol: '$' },
  BR: { code: 'BRL', symbol: 'R$' },
  PE: { code: 'PEN', symbol: 'S/' },
  CO: { code: 'COP', symbol: '$' },
  MX: { code: 'MXN', symbol: '$' },
  ES: { code: 'EUR', symbol: '€' },
  FR: { code: 'EUR', symbol: '€' },
  DE: { code: 'EUR', symbol: '€' },
  IT: { code: 'EUR', symbol: '€' },
  GB: { code: 'GBP', symbol: '£' },
  JP: { code: 'JPY', symbol: '¥' },
  CN: { code: 'CNY', symbol: '¥' },
  IN: { code: 'INR', symbol: '₹' },
  AU: { code: 'AUD', symbol: '$' },
  CA: { code: 'CAD', symbol: '$' },
  NZ: { code: 'NZD', symbol: '$' },
  ZA: { code: 'ZAR', symbol: 'R' },
  CH: { code: 'CHF', symbol: 'Fr' },
  SE: { code: 'SEK', symbol: 'kr' },
  NO: { code: 'NOK', symbol: 'kr' },
  DK: { code: 'DKK', symbol: 'kr' },
  TH: { code: 'THB', symbol: '฿' },
  SG: { code: 'SGD', symbol: '$' },
  HK: { code: 'HKD', symbol: '$' },
  KR: { code: 'KRW', symbol: '₩' },
  RU: { code: 'RUB', symbol: '₽' },
  TR: { code: 'TRY', symbol: '₺' },
  AE: { code: 'AED', symbol: 'د.إ' },
  SA: { code: 'SAR', symbol: '﷼' },
  EG: { code: 'EGP', symbol: '£' },
  IL: { code: 'ILS', symbol: '₪' },
  PL: { code: 'PLN', symbol: 'zł' },
  CZ: { code: 'CZK', symbol: 'Kč' },
  HU: { code: 'HUF', symbol: 'Ft' },
  MY: { code: 'MYR', symbol: 'RM' },
  ID: { code: 'IDR', symbol: 'Rp' },
  PH: { code: 'PHP', symbol: '₱' },
  VN: { code: 'VND', symbol: '₫' },
};

export interface CountryInfo {
  countryCode: string; // ISO 2-letter code (e.g., "CL", "US", "MX")
  countryName: string; // Full name (e.g., "Chile", "United States")
  countryFlag: string; // Emoji flag
  description: string; // Brief description of the country
  continent: string; // Continent name
  capital?: string; // Capital city
  population?: string; // Population (formatted string)
  language?: string; // Primary language
  currency?: string; // Currency code (e.g., "CLP", "USD")
  currencySymbol?: string; // Currency symbol (e.g., "$", "€")
  photos?: string[]; // Array of photo URLs (optional, max 5)
}

export interface CountryVisitEvent {
  countryInfo: CountryInfo;
  coordinates: Coordinates;
  isReturn: boolean; // True if user is returning to a previously visited country
  previousCountryCode: string | null;
}

interface CountryBoundary {
  code: string;
  name: string;
  flag: string;
  latRange: [number, number];
  lngRange: [number, number];
  description: string;
  continent: string;
  capital?: string;
  population?: string;
  language?: string;
}

/**
 * Enhanced country metadata database (60+ most visited countries globally)
 * Provides rich information (descriptions, capitals, population, languages)
 * Used as cache and offline fallback when Nominatim API is unavailable
 *
 * Coverage: Top tourist destinations + major countries by region
 */
const COUNTRY_BOUNDARIES: CountryBoundary[] = [
  // 🌍 EUROPA (Top Tourist Destinations)
  {
    code: 'FR',
    name: 'Francia',
    flag: '🇫🇷',
    latRange: [42.3, 51.1],
    lngRange: [-5.1, 9.6],
    description:
      'Francia es el país más visitado del mundo, hogar de la Torre Eiffel, el Louvre, Versalles y la Riviera Francesa. Conocido por su gastronomía (vino, queso, croissants), moda parisina, y cultura refinada. París es la "Ciudad de la Luz".',
    continent: 'Europa',
    capital: 'París',
    population: '67 millones',
    language: 'Francés',
  },
  {
    code: 'ES',
    name: 'España',
    flag: '🇪🇸',
    latRange: [36.0, 43.8],
    lngRange: [-9.3, 3.3],
    description:
      'España es el segundo país más visitado del mundo, famoso por Barcelona, Madrid, Sevilla, arquitectura de Gaudí, flamenco, paella, y playas mediterráneas. Conocido por La Sagrada Familia, tapas, y fútbol.',
    continent: 'Europa',
    capital: 'Madrid',
    population: '47 millones',
    language: 'Español',
  },
  {
    code: 'IT',
    name: 'Italia',
    flag: '🇮🇹',
    latRange: [36.6, 47.1],
    lngRange: [6.6, 18.5],
    description:
      'Italia es cuna del Imperio Romano y el Renacimiento. Hogar del Coliseo, la Torre de Pisa, Venecia, Florencia, Roma y el Vaticano. Conocido por pizza, pasta, gelato, moda, y arte renacentista.',
    continent: 'Europa',
    capital: 'Roma',
    population: '59 millones',
    language: 'Italiano',
  },
  {
    code: 'DE',
    name: 'Alemania',
    flag: '🇩🇪',
    latRange: [47.3, 55.1],
    lngRange: [5.9, 15.0],
    description:
      'Alemania es potencia europea conocida por castillos medievales, Oktoberfest, Selva Negra, y ciudades como Berlín, Múnich y Hamburgo. Famoso por ingeniería automotriz, cerveza, salchichas, y Neuschwanstein.',
    continent: 'Europa',
    capital: 'Berlín',
    population: '84 millones',
    language: 'Alemán',
  },
  {
    code: 'GB',
    name: 'Reino Unido',
    flag: '🇬🇧',
    latRange: [49.9, 60.9],
    lngRange: [-8.2, 1.8],
    description:
      'Reino Unido incluye Inglaterra, Escocia, Gales e Irlanda del Norte. Conocido por Londres (Big Ben, Tower Bridge, Buckingham Palace), Stonehenge, Tierras Altas escocesas, y rica historia monárquica.',
    continent: 'Europa',
    capital: 'Londres',
    population: '68 millones',
    language: 'Inglés',
  },
  {
    code: 'TR',
    name: 'Turquía',
    flag: '🇹🇷',
    latRange: [36.0, 42.0],
    lngRange: [26.0, 45.0],
    description:
      'Turquía es puente entre Europa y Asia, hogar de Estambul, Capadocia, Éfeso, y la costa turquesa. Conocido por Hagia Sophia, bazares, baños turcos, kebabs, y globos aerostáticos en Capadocia.',
    continent: 'Europa/Asia',
    capital: 'Ankara',
    population: '85 millones',
    language: 'Turco',
  },
  {
    code: 'AT',
    name: 'Austria',
    flag: '🇦🇹',
    latRange: [46.4, 49.0],
    lngRange: [9.5, 17.2],
    description:
      'Austria es país alpino famoso por Viena (música clásica, palacios imperiales), Salzburgo (Mozart), y los Alpes austriacos. Conocido por Schnitzel, strudel, esquí, y valses vieneses.',
    continent: 'Europa',
    capital: 'Viena',
    population: '9 millones',
    language: 'Alemán',
  },
  {
    code: 'GR',
    name: 'Grecia',
    flag: '🇬🇷',
    latRange: [34.8, 41.7],
    lngRange: [19.4, 28.2],
    description:
      'Grecia es cuna de la civilización occidental, democracia y filosofía. Conocido por islas (Santorini, Mykonos, Creta), Acrópolis, ruinas antiguas, playas cristalinas, y gastronomía mediterránea.',
    continent: 'Europa',
    capital: 'Atenas',
    population: '10.5 millones',
    language: 'Griego',
  },
  {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    latRange: [36.9, 42.2],
    lngRange: [-9.5, -6.2],
    description:
      'Portugal es país atlántico conocido por Lisboa, Oporto, Algarve, azulejos coloridos, y fado melancólico. Famoso por vino de Oporto, pastéis de nata, surf, y historia marítima de exploradores.',
    continent: 'Europa',
    capital: 'Lisboa',
    population: '10.3 millones',
    language: 'Portugués',
  },
  {
    code: 'NL',
    name: 'Países Bajos',
    flag: '🇳🇱',
    latRange: [50.7, 53.6],
    lngRange: [3.3, 7.2],
    description:
      'Países Bajos (Holanda) es famoso por Ámsterdam (canales, museos, bicicletas), molinos de viento, tulipanes, y arquitectura innovadora. Conocido por Van Gogh, Rembrandt, queso gouda, y cultura tolerante.',
    continent: 'Europa',
    capital: 'Ámsterdam',
    population: '17.5 millones',
    language: 'Neerlandés',
  },
  {
    code: 'CH',
    name: 'Suiza',
    flag: '🇨🇭',
    latRange: [45.8, 47.8],
    lngRange: [5.9, 10.5],
    description:
      'Suiza es país alpino famoso por neutralidad, relojes de lujo, chocolate, queso fondue, y paisajes montañosos espectaculares. Conocido por Zermatt, Interlaken, Matterhorn, esquí, y banca internacional.',
    continent: 'Europa',
    capital: 'Berna',
    population: '8.7 millones',
    language: 'Alemán/Francés/Italiano',
  },
  {
    code: 'PL',
    name: 'Polonia',
    flag: '🇵🇱',
    latRange: [49.0, 54.8],
    lngRange: [14.1, 24.1],
    description:
      'Polonia es país con historia rica y resiliente. Conocido por Cracovia (castillo Wawel), Varsovia (casco histórico reconstruido), minas de sal de Wieliczka, y pierogi. Hogar de Chopin y Copérnico.',
    continent: 'Europa',
    capital: 'Varsovia',
    population: '38 millones',
    language: 'Polaco',
  },
  {
    code: 'HR',
    name: 'Croacia',
    flag: '🇭🇷',
    latRange: [42.4, 46.5],
    lngRange: [13.5, 19.4],
    description:
      'Croacia es joya del Adriático, famosa por Dubrovnik (ciudad amurallada), Split (palacio de Diocleciano), y 1000+ islas. Conocido por Game of Thrones, Parque Nacional Plitvice, y playas cristalinas.',
    continent: 'Europa',
    capital: 'Zagreb',
    population: '4 millones',
    language: 'Croata',
  },
  {
    code: 'CZ',
    name: 'República Checa',
    flag: '🇨🇿',
    latRange: [48.5, 51.1],
    lngRange: [12.1, 18.9],
    description:
      'República Checa es país centroeuropeo famoso por Praga (puente Carlos, castillo, reloj astronómico), castillos de cuento, cerveza pilsner, y arquitectura gótica. Conocido como "corazón de Europa".',
    continent: 'Europa',
    capital: 'Praga',
    population: '10.5 millones',
    language: 'Checo',
  },
  {
    code: 'HU',
    name: 'Hungría',
    flag: '🇭🇺',
    latRange: [45.7, 48.6],
    lngRange: [16.1, 22.9],
    description:
      'Hungría es país danubiano famoso por Budapest (Parlamento, baños termales, puente de las Cadenas), goulash, vino Tokaji, y música folclórica. Conocido por arquitectura art nouveau y festivales.',
    continent: 'Europa',
    capital: 'Budapest',
    population: '9.7 millones',
    language: 'Húngaro',
  },
  {
    code: 'BE',
    name: 'Bélgica',
    flag: '🇧🇪',
    latRange: [49.5, 51.5],
    lngRange: [2.5, 6.4],
    description:
      'Bélgica es país pequeño con gran impacto. Famoso por Bruselas (capital de la UE), Brujas medieval, chocolate belga, waffles, cervezas artesanales (1500+ variedades), y diamantes de Amberes.',
    continent: 'Europa',
    capital: 'Bruselas',
    population: '11.5 millones',
    language: 'Neerlandés/Francés',
  },
  {
    code: 'SE',
    name: 'Suecia',
    flag: '🇸🇪',
    latRange: [55.3, 69.1],
    lngRange: [11.0, 24.2],
    description:
      'Suecia es país escandinavo conocido por Estocolmo (capital sobre 14 islas), aurora boreal, diseño minimalista (IKEA), fika (pausa del café), y modelo de bienestar social. Hogar de ABBA y Nobel.',
    continent: 'Europa',
    capital: 'Estocolmo',
    population: '10.5 millones',
    language: 'Sueco',
  },
  {
    code: 'NO',
    name: 'Noruega',
    flag: '🇳🇴',
    latRange: [57.9, 71.2],
    lngRange: [4.5, 31.1],
    description:
      'Noruega es país de fiordos espectaculares, aurora boreal, sol de medianoche, y vikingos. Conocido por Bergen, Tromsø, Preikestolen, salmón, y calidad de vida excepcional. Pionero en coches eléctricos.',
    continent: 'Europa',
    capital: 'Oslo',
    population: '5.4 millones',
    language: 'Noruego',
  },
  {
    code: 'DK',
    name: 'Dinamarca',
    flag: '🇩🇰',
    latRange: [54.5, 57.8],
    lngRange: [8.0, 15.2],
    description:
      'Dinamarca es país escandinavo conocido por "hygge" (comodidad), Copenhague (Sirenita, Tivoli, diseño danés), Lego, y cultura ciclista. Famoso por arquitectura moderna, gastronomía nórdica, y felicidad.',
    continent: 'Europa',
    capital: 'Copenhague',
    population: '5.9 millones',
    language: 'Danés',
  },
  {
    code: 'IE',
    name: 'Irlanda',
    flag: '🇮🇪',
    latRange: [51.4, 55.4],
    lngRange: [-10.5, -6.0],
    description:
      'Irlanda es "Isla Esmeralda" famosa por paisajes verdes, acantilados de Moher, Dublín (Temple Bar, Guinness), castillos, música celta, y hospitalidad irlandesa. Conocido por San Patricio y literatura.',
    continent: 'Europa',
    capital: 'Dublín',
    population: '5 millones',
    language: 'Inglés/Irlandés',
  },

  // 🌎 AMÉRICA DEL NORTE
  {
    code: 'US',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    latRange: [24.5, 49.4],
    lngRange: [-125.0, -66.9],
    description:
      'Estados Unidos es país de 50 estados con diversidad extrema. Hogar de Nueva York (Estatua de Libertad), Los Ángeles (Hollywood), Gran Cañón, parques nacionales (Yellowstone, Yosemite), y cultura global.',
    continent: 'América del Norte',
    capital: 'Washington D.C.',
    population: '331 millones',
    language: 'Inglés',
  },
  {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    latRange: [14.5, 32.7],
    lngRange: [-118.4, -86.7],
    description:
      'México es país con civilizaciones ancestrales (mayas, aztecas), playas caribeñas (Cancún, Tulum), Ciudad de México vibrante, y gastronomía patrimonio UNESCO. Conocido por tacos, tequila, Día de Muertos.',
    continent: 'América del Norte',
    capital: 'Ciudad de México',
    population: '128 millones',
    language: 'Español',
  },
  {
    code: 'CA',
    name: 'Canadá',
    flag: '🇨🇦',
    latRange: [41.7, 83.1],
    lngRange: [-141.0, -52.6],
    description:
      'Canadá es segundo país más grande del mundo. Conocido por Montañas Rocosas, Cataratas del Niágara, Toronto, Vancouver, Montreal, naturaleza salvaje, hockey, jarabe de arce, y multiculturalismo.',
    continent: 'América del Norte',
    capital: 'Ottawa',
    population: '38 millones',
    language: 'Inglés/Francés',
  },

  // 🌎 AMÉRICA CENTRAL Y CARIBE
  {
    code: 'CR',
    name: 'Costa Rica',
    flag: '🇨🇷',
    latRange: [8.0, 11.2],
    lngRange: [-85.9, -82.5],
    description:
      'Costa Rica es líder en ecoturismo y biodiversidad. Conocido por playas del Pacífico y Caribe, volcanes activos, selvas tropicales, osos perezosos, y lema "Pura Vida". Sin ejército desde 1949.',
    continent: 'América Central',
    capital: 'San José',
    population: '5.1 millones',
    language: 'Español',
  },
  {
    code: 'PA',
    name: 'Panamá',
    flag: '🇵🇦',
    latRange: [7.2, 9.6],
    lngRange: [-83.0, -77.2],
    description:
      'Panamá es puente entre continentes y océanos. Famoso por Canal de Panamá (maravilla de ingeniería), Casco Viejo, playas caribeñas, selva del Darién, y hub financiero internacional. Ciudad moderna.',
    continent: 'América Central',
    capital: 'Ciudad de Panamá',
    population: '4.3 millones',
    language: 'Español',
  },

  // 🌎 AMÉRICA DEL SUR
  {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    latRange: [-33.7, 5.3],
    lngRange: [-73.9, -28.8],
    description:
      'Brasil es país más grande de Sudamérica. Hogar de Amazonas, Cristo Redentor, Carnaval de Río, playas de Copacabana, samba, y fútbol legendario. Conocido por Iguazú, Pantanal, y biodiversidad extrema.',
    continent: 'América del Sur',
    capital: 'Brasília',
    population: '214 millones',
    language: 'Portugués',
  },
  {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    latRange: [-55.0, -21.8],
    lngRange: [-73.6, -53.6],
    description:
      'Argentina es segundo país más grande de Sudamérica. Famoso por Buenos Aires (tango, carne), glaciares patagónicos (Perito Moreno), Iguazú, Mendoza (vino Malbec), y fútbol pasional. Tierra de Maradona.',
    continent: 'América del Sur',
    capital: 'Buenos Aires',
    population: '45 millones',
    language: 'Español',
  },
  {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    latRange: [-56.0, -17.5],
    lngRange: [-109.5, -66.4],
    description:
      'Chile es país largo y estrecho entre Andes y Pacífico. Conocido por Atacama (desierto más árido), Torres del Paine, Isla de Pascua (moáis), Valle de Elqui, viñedos, y cultura poética. Tierra de Neruda.',
    continent: 'América del Sur',
    capital: 'Santiago',
    population: '19.5 millones',
    language: 'Español',
  },
  {
    code: 'PE',
    name: 'Perú',
    flag: '🇵🇪',
    latRange: [-18.4, -0.0],
    lngRange: [-81.4, -68.7],
    description:
      'Perú es hogar de Machu Picchu (maravilla del mundo) y herencia Inca. Conocido por Cusco, Nazca, Lago Titicaca, gastronomía top mundial (ceviche), y biodiversidad desde Amazonas hasta costa desértica.',
    continent: 'América del Sur',
    capital: 'Lima',
    population: '33 millones',
    language: 'Español',
  },
  {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    latRange: [-4.2, 12.5],
    lngRange: [-79.0, -66.9],
    description:
      'Colombia es país de biodiversidad extrema. Famoso por Cartagena colonial, Bogotá andina, café premium (eje cafetero), Caño Cristales ("río de colores"), playas caribeñas, y cultura vallenata alegre.',
    continent: 'América del Sur',
    capital: 'Bogotá',
    population: '51 millones',
    language: 'Español',
  },
  {
    code: 'EC',
    name: 'Ecuador',
    flag: '🇪🇨',
    latRange: [-5.0, 1.5],
    lngRange: [-92.0, -75.2],
    description:
      'Ecuador es país pequeño con 4 mundos: Galápagos (evolución de Darwin), Amazonía, Andes (Quito colonial, Cotopaxi), y costa del Pacífico. Conocido por biodiversidad, mercados indígenas, y mitad del mundo.',
    continent: 'América del Sur',
    capital: 'Quito',
    population: '17.5 millones',
    language: 'Español',
  },
  {
    code: 'BO',
    name: 'Bolivia',
    flag: '🇧🇴',
    latRange: [-22.9, -9.7],
    lngRange: [-69.6, -57.5],
    description:
      'Bolivia es país andino-amazónico sin mar. Famoso por Salar de Uyuni (espejo de sal gigante), Titicaca sagrado, La Paz (ciudad más alta), y herencia indígena viva. Conocido por cultura aymara y quechua.',
    continent: 'América del Sur',
    capital: 'Sucre/La Paz',
    population: '11.7 millones',
    language: 'Español',
  },
  {
    code: 'UY',
    name: 'Uruguay',
    flag: '🇺🇾',
    latRange: [-35.0, -30.0],
    lngRange: [-58.5, -53.1],
    description:
      'Uruguay es país pequeño y progresista. Conocido por Montevideo cosmopolita, Colonia del Sacramento colonial, Punta del Este (resort playero), mate omnipresente, carne de calidad, y estabilidad democrática.',
    continent: 'América del Sur',
    capital: 'Montevideo',
    population: '3.5 millones',
    language: 'Español',
  },

  // 🌏 ASIA (Top Destinations)
  {
    code: 'CN',
    name: 'China',
    flag: '🇨🇳',
    latRange: [18.2, 53.6],
    lngRange: [73.5, 135.1],
    description:
      'China es civilización milenaria y potencia moderna. Hogar de Gran Muralla, Ciudad Prohibida, Guerreros de Terracota, Shanghai futurista, y Hong Kong vibrante. Conocido por gastronomía, kung fu, pandas.',
    continent: 'Asia',
    capital: 'Beijing',
    population: '1,412 millones',
    language: 'Mandarín',
  },
  {
    code: 'TH',
    name: 'Tailandia',
    flag: '🇹🇭',
    latRange: [5.6, 20.5],
    lngRange: [97.3, 105.6],
    description:
      'Tailandia es "tierra de sonrisas" famosa por Bangkok (templos dorados, mercados flotantes), islas paradisíacas (Phuket, Phi Phi), Chiang Mai, comida picante deliciosa, masajes tailandeses, y elefantes.',
    continent: 'Asia',
    capital: 'Bangkok',
    population: '70 millones',
    language: 'Tailandés',
  },
  {
    code: 'JP',
    name: 'Japón',
    flag: '🇯🇵',
    latRange: [24.0, 45.5],
    lngRange: [122.9, 153.9],
    description:
      'Japón es fusión perfecta de tradición y tecnología. Conocido por Tokio futurista, Kioto ancestral, Monte Fuji, sakura, templos zen, sushi, manga/anime, trenes bala, y cultura del respeto. Tierra del sol naciente.',
    continent: 'Asia',
    capital: 'Tokio',
    population: '125 millones',
    language: 'Japonés',
  },
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    latRange: [8.1, 35.5],
    lngRange: [68.2, 97.4],
    description:
      'India es país de colores, especias y espiritualidad. Hogar de Taj Mahal (maravilla del mundo), Varanasi sagrado, Rajastán de palacios, Kerala tropical, yoga, Bollywood, curry, y diversidad cultural extrema.',
    continent: 'Asia',
    capital: 'Nueva Delhi',
    population: '1,408 millones',
    language: 'Hindi/Inglés',
  },
  {
    code: 'MY',
    name: 'Malasia',
    flag: '🇲🇾',
    latRange: [0.8, 7.4],
    lngRange: [99.6, 119.3],
    description:
      'Malasia es fusión asiática multicultural. Conocido por Kuala Lumpur (Torres Petronas), Langkawi, Penang (gastronomía), selvas de Borneo (orangutanes), playas tropicales, y mezcla malaya-china-india.',
    continent: 'Asia',
    capital: 'Kuala Lumpur',
    population: '33 millones',
    language: 'Malayo',
  },
  {
    code: 'AE',
    name: 'Emiratos Árabes Unidos',
    flag: '🇦🇪',
    latRange: [22.6, 26.1],
    lngRange: [51.5, 56.4],
    description:
      'EAU es lujo en el desierto. Famoso por Dubái (Burj Khalifa, islas artificiales, shopping), Abu Dhabi (Gran Mezquita), desierto, oasis modernos, arquitectura futurista, y hospitalidad árabe lujosa.',
    continent: 'Asia',
    capital: 'Abu Dhabi',
    population: '10 millones',
    language: 'Árabe',
  },
  {
    code: 'SA',
    name: 'Arabia Saudita',
    flag: '🇸🇦',
    latRange: [16.4, 32.2],
    lngRange: [34.5, 55.7],
    description:
      'Arabia Saudita es cuna del Islam. Hogar de Meca y Medina (ciudades sagradas), Al-Ula histórico, Mar Rojo, desierto de Rub al-Jali, y transformación moderna Vision 2030. Apertura reciente al turismo.',
    continent: 'Asia',
    capital: 'Riad',
    population: '35 millones',
    language: 'Árabe',
  },
  {
    code: 'KR',
    name: 'Corea del Sur',
    flag: '🇰🇷',
    latRange: [33.1, 38.6],
    lngRange: [124.6, 131.9],
    description:
      'Corea del Sur es potencia tecnológica y cultural. Conocido por Seúl (palacios, K-pop, tecnología), templos budistas, DMZ, comida deliciosa (kimchi, BBQ), K-drama, y mezcla de tradición ancestral con modernidad.',
    continent: 'Asia',
    capital: 'Seúl',
    population: '52 millones',
    language: 'Coreano',
  },
  {
    code: 'VN',
    name: 'Vietnam',
    flag: '🇻🇳',
    latRange: [8.4, 23.4],
    lngRange: [102.1, 109.5],
    description:
      'Vietnam es país del sudeste asiático con historia resiliente. Famoso por Ha Long Bay, Hanoi antiguo, Ho Chi Minh vibrante, terrazas de arroz de Sapa, comida de calle increíble (pho), y sombreros cónicos.',
    continent: 'Asia',
    capital: 'Hanói',
    population: '98 millones',
    language: 'Vietnamita',
  },
  {
    code: 'ID',
    name: 'Indonesia',
    flag: '🇮🇩',
    latRange: [-11.0, 6.0],
    lngRange: [95.0, 141.0],
    description:
      'Indonesia es archipiélago de 17,000 islas. Conocido por Bali (playas, templos, terrazas de arroz), Borobudur, Komodo (dragones), volcanes activos, selvas tropicales, y diversidad cultural musulmana-hindú.',
    continent: 'Asia',
    capital: 'Yakarta',
    population: '274 millones',
    language: 'Indonesio',
  },
  {
    code: 'PH',
    name: 'Filipinas',
    flag: '🇵🇭',
    latRange: [4.6, 21.1],
    lngRange: [116.9, 126.6],
    description:
      'Filipinas es archipiélago de 7,641 islas. Famoso por Palawan (El Nido, lagunas), Chocolate Hills, terrazas de arroz Banaue, buceo clase mundial, filipinos hospitalarios, y fusión española-asiática-americana.',
    continent: 'Asia',
    capital: 'Manila',
    population: '113 millones',
    language: 'Filipino/Inglés',
  },
  {
    code: 'SG',
    name: 'Singapur',
    flag: '🇸🇬',
    latRange: [1.2, 1.5],
    lngRange: [103.6, 104.0],
    description:
      'Singapur es ciudad-estado futurista. Conocido por Gardens by the Bay, Marina Bay Sands, Sentosa, limpieza extrema, comida hawker multicultural, hub financiero, y fusión perfecta chino-malayo-indio.',
    continent: 'Asia',
    capital: 'Singapur',
    population: '5.9 millones',
    language: 'Inglés/Mandarín/Malayo/Tamil',
  },

  // 🌍 ÁFRICA
  {
    code: 'ZA',
    name: 'Sudáfrica',
    flag: '🇿🇦',
    latRange: [-34.8, -22.1],
    lngRange: [16.5, 32.9],
    description:
      'Sudáfrica es "nación arcoíris" de Mandela. Conocido por safaris (Kruger), Ciudad del Cabo (Table Mountain, Cape Town), Johannesburgo, viñedos Stellenbosch, Big Five, y diversidad cultural extrema.',
    continent: 'África',
    capital: 'Pretoria/Ciudad del Cabo',
    population: '60 millones',
    language: '11 oficiales',
  },
  {
    code: 'EG',
    name: 'Egipto',
    flag: '🇪🇬',
    latRange: [22.0, 31.7],
    lngRange: [25.0, 36.9],
    description:
      'Egipto es cuna de civilización antigua. Hogar de pirámides de Giza, Esfinge, Valle de los Reyes, Luxor, templos faraónicos, río Nilo, Mar Rojo (buceo), y misterios de 5,000 años. Tierra de faraones.',
    continent: 'África',
    capital: 'El Cairo',
    population: '104 millones',
    language: 'Árabe',
  },
  {
    code: 'MA',
    name: 'Marruecos',
    flag: '🇲🇦',
    latRange: [27.7, 35.9],
    lngRange: [-13.2, -1.0],
    description:
      'Marruecos es puerta de África. Famoso por Marrakech (medina, zocos), Fez medieval, Sahara (dunas de Erg Chebbi), Casablanca, Chefchaouen azul, riads, té de menta, tagines, y alfombras beréberes.',
    continent: 'África',
    capital: 'Rabat',
    population: '37 millones',
    language: 'Árabe/Bereber',
  },
  {
    code: 'KE',
    name: 'Kenia',
    flag: '🇰🇪',
    latRange: [-4.7, 5.0],
    lngRange: [33.9, 41.9],
    description:
      'Kenia es paraíso de safaris. Conocido por Masai Mara (gran migración), Monte Kilimanjaro, Mombasa (playas), tribu Masai, Big Five, corredores maratón, café, y naturaleza salvaje africana icónica.',
    continent: 'África',
    capital: 'Nairobi',
    population: '54 millones',
    language: 'Suajili/Inglés',
  },

  // 🌏 OCEANÍA
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    latRange: [-43.6, -10.7],
    lngRange: [113.3, 153.6],
    description:
      'Australia es país-continente de contrastes. Conocido por Sídney (Ópera), Gran Barrera de Coral, Uluru sagrado, Outback, fauna única (canguros, koalas), playas infinitas, surf, y cultura "no worries" relajada.',
    continent: 'Oceanía',
    capital: 'Canberra',
    population: '26 millones',
    language: 'Inglés',
  },
  {
    code: 'NZ',
    name: 'Nueva Zelanda',
    flag: '🇳🇿',
    latRange: [-47.3, -34.4],
    lngRange: [166.4, 178.6],
    description:
      'Nueva Zelanda es paraíso natural de aventura. Conocido por paisajes épicos (Milford Sound, Alpes del Sur), cultura maorí, Hobbiton (LOTR), deportes extremos (Queenstown), kiwis, y pureza ambiental.',
    continent: 'Oceanía',
    capital: 'Wellington',
    population: '5.1 millones',
    language: 'Inglés/Maorí',
  },
];

class CountryDetectionService {
  private lastDetectedCountry: string | null = null;
  private countryHistory: string[] = []; // Track country sequence

  /**
   * HYBRID DETECTION: Nominatim API (primary) + GPS boundaries (fallback)
   * Detects country from GPS coordinates using the best available method
   *
   * Strategy:
   * 1. Try Nominatim Reverse Geocoding API (covers ALL 195+ countries globally)
   * 2. If API fails/unavailable, use GPS boundaries (60+ top destinations with rich metadata)
   * 3. Return country info with flag, description, stats
   */
  async detectCountry(coordinates: Coordinates): Promise<CountryInfo | null> {
    const { latitude, longitude } = coordinates;

    // PRIMARY: Try Nominatim Reverse Geocoding API (global coverage)
    try {
      const geocodeResult = await reverseGeocode(latitude, longitude);

      if (geocodeResult?.countryCode) {
        const countryCode = geocodeResult.countryCode.toUpperCase();

        // Check if we have rich metadata for this country
        const enrichedData = await this.getCountryMetadata(countryCode);

        if (enrichedData) {
          // Return enriched data from our database (descriptions, stats, etc.)
          console.log(
            `🌍 Country detected via Nominatim + metadata: ${enrichedData.countryFlag} ${enrichedData.countryName}`
          );
          return enrichedData;
        }

        // Country detected but no metadata - use basic Nominatim data
        const currency = CURRENCY_MAP[countryCode];
        const countryInfo: CountryInfo = {
          countryCode,
          countryName: geocodeResult.country || countryCode,
          countryFlag: this.getFlagEmoji(countryCode),
          description: `${geocodeResult.country || 'Country'} - descubre este increíble destino.`,
          continent: this.guessContinent(latitude, longitude),
          capital: undefined,
          population: undefined,
          language: undefined,
          currency: currency?.code,
          currencySymbol: currency?.symbol,
        };

        console.log(
          `🌍 Country detected via Nominatim (basic): ${countryInfo.countryFlag} ${countryInfo.countryName}`
        );
        return countryInfo;
      }
    } catch (error) {
      console.warn('⚠️ Nominatim API failed, falling back to GPS boundaries:', error);
    }

    // FALLBACK: Use GPS boundaries (offline support, 60+ countries with rich metadata)
    return this.detectCountryFromBoundaries(latitude, longitude);
  }

  /**
   * FALLBACK: Detect country using GPS boundaries (offline support)
   * Used when Nominatim API is unavailable or fails
   * Covers 60+ most visited countries with complete metadata
   */
  private detectCountryFromBoundaries(latitude: number, longitude: number): CountryInfo | null {
    for (const boundary of COUNTRY_BOUNDARIES) {
      const [minLat, maxLat] = boundary.latRange;
      const [minLng, maxLng] = boundary.lngRange;

      if (latitude >= minLat && latitude <= maxLat && longitude >= minLng && longitude <= maxLng) {
        console.log(`🌍 Country detected via GPS boundaries: ${boundary.flag} ${boundary.name}`);
        const currency = CURRENCY_MAP[boundary.code];
        return {
          countryCode: boundary.code,
          countryName: boundary.name,
          countryFlag: boundary.flag,
          description: boundary.description,
          continent: boundary.continent,
          capital: boundary.capital,
          population: boundary.population,
          language: boundary.language,
          currency: currency?.code,
          currencySymbol: currency?.symbol,
        };
      }
    }

    console.warn(
      `⚠️ Country not found in boundaries: lat=${latitude}, lng=${longitude}. May be a country not in top 60.`
    );
    return null;
  }

  /**
   * Get enriched metadata for a country code
   * Returns full info if country is in our enhanced database
   */
  private async getCountryMetadata(countryCode: string): Promise<CountryInfo | null> {
    const boundary = COUNTRY_BOUNDARIES.find((b) => b.code === countryCode);

    if (!boundary) {
      return null;
    }

    const currency = CURRENCY_MAP[countryCode];

    // Fetch photos from Wikipedia Edge Function
    const photos = await this.fetchCountryPhotos(boundary.name, countryCode);

    return {
      countryCode: boundary.code,
      countryName: boundary.name,
      countryFlag: boundary.flag,
      description: boundary.description,
      continent: boundary.continent,
      capital: boundary.capital,
      population: boundary.population,
      language: boundary.language,
      currency: currency?.code,
      currencySymbol: currency?.symbol,
      photos,
    };
  }

  /**
   * Fetch country photos from Wikipedia via Edge Function
   */
  private async fetchCountryPhotos(countryName: string, countryCode: string): Promise<string[]> {
    try {
      console.log(`📸 Fetching photos for ${countryName}...`);

      const { supabase } = await import('~/lib/supabase');
      const { data, error } = await supabase.functions.invoke('wikipedia-country-photos', {
        body: {
          countryName,
          countryCode,
        },
      });

      if (error) {
        console.error('❌ Error fetching country photos:', error);
        return [];
      }

      if (data?.photos && Array.isArray(data.photos)) {
        console.log(`✅ Got ${data.photos.length} photos for ${countryName}`);
        return data.photos;
      }

      return [];
    } catch (error) {
      console.error('❌ Exception fetching country photos:', error);
      return [];
    }
  }

  /**
   * Get flag emoji for country code (ISO 3166-1 alpha-2)
   * Uses Unicode Regional Indicator Symbols
   */
  private getFlagEmoji(countryCode: string): string {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  /**
   * Guess continent from latitude/longitude (rough approximation)
   */
  private guessContinent(lat: number, lng: number): string {
    // Europe
    if (lat >= 35 && lat <= 71 && lng >= -10 && lng <= 40) return 'Europa';

    // Asia
    if (lat >= -10 && lat <= 75 && lng >= 25 && lng <= 180) return 'Asia';

    // Africa
    if (lat >= -35 && lat <= 37 && lng >= -18 && lng <= 52) return 'África';

    // North America
    if (lat >= 15 && lat <= 72 && lng >= -168 && lng <= -50) return 'América del Norte';

    // South America
    if (lat >= -56 && lat <= 13 && lng >= -82 && lng <= -34) return 'América del Sur';

    // Oceania
    if (lat >= -47 && lat <= -10 && lng >= 110 && lng <= 180) return 'Oceanía';

    return 'Desconocido';
  }

  /**
   * Check if country has changed and should be recorded
   * Returns CountryVisitEvent if new country detected, null otherwise
   */
  async checkCountryChange(coordinates: Coordinates): Promise<CountryVisitEvent | null> {
    const countryInfo = await this.detectCountry(coordinates);

    if (!countryInfo) {
      return null; // Unknown country
    }

    // First visit ever
    if (this.lastDetectedCountry === null) {
      this.lastDetectedCountry = countryInfo.countryCode;
      this.countryHistory.push(countryInfo.countryCode);

      console.log(
        `🌍 First country detected: ${countryInfo.countryFlag} ${countryInfo.countryName}`
      );

      return {
        countryInfo,
        coordinates,
        isReturn: false,
        previousCountryCode: null,
      };
    }

    // Same country as last detection - no change
    if (this.lastDetectedCountry === countryInfo.countryCode) {
      return null;
    }

    // Different country detected!
    const previousCountryCode = this.lastDetectedCountry;
    const isReturn = this.countryHistory.includes(countryInfo.countryCode);

    // Update tracking
    this.lastDetectedCountry = countryInfo.countryCode;
    this.countryHistory.push(countryInfo.countryCode);

    console.log(
      `🌍 Country change detected: ${countryInfo.countryFlag} ${countryInfo.countryName} ${isReturn ? '(RETURN)' : '(NEW)'}`
    );
    console.log(`📍 Previous country: ${previousCountryCode}`);

    return {
      countryInfo,
      coordinates,
      isReturn,
      previousCountryCode,
    };
  }

  /**
   * Get the last detected country code
   */
  getLastCountry(): string | null {
    return this.lastDetectedCountry;
  }

  /**
   * Get country visit history
   */
  getCountryHistory(): string[] {
    return [...this.countryHistory];
  }

  /**
   * Reset detection state (e.g., when travel mode ends)
   */
  reset(): void {
    this.lastDetectedCountry = null;
    this.countryHistory = [];
    console.log('🔄 Country detection reset');
  }

  /**
   * Manually set last detected country (useful when loading from DB)
   */
  setLastCountry(countryCode: string): void {
    this.lastDetectedCountry = countryCode;
    if (!this.countryHistory.includes(countryCode)) {
      this.countryHistory.push(countryCode);
    }
  }

  /**
   * Get country info by code (useful for displaying stored visits)
   */
  getCountryInfoByCode(countryCode: string): CountryInfo | null {
    const boundary = COUNTRY_BOUNDARIES.find((b) => b.code === countryCode);
    if (!boundary) return null;

    return {
      countryCode: boundary.code,
      countryName: boundary.name,
      countryFlag: boundary.flag,
      description: boundary.description,
      continent: boundary.continent,
    };
  }

  /**
   * Get all available countries (for testing/debugging)
   */
  getAllCountries(): CountryInfo[] {
    return COUNTRY_BOUNDARIES.map((b) => ({
      countryCode: b.code,
      countryName: b.name,
      countryFlag: b.flag,
      description: b.description,
      continent: b.continent,
    }));
  }
}

// Export singleton instance
export const countryDetectionService = new CountryDetectionService();
export default CountryDetectionService;
