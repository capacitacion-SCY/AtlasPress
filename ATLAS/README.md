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

No usar Live Server ni abrir archivos HTML directamente. El sitio real corre con Next.js y se ve desde el servidor local o desde el hosting Node.js.

## Publicacion (Hostinger)

Publicar como app Node.js (no sitio estatico).

Build y arranque:

```bash
npm install
npm run build
npm run start -- --port 3000
```

Variables necesarias:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

No subir `.env.local`, `.next` ni `node_modules`.

## Documentacion util

- `README-HOSTINGER.md`: pasos de deploy en Hostinger.
- `README-PRODUCTIVO.md`: configuracion productiva.
- `supabase/README.md`: orden recomendado para preparar Supabase.
