# 🧪 Quick Testing Guide

## Ejecutar Tests Globales

```bash
# Test completo de 85 ubicaciones en todos los continentes
node test-geo-global.js

# Salida esperada:
# - 72/85 tests pasando (84.7%)
# - Tiempo promedio: 457ms
# - Duración total: ~40 segundos
```

## Probar Ubicaciones Específicas con curl

```bash
# Santiago, Chile (debe retornar CL)
curl -X POST 'https://iwsuyrlrbmnbfyfkqowl.supabase.co/functions/v1/geo-lookup' \
  -H 'Content-Type: application/json' \
  -d '{"lat": -33.4489, "lng": -70.6693}'

# Antofagasta, Chile - Bug Original (debe retornar CL, no AR)
curl -X POST 'https://iwsuyrlrbmnbfyfkqowl.supabase.co/functions/v1/geo-lookup' \
  -H 'Content-Type: application/json' \
  -d '{"lat": -23.6509, "lng": -70.3975}'

# Buenos Aires, Argentina (debe retornar AR)
curl -X POST 'https://iwsuyrlrbmnbfyfkqowl.supabase.co/functions/v1/geo-lookup' \
  -H 'Content-Type: application/json' \
  -d '{"lat": -34.6037, "lng": -58.3816}'

# Tokyo, Japan (debe retornar JP)
curl -X POST 'https://iwsuyrlrbmnbfyfkqowl.supabase.co/functions/v1/geo-lookup' \
  -H 'Content-Type: application/json' \
  -d '{"lat": 35.6762, "lng": 139.6503}'
```

## Respuesta Esperada

```json
{
  "country_iso": "CL",
  "region_code": null,
  "offshore": false,
  "cached": false,
  "executionTime": 457
}
```

## Tests Unitarios (Pendiente Configuración Jest)

```bash
# Cuando Jest esté configurado:
npm test

# Tests específicos de geo:
npm run test:geo

# Con coverage:
npm run test:coverage
```

## Verificar TypeScript

```bash
npx tsc --noEmit
```

## Verificar ESLint

```bash
npx eslint .
```

## Ubicaciones de Referencia

### Casos Críticos ✅
- **Antofagasta, Chile:** -23.6509, -70.3975 → Debe ser **CL** (era AR)
- **Santiago, Chile:** -33.4489, -70.6693 → Debe ser **CL**
- **Buenos Aires, Argentina:** -34.6037, -58.3816 → Debe ser **AR**
- **Mendoza, Argentina (near border):** -32.8895, -68.8458 → Debe ser **AR**

### Casos Edge ❌ (Geometrías Faltantes)
- **Montevideo, Uruguay:** -34.9011, -56.1645 → Retorna `undefined`
- **New York, USA:** 40.7128, -74.0060 → Retorna `undefined`
- **Hong Kong:** 22.3193, 114.1694 → Retorna `undefined`

## Documentación

- **Reporte Completo:** `GLOBAL_TESTING_REPORT.md`
- **Resumen Visual:** `PASO_8_TESTING_SUMMARY.txt`
- **Tests Unitarios:** `src/lib/geo/__tests__/`
- **Script de Testing:** `test-geo-global.js`

## Próximos Pasos

1. **Upgrade Natural Earth 10m** para casos edge
2. **Agregar dataset USA** para geometrías faltantes
3. **Implementar fallback** a geocoding para `undefined` cases
4. **Configurar Jest** para tests unitarios automatizados
