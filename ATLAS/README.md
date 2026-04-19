# Atlas Press Argentina

Base visual para un portal editorial estilo magazine/newsroom, con:

- Portada pública dinámica.
- Vista de artículo.
- Panel web de administración.
- Login con usuario y contraseña.
- Edición de notas y configuración del sitio.

## Demo local

Abrí estos archivos en el navegador:

- `index.html`
- `article.html`
- `admin.html`

## Credenciales demo

- Usuario: `admin`
- Contraseña: `admin123`

## Importante

Esta versión usa `localStorage` del navegador para funcionar sin backend en este entorno. Eso significa:

- Sirve como demo funcional del producto.
- No es segura para producción.
- Los cambios quedan guardados en el navegador local.

## Para volverlo productivo

El siguiente paso recomendable es migrarlo a una stack con backend real, por ejemplo:

1. `Next.js` o `Astro` para frontend.
2. `Supabase`, `Firebase` o `Node + PostgreSQL` para auth y CMS.
3. Panel admin protegido con sesiones reales.
4. Carga de imágenes y base de datos persistente.

Si querés, en el próximo paso te lo convierto a una versión productiva con una stack concreta.

## Documentación extra

- `PRODUCT-PLAN.md`: propuesta para migrar esta demo a una versión productiva con backend real.
