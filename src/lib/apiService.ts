import { Country, CityResult } from '../types/geo';

const API_BASE_URL = 'https://goveling-api.onrender.com';

// Lista de fallback con los países más comunes
const FALLBACK_COUNTRIES: Country[] = [
  { country_code: 'AD', country_name: 'Andorra', phone_code: '+376' },
  { country_code: 'AE', country_name: 'Emiratos Árabes Unidos', phone_code: '+971' },
  { country_code: 'AF', country_name: 'Afganistán', phone_code: '+93' },
  { country_code: 'AG', country_name: 'Antigua y Barbuda', phone_code: '+1' },
  { country_code: 'AI', country_name: 'Anguila', phone_code: '+1' },
  { country_code: 'AL', country_name: 'Albania', phone_code: '+355' },
  { country_code: 'AM', country_name: 'Armenia', phone_code: '+374' },
  { country_code: 'AO', country_name: 'Angola', phone_code: '+244' },
  { country_code: 'AR', country_name: 'Argentina', phone_code: '+54' },
  { country_code: 'AS', country_name: 'Samoa Americana', phone_code: '+1' },
  { country_code: 'AT', country_name: 'Austria', phone_code: '+43' },
  { country_code: 'AU', country_name: 'Australia', phone_code: '+61' },
  { country_code: 'AW', country_name: 'Aruba', phone_code: '+297' },
  { country_code: 'AZ', country_name: 'Azerbaiyán', phone_code: '+994' },
  { country_code: 'BA', country_name: 'Bosnia y Herzegovina', phone_code: '+387' },
  { country_code: 'BB', country_name: 'Barbados', phone_code: '+1' },
  { country_code: 'BD', country_name: 'Bangladesh', phone_code: '+880' },
  { country_code: 'BE', country_name: 'Bélgica', phone_code: '+32' },
  { country_code: 'BF', country_name: 'Burkina Faso', phone_code: '+226' },
  { country_code: 'BG', country_name: 'Bulgaria', phone_code: '+359' },
  { country_code: 'BH', country_name: 'Baréin', phone_code: '+973' },
  { country_code: 'BI', country_name: 'Burundi', phone_code: '+257' },
  { country_code: 'BJ', country_name: 'Benín', phone_code: '+229' },
  { country_code: 'BM', country_name: 'Bermudas', phone_code: '+1' },
  { country_code: 'BN', country_name: 'Brunéi', phone_code: '+673' },
  { country_code: 'BO', country_name: 'Bolivia', phone_code: '+591' },
  { country_code: 'BR', country_name: 'Brasil', phone_code: '+55' },
  { country_code: 'BS', country_name: 'Bahamas', phone_code: '+1' },
  { country_code: 'BT', country_name: 'Bután', phone_code: '+975' },
  { country_code: 'BW', country_name: 'Botsuana', phone_code: '+267' },
  { country_code: 'BY', country_name: 'Bielorrusia', phone_code: '+375' },
  { country_code: 'BZ', country_name: 'Belice', phone_code: '+501' },
  { country_code: 'CA', country_name: 'Canadá', phone_code: '+1' },
  { country_code: 'CC', country_name: 'Islas Cocos', phone_code: '+61' },
  { country_code: 'CD', country_name: 'República Democrática del Congo', phone_code: '+243' },
  { country_code: 'CF', country_name: 'República Centroafricana', phone_code: '+236' },
  { country_code: 'CG', country_name: 'República del Congo', phone_code: '+242' },
  { country_code: 'CH', country_name: 'Suiza', phone_code: '+41' },
  { country_code: 'CI', country_name: 'Costa de Marfil', phone_code: '+225' },
  { country_code: 'CK', country_name: 'Islas Cook', phone_code: '+682' },
  { country_code: 'CL', country_name: 'Chile', phone_code: '+56' },
  { country_code: 'CM', country_name: 'Camerún', phone_code: '+237' },
  { country_code: 'CN', country_name: 'China', phone_code: '+86' },
  { country_code: 'CO', country_name: 'Colombia', phone_code: '+57' },
  { country_code: 'CR', country_name: 'Costa Rica', phone_code: '+506' },
  { country_code: 'CU', country_name: 'Cuba', phone_code: '+53' },
  { country_code: 'CV', country_name: 'Cabo Verde', phone_code: '+238' },
  { country_code: 'CW', country_name: 'Curazao', phone_code: '+599' },
  { country_code: 'CX', country_name: 'Isla de Navidad', phone_code: '+61' },
  { country_code: 'CY', country_name: 'Chipre', phone_code: '+357' },
  { country_code: 'CZ', country_name: 'República Checa', phone_code: '+420' },
  { country_code: 'DE', country_name: 'Alemania', phone_code: '+49' },
  { country_code: 'DJ', country_name: 'Yibuti', phone_code: '+253' },
  { country_code: 'DK', country_name: 'Dinamarca', phone_code: '+45' },
  { country_code: 'DM', country_name: 'Dominica', phone_code: '+1' },
  { country_code: 'DO', country_name: 'República Dominicana', phone_code: '+1' },
  { country_code: 'DZ', country_name: 'Argelia', phone_code: '+213' },
  { country_code: 'EC', country_name: 'Ecuador', phone_code: '+593' },
  { country_code: 'EE', country_name: 'Estonia', phone_code: '+372' },
  { country_code: 'EG', country_name: 'Egipto', phone_code: '+20' },
  { country_code: 'EH', country_name: 'Sáhara Occidental', phone_code: '+212' },
  { country_code: 'ER', country_name: 'Eritrea', phone_code: '+291' },
  { country_code: 'ES', country_name: 'España', phone_code: '+34' },
  { country_code: 'ET', country_name: 'Etiopía', phone_code: '+251' },
  { country_code: 'FI', country_name: 'Finlandia', phone_code: '+358' },
  { country_code: 'FJ', country_name: 'Fiyi', phone_code: '+679' },
  { country_code: 'FK', country_name: 'Islas Malvinas', phone_code: '+500' },
  { country_code: 'FM', country_name: 'Micronesia', phone_code: '+691' },
  { country_code: 'FO', country_name: 'Islas Feroe', phone_code: '+298' },
  { country_code: 'FR', country_name: 'Francia', phone_code: '+33' },
  { country_code: 'GA', country_name: 'Gabón', phone_code: '+241' },
  { country_code: 'GB', country_name: 'Reino Unido', phone_code: '+44' },
  { country_code: 'GD', country_name: 'Granada', phone_code: '+1' },
  { country_code: 'GE', country_name: 'Georgia', phone_code: '+995' },
  { country_code: 'GF', country_name: 'Guayana Francesa', phone_code: '+594' },
  { country_code: 'GG', country_name: 'Guernsey', phone_code: '+44' },
  { country_code: 'GH', country_name: 'Ghana', phone_code: '+233' },
  { country_code: 'GI', country_name: 'Gibraltar', phone_code: '+350' },
  { country_code: 'GL', country_name: 'Groenlandia', phone_code: '+299' },
  { country_code: 'GM', country_name: 'Gambia', phone_code: '+220' },
  { country_code: 'GN', country_name: 'Guinea', phone_code: '+224' },
  { country_code: 'GP', country_name: 'Guadalupe', phone_code: '+590' },
  { country_code: 'GQ', country_name: 'Guinea Ecuatorial', phone_code: '+240' },
  { country_code: 'GR', country_name: 'Grecia', phone_code: '+30' },
  { country_code: 'GS', country_name: 'Islas Georgias del Sur y Sandwich del Sur', phone_code: '+500' },
  { country_code: 'GT', country_name: 'Guatemala', phone_code: '+502' },
  { country_code: 'GU', country_name: 'Guam', phone_code: '+1' },
  { country_code: 'GW', country_name: 'Guinea-Bisáu', phone_code: '+245' },
  { country_code: 'GY', country_name: 'Guyana', phone_code: '+592' },
  { country_code: 'HK', country_name: 'Hong Kong', phone_code: '+852' },
  { country_code: 'HN', country_name: 'Honduras', phone_code: '+504' },
  { country_code: 'HR', country_name: 'Croacia', phone_code: '+385' },
  { country_code: 'HT', country_name: 'Haití', phone_code: '+509' },
  { country_code: 'HU', country_name: 'Hungría', phone_code: '+36' },
  { country_code: 'ID', country_name: 'Indonesia', phone_code: '+62' },
  { country_code: 'IE', country_name: 'Irlanda', phone_code: '+353' },
  { country_code: 'IL', country_name: 'Israel', phone_code: '+972' },
  { country_code: 'IM', country_name: 'Isla de Man', phone_code: '+44' },
  { country_code: 'IN', country_name: 'India', phone_code: '+91' },
  { country_code: 'IO', country_name: 'Territorio Británico del Océano Índico', phone_code: '+246' },
  { country_code: 'IQ', country_name: 'Irak', phone_code: '+964' },
  { country_code: 'IR', country_name: 'Irán', phone_code: '+98' },
  { country_code: 'IS', country_name: 'Islandia', phone_code: '+354' },
  { country_code: 'IT', country_name: 'Italia', phone_code: '+39' },
  { country_code: 'JE', country_name: 'Jersey', phone_code: '+44' },
  { country_code: 'JM', country_name: 'Jamaica', phone_code: '+1' },
  { country_code: 'JO', country_name: 'Jordania', phone_code: '+962' },
  { country_code: 'JP', country_name: 'Japón', phone_code: '+81' },
  { country_code: 'KE', country_name: 'Kenia', phone_code: '+254' },
  { country_code: 'KG', country_name: 'Kirguistán', phone_code: '+996' },
  { country_code: 'KH', country_name: 'Camboya', phone_code: '+855' },
  { country_code: 'KI', country_name: 'Kiribati', phone_code: '+686' },
  { country_code: 'KM', country_name: 'Comoras', phone_code: '+269' },
  { country_code: 'KN', country_name: 'San Cristóbal y Nieves', phone_code: '+1' },
  { country_code: 'KP', country_name: 'Corea del Norte', phone_code: '+850' },
  { country_code: 'KR', country_name: 'Corea del Sur', phone_code: '+82' },
  { country_code: 'KW', country_name: 'Kuwait', phone_code: '+965' },
  { country_code: 'KY', country_name: 'Islas Caimán', phone_code: '+1' },
  { country_code: 'KZ', country_name: 'Kazajistán', phone_code: '+7' },
  { country_code: 'LA', country_name: 'Laos', phone_code: '+856' },
  { country_code: 'LB', country_name: 'Líbano', phone_code: '+961' },
  { country_code: 'LC', country_name: 'Santa Lucía', phone_code: '+1' },
  { country_code: 'LI', country_name: 'Liechtenstein', phone_code: '+423' },
  { country_code: 'LK', country_name: 'Sri Lanka', phone_code: '+94' },
  { country_code: 'LR', country_name: 'Liberia', phone_code: '+231' },
  { country_code: 'LS', country_name: 'Lesoto', phone_code: '+266' },
  { country_code: 'LT', country_name: 'Lituania', phone_code: '+370' },
  { country_code: 'LU', country_name: 'Luxemburgo', phone_code: '+352' },
  { country_code: 'LV', country_name: 'Letonia', phone_code: '+371' },
  { country_code: 'LY', country_name: 'Libia', phone_code: '+218' },
  { country_code: 'MA', country_name: 'Marruecos', phone_code: '+212' },
  { country_code: 'MC', country_name: 'Mónaco', phone_code: '+377' },
  { country_code: 'MD', country_name: 'Moldavia', phone_code: '+373' },
  { country_code: 'ME', country_name: 'Montenegro', phone_code: '+382' },
  { country_code: 'MF', country_name: 'San Martín', phone_code: '+590' },
  { country_code: 'MG', country_name: 'Madagascar', phone_code: '+261' },
  { country_code: 'MH', country_name: 'Islas Marshall', phone_code: '+692' },
  { country_code: 'MK', country_name: 'Macedonia del Norte', phone_code: '+389' },
  { country_code: 'ML', country_name: 'Malí', phone_code: '+223' },
  { country_code: 'MM', country_name: 'Myanmar', phone_code: '+95' },
  { country_code: 'MN', country_name: 'Mongolia', phone_code: '+976' },
  { country_code: 'MO', country_name: 'Macao', phone_code: '+853' },
  { country_code: 'MP', country_name: 'Islas Marianas del Norte', phone_code: '+1' },
  { country_code: 'MQ', country_name: 'Martinica', phone_code: '+596' },
  { country_code: 'MR', country_name: 'Mauritania', phone_code: '+222' },
  { country_code: 'MS', country_name: 'Montserrat', phone_code: '+1' },
  { country_code: 'MT', country_name: 'Malta', phone_code: '+356' },
  { country_code: 'MU', country_name: 'Mauricio', phone_code: '+230' },
  { country_code: 'MV', country_name: 'Maldivas', phone_code: '+960' },
  { country_code: 'MW', country_name: 'Malaui', phone_code: '+265' },
  { country_code: 'MX', country_name: 'México', phone_code: '+52' },
  { country_code: 'MY', country_name: 'Malasia', phone_code: '+60' },
  { country_code: 'MZ', country_name: 'Mozambique', phone_code: '+258' },
  { country_code: 'NA', country_name: 'Namibia', phone_code: '+264' },
  { country_code: 'NC', country_name: 'Nueva Caledonia', phone_code: '+687' },
  { country_code: 'NE', country_name: 'Níger', phone_code: '+227' },
  { country_code: 'NF', country_name: 'Isla Norfolk', phone_code: '+672' },
  { country_code: 'NG', country_name: 'Nigeria', phone_code: '+234' },
  { country_code: 'NI', country_name: 'Nicaragua', phone_code: '+505' },
  { country_code: 'NL', country_name: 'Países Bajos', phone_code: '+31' },
  { country_code: 'NO', country_name: 'Noruega', phone_code: '+47' },
  { country_code: 'NP', country_name: 'Nepal', phone_code: '+977' },
  { country_code: 'NR', country_name: 'Nauru', phone_code: '+674' },
  { country_code: 'NU', country_name: 'Niue', phone_code: '+683' },
  { country_code: 'NZ', country_name: 'Nueva Zelanda', phone_code: '+64' },
  { country_code: 'OM', country_name: 'Omán', phone_code: '+968' },
  { country_code: 'PA', country_name: 'Panamá', phone_code: '+507' },
  { country_code: 'PE', country_name: 'Perú', phone_code: '+51' },
  { country_code: 'PF', country_name: 'Polinesia Francesa', phone_code: '+689' },
  { country_code: 'PG', country_name: 'Papúa Nueva Guinea', phone_code: '+675' },
  { country_code: 'PH', country_name: 'Filipinas', phone_code: '+63' },
  { country_code: 'PK', country_name: 'Pakistán', phone_code: '+92' },
  { country_code: 'PL', country_name: 'Polonia', phone_code: '+48' },
  { country_code: 'PM', country_name: 'San Pedro y Miquelón', phone_code: '+508' },
  { country_code: 'PN', country_name: 'Islas Pitcairn', phone_code: '+64' },
  { country_code: 'PR', country_name: 'Puerto Rico', phone_code: '+1' },
  { country_code: 'PS', country_name: 'Palestina', phone_code: '+970' },
  { country_code: 'PT', country_name: 'Portugal', phone_code: '+351' },
  { country_code: 'PW', country_name: 'Palaos', phone_code: '+680' },
  { country_code: 'PY', country_name: 'Paraguay', phone_code: '+595' },
  { country_code: 'QA', country_name: 'Catar', phone_code: '+974' },
  { country_code: 'RE', country_name: 'Reunión', phone_code: '+262' },
  { country_code: 'RO', country_name: 'Rumania', phone_code: '+40' },
  { country_code: 'RS', country_name: 'Serbia', phone_code: '+381' },
  { country_code: 'RU', country_name: 'Rusia', phone_code: '+7' },
  { country_code: 'RW', country_name: 'Ruanda', phone_code: '+250' },
  { country_code: 'SA', country_name: 'Arabia Saudí', phone_code: '+966' },
  { country_code: 'SB', country_name: 'Islas Salomón', phone_code: '+677' },
  { country_code: 'SC', country_name: 'Seychelles', phone_code: '+248' },
  { country_code: 'SD', country_name: 'Sudán', phone_code: '+249' },
  { country_code: 'SE', country_name: 'Suecia', phone_code: '+46' },
  { country_code: 'SG', country_name: 'Singapur', phone_code: '+65' },
  { country_code: 'SH', country_name: 'Santa Elena', phone_code: '+290' },
  { country_code: 'SI', country_name: 'Eslovenia', phone_code: '+386' },
  { country_code: 'SJ', country_name: 'Svalbard y Jan Mayen', phone_code: '+47' },
  { country_code: 'SK', country_name: 'Eslovaquia', phone_code: '+421' },
  { country_code: 'SL', country_name: 'Sierra Leona', phone_code: '+232' },
  { country_code: 'SM', country_name: 'San Marino', phone_code: '+378' },
  { country_code: 'SN', country_name: 'Senegal', phone_code: '+221' },
  { country_code: 'SO', country_name: 'Somalia', phone_code: '+252' },
  { country_code: 'SR', country_name: 'Surinam', phone_code: '+597' },
  { country_code: 'SS', country_name: 'Sudán del Sur', phone_code: '+211' },
  { country_code: 'ST', country_name: 'Santo Tomé y Príncipe', phone_code: '+239' },
  { country_code: 'SV', country_name: 'El Salvador', phone_code: '+503' },
  { country_code: 'SX', country_name: 'Sint Maarten', phone_code: '+1' },
  { country_code: 'SY', country_name: 'Siria', phone_code: '+963' },
  { country_code: 'SZ', country_name: 'Esuatini', phone_code: '+268' },
  { country_code: 'TC', country_name: 'Islas Turcas y Caicos', phone_code: '+1' },
  { country_code: 'TD', country_name: 'Chad', phone_code: '+235' },
  { country_code: 'TF', country_name: 'Territorios Australes Franceses', phone_code: '+262' },
  { country_code: 'TG', country_name: 'Togo', phone_code: '+228' },
  { country_code: 'TH', country_name: 'Tailandia', phone_code: '+66' },
  { country_code: 'TJ', country_name: 'Tayikistán', phone_code: '+992' },
  { country_code: 'TK', country_name: 'Tokelau', phone_code: '+690' },
  { country_code: 'TL', country_name: 'Timor Oriental', phone_code: '+670' },
  { country_code: 'TM', country_name: 'Turkmenistán', phone_code: '+993' },
  { country_code: 'TN', country_name: 'Túnez', phone_code: '+216' },
  { country_code: 'TO', country_name: 'Tonga', phone_code: '+676' },
  { country_code: 'TR', country_name: 'Turquía', phone_code: '+90' },
  { country_code: 'TT', country_name: 'Trinidad y Tobago', phone_code: '+1' },
  { country_code: 'TV', country_name: 'Tuvalu', phone_code: '+688' },
  { country_code: 'TW', country_name: 'Taiwán', phone_code: '+886' },
  { country_code: 'TZ', country_name: 'Tanzania', phone_code: '+255' },
  { country_code: 'UA', country_name: 'Ucrania', phone_code: '+380' },
  { country_code: 'UG', country_name: 'Uganda', phone_code: '+256' },
  { country_code: 'UM', country_name: 'Islas Ultramarinas de Estados Unidos', phone_code: '+1' },
  { country_code: 'US', country_name: 'Estados Unidos', phone_code: '+1' },
  { country_code: 'UY', country_name: 'Uruguay', phone_code: '+598' },
  { country_code: 'UZ', country_name: 'Uzbekistán', phone_code: '+998' },
  { country_code: 'VA', country_name: 'Ciudad del Vaticano', phone_code: '+39' },
  { country_code: 'VC', country_name: 'San Vicente y las Granadinas', phone_code: '+1' },
  { country_code: 'VE', country_name: 'Venezuela', phone_code: '+58' },
  { country_code: 'VG', country_name: 'Islas Vírgenes Británicas', phone_code: '+1' },
  { country_code: 'VI', country_name: 'Islas Vírgenes de los Estados Unidos', phone_code: '+1' },
  { country_code: 'VN', country_name: 'Vietnam', phone_code: '+84' },
  { country_code: 'VU', country_name: 'Vanuatu', phone_code: '+678' },
  { country_code: 'WF', country_name: 'Wallis y Futuna', phone_code: '+681' },
  { country_code: 'WS', country_name: 'Samoa', phone_code: '+685' },
  { country_code: 'YE', country_name: 'Yemen', phone_code: '+967' },
  { country_code: 'YT', country_name: 'Mayotte', phone_code: '+262' },
  { country_code: 'ZA', country_name: 'Sudáfrica', phone_code: '+27' },
  { country_code: 'ZM', country_name: 'Zambia', phone_code: '+260' },
  { country_code: 'ZW', country_name: 'Zimbabue', phone_code: '+263' }
];

/**
 * Normaliza el código telefónico asegurando que tenga exactamente un "+"
 */
const normalizePhoneCode = (phoneCode: string): string => {
  if (!phoneCode) return '';
  const cleanCode = phoneCode.replace(/^\++/, ''); // Elimina todos los "+" iniciales
  return `+${cleanCode}`; // Agrega exactamente un "+"
};

export const apiService = {
  /**
   * Obtiene la lista de países desde la API de Goveling
   * Si falla, usa la lista de fallback
   */
  async getCountries(): Promise<Country[]> {
    try {
      console.log('🌍 Fetching countries from Goveling API...');

      const response = await fetch(`${API_BASE_URL}/geo/countries`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Normalizar los códigos telefónicos
      const normalizedCountries = data.map((country: Country) => ({
        ...country,
        phone_code: normalizePhoneCode(country.phone_code)
      }));

      // Ordenar alfabéticamente por nombre del país
      const sortedCountries = normalizedCountries.sort((a: Country, b: Country) =>
        a.country_name.localeCompare(b.country_name)
      );

      console.log(`✅ Successfully loaded ${sortedCountries.length} countries from API`);
      return sortedCountries;

    } catch (error) {
      console.warn('⚠️ Failed to fetch countries from API, using fallback list:', error);

      // Normalizar códigos telefónicos en la lista de fallback
      const normalizedFallback = FALLBACK_COUNTRIES.map(country => ({
        ...country,
        phone_code: normalizePhoneCode(country.phone_code)
      }));

      // Ordenar alfabéticamente
      const sortedFallback = normalizedFallback.sort((a, b) =>
        a.country_name.localeCompare(b.country_name)
      );

      console.log(`📋 Using fallback list with ${sortedFallback.length} countries`);
      return sortedFallback;
    }
  },

  /**
   * Obtiene las ciudades de un país específico desde la API de Goveling
   * URL correcta: /geo/countries/{countryCode}/cities
   * Incluye caché en localStorage con timestamp de 24 horas
   */
  async getCitiesByCountry(countryCode: string): Promise<CityResult[]> {
    try {
      // Normalizar countryCode a mayúsculas
      const normalizedCountryCode = countryCode.toUpperCase();
      console.log(`🏙️ Fetching cities for country: ${normalizedCountryCode}`);

      // Verificar caché primero (24 horas de validez)
      const cacheKey = `cities_${normalizedCountryCode}`;
      const cachedData = this.getCachedData(cacheKey, 24 * 60 * 60 * 1000); // 24 horas en ms

      if (cachedData) {
        console.log(`🎯 Using cached cities for ${normalizedCountryCode}: ${cachedData.length} cities`);
        return cachedData;
      }

      // URL corregida según la documentación
      // Crear timeout compatible con React Native
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(`${API_BASE_URL}/geo/countries/${normalizedCountryCode}/cities`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });

        // Limpiar el timeout si la request es exitosa
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rawData = await response.json();

        // Transformar los datos según la documentación
        const transformedCities = rawData.map((city: any) => ({
          city: city.city || city.name,
          latitude: city.latitude || city.lat || 0,
          longitude: city.longitude || city.lng || city.lon || 0,
          population: city.population || 0,
          country_code: normalizedCountryCode
        }));

        // Ordenar por población (más grandes primero) y luego alfabéticamente
        const sortedCities = transformedCities.sort((a: CityResult, b: CityResult) => {
          // Primero por población (descendente)
          if (b.population !== a.population) {
            return b.population - a.population;
          }
          // Luego alfabéticamente
          return a.city.localeCompare(b.city, 'es', { sensitivity: 'base' });
        });

        // Para países con muchas ciudades, limitar a las más importantes
        // Esto mejora el rendimiento en React Native
        const optimizedCities = sortedCities.length > 2000
          ? sortedCities.slice(0, 1000) // Solo las 1000 ciudades más pobladas
          : sortedCities;

        // Guardar en caché
        this.setCachedData(cacheKey, optimizedCities);

        console.log(`✅ Successfully loaded ${optimizedCities.length} cities for ${normalizedCountryCode}${optimizedCities.length < sortedCities.length ? ` (optimized from ${sortedCities.length})` : ''}`);
        return optimizedCities;
      } catch (fetchError) {
        // Limpiar timeout en caso de error
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      console.error(`❌ Failed to fetch cities for ${countryCode}:`, error);
      throw error;
    }
  },

  /**
   * Obtiene datos del caché local con validación de timestamp
   */
  getCachedData(key: string, maxAgeMs: number): any[] | null {
    try {
      if (typeof localStorage === 'undefined') return null;

      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();

      if (now - timestamp > maxAgeMs) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.warn(`Error reading cache for ${key}:`, error);
      return null;
    }
  },

  /**
   * Guarda datos en caché local con timestamp
   */
  setCachedData(key: string, data: any[]): void {
    try {
      if (typeof localStorage === 'undefined') return;

      const cacheEntry = {
        data,
        timestamp: Date.now()
      };

      localStorage.setItem(key, JSON.stringify(cacheEntry));
    } catch (error) {
      console.warn(`Error saving cache for ${key}:`, error);
    }
  }
};
