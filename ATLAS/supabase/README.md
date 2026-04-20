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

Para crear usuarios, sincronizar el equipo editorial y cambiar contraseñas desde Atlas, configurar tambien esta variable solo en el servidor/Vercel:

```bash
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

No poner la `service_role key` en archivos publicos, no compartirla y no subirla a GitHub. La lectura publica del sitio usa la publishable key; las acciones delicadas de usuarios usan la service role key desde servidor.

Si el esquema ya estaba cargado antes de habilitar subida de imagenes, ejecutar tambien `storage-policies.sql` para actualizar los permisos del bucket `atlas-media`.

Antes de publicar, confirmar que existan notas con `status = 'published'`; si no hay notas publicadas, la portada puede verse vacia aunque la conexion funcione correctamente.
