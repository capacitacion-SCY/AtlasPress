# Atlas Press Argentina en Hostinger

## Archivos a subir

Subí el contenido de la carpeta `hostinger-upload` al directorio público de Hostinger, normalmente `public_html`.

La carpeta incluye:

- `index.html`
- `article.html`
- `admin.html`
- `assets/`

## Antes de subir

- Hace una recarga fuerte con `Ctrl+F5` en tu navegador para verificar los ultimos cambios.
- Si queres conservar el aspecto actual, no edites rutas ni nombres de archivos.

## Cómo publicarlo

1. Entra al panel de Hostinger.
2. Abri `File Manager`.
3. Entra a `public_html`.
4. Subí todo el contenido de `hostinger-upload`.
5. Si ya habia archivos viejos, reemplazalos.

## Importante sobre el admin

Esta versión sigue usando `localStorage`.

Eso significa:

- el sitio público se puede ver online sin problema;
- el `admin.html` no guarda cambios en una base de datos real;
- los cambios hechos desde el admin quedan guardados solo en el navegador desde donde se editan;
- si abris el sitio desde otra PC o desde otro navegador, esos cambios no van a aparecer automaticamente.

## Recomendacion practica

Si vas a subir esta versión ahora:

- usala como sitio publicado/mostrable;
- no la tomes todavia como CMS multiusuario real.

Para una versión productiva real, el siguiente paso sigue siendo migrar a una base de datos y autenticación reales.
