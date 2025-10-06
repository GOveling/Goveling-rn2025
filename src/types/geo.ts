// Interfaces para el sistema geográfico de países y ciudades

export interface Country {
  country_code: string;   // ISO 3166-1 alpha-2 (ej: "US", "MX", "ES")
  country_name: string;   // Nombre completo (ej: "United States", "Mexico")
  phone_code: string;     // Código telefónico con "+" (ej: "+1", "+52", "+34")
}

export interface CityResult {
  city: string;           // Nombre de la ciudad
  latitude: number;       // Coordenada latitud
  longitude: number;      // Coordenada longitud
  population: number;     // Población
  country_code: string;   // Código del país (FK)
}

export interface GeoApiResponse<T> {
  success: boolean;
  data: T[];
  error?: string;
}
