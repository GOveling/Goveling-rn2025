import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export interface PhotoLocation {
  latitude: number;
  longitude: number;
  timestamp?: Date;
}

/**
 * Extrae las coordenadas GPS del EXIF metadata de una foto
 */
export async function extractPhotoLocation(
  asset: ImagePicker.ImagePickerAsset
): Promise<PhotoLocation | null> {
  try {
    console.log('📸 EXIF Debug - Asset URI:', asset.uri);
    console.log('📸 EXIF Debug - Has exif?', !!asset.exif);

    // expo-image-picker incluye GPS directamente en el objeto exif (no en exif.GPS)
    if (asset.exif) {
      console.log('📸 EXIF Debug - EXIF keys:', Object.keys(asset.exif));
      const exif = asset.exif as any;

      // ⚠️ IMPORTANTE: En iOS, las claves GPS están en el root del EXIF
      // Buscar GPSLatitude o dentro de un objeto GPS (depende de la plataforma)
      const hasGPSKeys = 'GPSLatitude' in exif || ('GPS' in exif && exif.GPS);
      console.log('📸 EXIF Debug - Has GPS keys?', hasGPSKeys);

      let latitude: number | null = null;
      let longitude: number | null = null;

      // Caso 1: GPS directamente en el root (iOS/HEIC)
      if (exif.GPSLatitude && exif.GPSLongitude) {
        console.log('📸 EXIF Debug - GPS in root (iOS format)');
        console.log('📸 EXIF Debug - GPSLatitude:', exif.GPSLatitude);
        console.log('📸 EXIF Debug - GPSLongitude:', exif.GPSLongitude);
        console.log('📸 EXIF Debug - GPSLatitudeRef:', exif.GPSLatitudeRef);
        console.log('📸 EXIF Debug - GPSLongitudeRef:', exif.GPSLongitudeRef);

        // iOS puede dar coordenadas ya en decimal o en array [grados, minutos, segundos]
        latitude = convertGPSToDecimal(exif.GPSLatitude, exif.GPSLatitudeRef);
        longitude = convertGPSToDecimal(exif.GPSLongitude, exif.GPSLongitudeRef);
      }
      // Caso 2: GPS dentro de un objeto GPS (Android/JPEG)
      else if (exif.GPS && exif.GPS.Latitude && exif.GPS.Longitude) {
        console.log('📸 EXIF Debug - GPS in GPS object (Android format)');
        console.log('📸 EXIF Debug - GPS data:', exif.GPS);

        latitude = convertGPSToDecimal(exif.GPS.Latitude, exif.GPS.LatitudeRef);
        longitude = convertGPSToDecimal(exif.GPS.Longitude, exif.GPS.LongitudeRef);
      } else {
        console.log('⚠️ EXIF Warning - No GPS data found in EXIF');
        console.log(
          '⚠️ Available keys:',
          Object.keys(exif).filter((key) => key.includes('GPS'))
        );
      }

      console.log('📸 EXIF Debug - Converted coords:', { latitude, longitude });

      if (latitude && longitude) {
        console.log('✅ GPS extraction successful!');
        return {
          latitude,
          longitude,
          timestamp: exif.DateTime ? new Date(exif.DateTime) : undefined,
        };
      }
    } else {
      console.log('⚠️ EXIF Warning - No EXIF metadata in photo');
    }

    return null;
  } catch (error) {
    console.error('❌ Error extracting photo location:', error);
    return null;
  }
}

/**
 * Extrae ubicaciones de múltiples fotos
 */
export async function extractPhotosLocations(
  assets: ImagePicker.ImagePickerAsset[]
): Promise<PhotoLocation[]> {
  const locations = await Promise.all(assets.map((asset) => extractPhotoLocation(asset)));

  return locations.filter((loc): loc is PhotoLocation => loc !== null);
}

/**
 * Obtiene la ubicación central promedio de múltiples fotos
 */
export function getAverageLocation(locations: PhotoLocation[]): PhotoLocation | null {
  if (locations.length === 0) return null;

  const sum = locations.reduce(
    (acc, loc) => ({
      latitude: acc.latitude + loc.latitude,
      longitude: acc.longitude + loc.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: sum.latitude / locations.length,
    longitude: sum.longitude / locations.length,
  };
}

/**
 * Obtiene la ubicación actual del dispositivo
 */
export async function getCurrentLocation(): Promise<PhotoLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      console.log('Location permission not granted');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

/**
 * Convierte coordenadas GPS del formato EXIF a decimal
 * Soporta:
 * - Número decimal directo (iOS HEIC): 40.68858
 * - Array [grados, minutos, segundos] (Android JPEG): [40, 41, 18.888]
 */
function convertGPSToDecimal(
  coordinate: number | number[] | undefined,
  direction: string | undefined
): number | null {
  if (!coordinate) {
    return null;
  }

  let decimal: number;

  // Si ya es un número decimal (iOS HEIC)
  if (typeof coordinate === 'number') {
    decimal = coordinate;
  }
  // Si es array [grados, minutos, segundos] (Android JPEG)
  else if (Array.isArray(coordinate) && coordinate.length === 3) {
    const [degrees, minutes, seconds] = coordinate;
    decimal = degrees + minutes / 60 + seconds / 3600;
  }
  // Formato no reconocido
  else {
    console.log('⚠️ GPS format not recognized:', coordinate);
    return null;
  }

  // Aplicar dirección (Sur y Oeste son negativos)
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

/**
 * Calcula la distancia entre dos coordenadas (en kilómetros)
 * Usando la fórmula de Haversine
 */
export function calculateDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Formatea la distancia para mostrar
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  } else {
    return `${Math.round(distanceKm)} km`;
  }
}
