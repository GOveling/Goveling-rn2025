# Process Image Edge Function

Optimiza y procesa imágenes subidas por los usuarios.

## Funcionalidad

- Descarga imágenes de Storage
- Obtiene dimensiones
- Genera thumbnails (placeholder)
- Genera blurhash (placeholder)
- Registra en moderation_logs

## Uso

```bash
curl -X POST \
  'https://iwsuyrlrbmnbfyfkqowl.supabase.co/functions/v1/process-image' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://iwsuyrlrbmnbfyfkqowl.supabase.co/storage/v1/object/public/social-temp/user123/image.jpg",
    "user_id": "user-uuid",
    "content_type": "post",
    "max_width": 1080,
    "max_height": 1080,
    "quality": 80
  }'
```

## Response

```json
{
  "success": true,
  "original_url": "https://...",
  "thumbnail_url": "https://...",
  "blurhash": "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
  "dimensions": {
    "width": 1080,
    "height": 1080
  },
  "file_size": 245678
}
```

## Nota

Esta es una versión básica. Para procesamiento real de imágenes necesitarás:

- Librería de procesamiento de imágenes (sharp, ImageMagick)
- Generación real de thumbnails
- Cálculo real de blurhash
- Conversión a WebP
