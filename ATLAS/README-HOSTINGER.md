# Deploy en Hostinger (Next.js + Supabase)

Este proyecto usa `Next.js` con renderizado dinámico y acciones de servidor, por lo que se publica como app Node.js (no como HTML estático).

## 1) Requisitos de hosting

- Plan Hostinger con soporte Node.js (o VPS).
- Node.js 20+ recomendado.
- Acceso SSH.

## 2) Variables de entorno

Configura en Hostinger las mismas variables de `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Cualquier otra variable usada por login/admin.

## 3) Build y arranque

```bash
npm install
npm run build
npm run start -- --port 3000
```

Si Hostinger usa PM2:

```bash
pm2 start npm --name atlas-press -- run start -- --port 3000
pm2 save
```

## 4) Dominio y proxy

- Apunta el dominio/subdominio al servicio Node.js.
- Configura HTTPS desde Hostinger.
- Si usas proxy inverso, enruta al puerto de la app (ej. `3000`).

## 5) Checklist previo a publicar

- `npm run build` sin errores.
- `npx tsc --noEmit` sin errores.
- Probar en producción local con `npm run start -- --port 3000`.
- Admin `/admin` inicia sesión correctamente.
- Se crean/actualizan notas y categorías.
- Carga de imágenes/video funcionando con Supabase.
- Filtros por categoría y detalle de artículo correctos.
- En Supabase, confirmar que `public.stories` tenga `gallery_images` y `gallery_videos`, y que `public.site_settings` tenga los tres temporizadores.
- Verificar que las categorías usen slugs semánticos (`medio-ambiente`, `derechos-humanos`, `economia`, etc.) para evitar filtros inconsistentes.

## Nota

`next lint` en este entorno solicita inicialización interactiva de ESLint. No bloquea el deploy, pero conviene definir ESLint luego para CI.
