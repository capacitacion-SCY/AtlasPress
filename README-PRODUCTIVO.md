# Atlas Press Argentina - versión productiva

Esta versión migra Atlas a Next.js + Supabase para que el sitio pueda guardar datos en una base real, usar sesiones seguras y administrar permisos por usuario.

## Puesta en marcha

1. Instalar dependencias:

```bash
npm install
```

2. Crear un proyecto en Supabase.

3. Ejecutar `supabase/schema.sql` en el editor SQL de Supabase.

4. Crear `.env.local` a partir de `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

5. Crear el primer usuario desde Supabase Auth.

6. Darle permisos de administrador al perfil creado:

```sql
update public.profiles
set role = 'admin',
    permissions = array['stories', 'ads', 'impact', 'settings', 'users'],
    active = true
where email = 'tu-email@dominio.com';
```

7. Iniciar desarrollo:

```bash
npm run dev
```

8. Verificar build productivo:

```bash
npm run build
```

## Admin

El panel `/admin` ya trabaja con Supabase Auth y Row Level Security. Incluye:

- Ajustes rápidos del sitio.
- Nueva nota.
- Crear publicidad.
- Franja de impacto.
- Notas publicadas con miniatura.
- Publicidad activa.
- Importar / Exportar backup JSON.
- Equipo editorial con roles y permisos.

## Backup

Desde `/admin#importar-exportar` se puede descargar un respaldo JSON. Para restaurar publicaciones, pegar el JSON exportado en el formulario de importación. Las notas se actualizan por `slug`, para reducir duplicados.

Para produccion real, este backup manual debe complementarse con backups automaticos de Supabase desde el plan del proyecto.

## Imagenes

El admin permite subir imágenes al bucket público `atlas-media` para notas y publicidades. Si ya habías ejecutado `supabase/schema.sql` antes de esta mejora, o si Supabase indica que el bucket no existe, ejecuta también:

```text
supabase/storage-policies.sql
```

Esto actualiza las políticas para que usuarios con permisos de notas, publicidad o ajustes puedan subir medios.

Si el proyecto ya tenía datos cargados antes de los últimos retoques ortográficos, puedes ejecutar:

```text
supabase/visual-polish.sql
```

Esto corrige nombres visibles como `Prevención`, `Jóvenes` y `Librería` sin cambiar los slugs ni romper enlaces.

## Nota de seguridad

Las credenciales anteriores basadas en `localStorage` eran útiles para maqueta, pero no son suficientes para web pública. Esta versión usa sesiones de Supabase, políticas RLS y permisos por perfil. El siguiente salto recomendado es subir imágenes al bucket `atlas-media` desde el admin en vez de pegar solo URLs externas.
