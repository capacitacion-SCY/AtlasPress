# Atlas Press Argentina

Sitio editorial productivo construido con Next.js y Supabase.

Incluye:

- Portada publica dinamica.
- Vista individual de articulos.
- Panel `/admin` con Supabase Auth.
- Roles y permisos por usuario.
- Carga de imagenes en Supabase Storage.
- Importacion y exportacion de backup JSON.
- Tema claro/oscuro adaptado al navegador.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir:

```text
http://localhost:3000
http://localhost:3000/admin
```

No usar Live Server ni abrir `index.html` / `admin.html` directamente. Esos archivos solo existen como puentes para evitar confusion; el sitio real corre con Next.js.

## Publicacion

La publicacion recomendada es Vercel.

Si el repositorio contiene este proyecto dentro de una carpeta `Atlas`, configurar en Vercel:

```text
Root Directory: Atlas
```

Variables necesarias:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

No subir `.env.local`, `.next`, `.vercel` ni `node_modules`.

## Documentacion util

- `README-VERCEL.md`: pasos de deploy.
- `README-PRODUCTIVO.md`: configuracion productiva.
- `supabase/README.md`: orden recomendado para preparar Supabase.
