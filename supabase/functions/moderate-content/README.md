# Moderate Content Edge Function

Sistema de moderación de contenido para Goveling Social.

## Deploy

Para deployar esta función a Supabase:

```bash
cd /Users/sebastianaraos/Desktop/Goveling-rn2025

# Deploy la función
supabase functions deploy moderate-content --project-ref iwsuyrlrbmnbfyfkqowl
```

## Uso

### Endpoint

```
POST https://iwsuyrlrbmnbfyfkqowl.supabase.co/functions/v1/moderate-content
```

### Headers

```
Authorization: Bearer YOUR_ANON_KEY
Content-Type: application/json
```

### Request Body

```json
{
  "content_type": "post",
  "text": "Texto a moderar",
  "image_urls": ["https://..."],
  "user_id": "uuid-del-usuario"
}
```

### Response (Contenido Aprobado)

```json
{
  "approved": true,
  "text_result": {
    "is_clean": true
  },
  "image_results": [
    {
      "url": "https://...",
      "is_clean": true
    }
  ],
  "moderation_log_id": "uuid"
}
```

### Response (Contenido Rechazado)

```json
{
  "approved": false,
  "reason": "inappropriate_language",
  "message": "Text contains inappropriate language",
  "text_result": {
    "is_clean": false,
    "detected_words": ["palabra1", "palabra2"],
    "cleaned_text": "Texto con *******"
  },
  "moderation_log_id": "uuid"
}
```

## Fase 1 vs Fase 2

### Fase 1 (Actual)

- Moderación de texto con bad-words
- Soporte para ES, EN, FR
- Logging en base de datos

### Fase 2 (Próximamente)

- Integración con AWS Rekognition para imágenes
- Detección de:
  - Nudez explícita
  - Contenido sugerente
  - Violencia
  - Símbolos de odio
  - Drogas, tabaco, alcohol
  - Y más...

## Testing Local

```bash
# Servir localmente
supabase functions serve moderate-content

# Test con curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/moderate-content' \
  --header 'Authorization: Bearer eyJhb...' \
  --header 'Content-Type: application/json' \
  --data '{
    "content_type": "post",
    "text": "Este es un texto limpio",
    "user_id": "test-user-id"
  }'
```

## Variables de Entorno

Las siguientes variables ya están configuradas automáticamente por Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No necesitas configurar nada adicional para Fase 1.
