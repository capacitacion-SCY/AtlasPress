# Plan Productivo

## Objetivo

Convertir la demo actual de Atlas Press Argentina en un sitio publicable, editable vía web y con seguridad real.

## Stack recomendada

- Frontend: `Next.js`
- UI: `Tailwind CSS` o CSS modular conservando esta identidad visual
- Backend/Auth/DB: `Supabase`
- Almacenamiento de imágenes: `Supabase Storage`
- Hosting: `Vercel`

## Qué resolvería esta arquitectura

- Login real con usuario y contraseña cifrada
- Roles de editor y administrador
- Publicación de artículos desde un panel web seguro
- Persistencia en base de datos
- Carga de imágenes propia
- URLs limpias para notas y categorías
- SEO real para Google y redes sociales

## Modelo inicial de contenido

### Tabla `users`

- `id`
- `email`
- `name`
- `role`
- `created_at`

### Tabla `categories`

- `id`
- `name`
- `slug`
- `created_at`

### Tabla `posts`

- `id`
- `title`
- `slug`
- `excerpt`
- `content`
- `cover_image`
- `category_id`
- `author_id`
- `featured`
- `editors_pick`
- `status`
- `published_at`
- `created_at`
- `updated_at`
- `source_label`
- `source_url`

## Secciones editoriales sugeridas

- Interreligioso
- Scientology Argentina
- Derechos Humanos
- Prevención
- El Camino a la Felicidad
- CCHR
- Historias que Inspiran

## Panel admin mínimo viable

- Login
- Lista de artículos
- Crear/editar/borrar artículo
- Gestión de categorías
- Subida de imagen
- Marcar destacada / selección del editor
- Guardar borrador o publicar

## Etapas

1. Migrar diseño actual a `Next.js`
2. Crear base de datos y autenticación en `Supabase`
3. Conectar panel admin a la base real
4. Crear rutas públicas por artículo y categoría
5. Cargar contenido inicial argentino e interreligioso
6. Ajustar SEO, sitemap y metadatos sociales
7. Publicar

## Observación

En este entorno no pude instalar `Node.js` ni dependencias, así que no puedo construir esa versión productiva directamente desde acá sin que primero habilitemos herramientas de desarrollo.
