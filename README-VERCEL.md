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
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

No subas `.env.local` a GitHub.
