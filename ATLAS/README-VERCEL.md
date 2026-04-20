# Deploy de Atlas en Vercel

Si Vercel dice que no encuentra Next.js, casi siempre esta mirando la carpeta equivocada.

## Configuracion correcta

La carpeta raiz del proyecto en Vercel debe ser la carpeta que contiene estos archivos:

```text
package.json
app/
components/
lib/
next.config.mjs
```

En este proyecto esa carpeta es:

```text
ATLAS
```

Si en GitHub la carpeta se llama `Atlas`, usa exactamente `Atlas`. Si se llama `ATLAS`, usa exactamente `ATLAS`.

## Si tu repositorio tiene una carpeta ATLAS adentro

En Vercel:

1. Entra al proyecto.
2. Ve a `Settings`.
3. Ve a `General`.
4. Busca `Root Directory`.
5. Selecciona o escribe:

```text
ATLAS
```

6. Guarda y vuelve a desplegar.

## Variables de entorno

En `Settings > Environment Variables`, agrega:

```text
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

Para crear usuarios, cambiar contrasenas y sincronizar el equipo editorial desde el admin de Atlas, agrega tambien esta variable solo en Vercel:

```text
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_de_supabase
```

Esa clave se obtiene en Supabase en `Project Settings > API`. Es una clave privada de servidor: no debe empezar con `NEXT_PUBLIC_`, no debe ir en el navegador y no debe subirse a GitHub.

No subas `.env.local` a GitHub.

## Error: Application error

Si Vercel muestra:

```text
Application error: a server-side exception has occurred
```

revisa primero estas dos cosas:

1. Que `Root Directory` sea el nombre exacto de la carpeta del proyecto (`Atlas` o `ATLAS`).
2. Que las variables de entorno existan en Vercel para `Production`, `Preview` y `Development`.

Los nombres deben ser exactamente:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Despues de agregarlas o corregirlas, haz un redeploy. Vercel no siempre aplica variables nuevas al deploy anterior.

## Imagenes no suben

Si el admin falla al subir imagenes, verifica que exista el bucket publico `atlas-media` en Supabase.

En Supabase, abre `SQL Editor` y ejecuta:

```text
supabase/storage-policies.sql
```

Ese script crea el bucket si falta y configura las politicas de lectura/subida.
