# Supabase para Atlas

Orden recomendado:

1. Crear un proyecto en Supabase.
2. Abrir `SQL Editor` y ejecutar `schema.sql`.
3. Crear el primer usuario desde `Authentication > Users`.
4. Editar `first-admin.sql`, reemplazar `admin@atlas.local` por el email real y ejecutarlo.
5. Crear `.env.local` en la raiz de Atlas con:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

No poner la `service_role key` en archivos públicos ni compartirla. Para el sitio y el admin actual alcanza con la publishable key porque la seguridad real la aplican Auth + RLS.

Si el esquema ya estaba cargado antes de habilitar subida de imágenes, ejecutar también `storage-policies.sql` para actualizar los permisos del bucket `atlas-media`.
