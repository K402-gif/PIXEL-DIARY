# Pixel Diario (versión automática)

Sitio estático + un script que cada 6 horas lee feeds RSS y las tiendas de Steam y Epic, y guarda `public/data.json`.

## Publicar con GitHub Pages (≈10 min)
1. Crea una cuenta en github.com y un repositorio **público** (con la cuenta gratuita, GitHub Pages solo funciona en repositorios públicos).
2. Sube el contenido de esta carpeta (botón *Add file → Upload files*; incluye la carpeta `.github`).
3. En el repo: *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
4. Ve a *Actions → Publicar sitio → Run workflow*. Al terminar, tu web estará en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.
5. Desde entonces se actualiza sola cada 6 horas (y cada vez que cambies un archivo).
6. Edita `UA` en `scripts/update.mjs` con tu web o email, y pega tus enlaces en `DONATE` de `public/index.html`.

## Qué lee
- **Noticias, reseñas, eSports y plataformas:** feeds RSS de `FEEDS` (añade o quita). Una noticia es «reseña» si el título lo indica.
- **Steam:** rebajas de `store.steampowered.com/api/featuredcategories` (endpoint público no documentado oficialmente).
- **Epic:** juegos gratis de `freeGamesPromotions` (también no oficial).
- **Xbox:** sin fuente pública estable de precios; hay noticias de Xbox Wire y enlaces a su tienda.
- Si una fuente falla se conserva el dato anterior. Los endpoints no oficiales pueden cambiar sin aviso.

## Prueba local
`node scripts/update.mjs` y abre `public/index.html` con un servidor (`npx serve public`).

## Dinero
- **Afiliados:** pon un código en los secretos del repo `AFF_EPIC` (p. ej. `epic_creator_id=TUCODIGO`, programa Support-A-Creator) o `AFF_STEAM`; se añade a los enlaces. Steam no tiene programa de afiliados propio; tiendas de claves, Amazon y otras sí. Indica que son enlaces de afiliado.
- **Publicidad** (AdSense u otras): exigen contenido propio y algo de tráfico. Añade análisis o guías tuyas.
- **Boletín, patrocinios, donaciones.**
- Muestra solo titular y resumen breve con enlace; no copies artículos completos.

## Guías y análisis
Edita `public/articulos.json` (título, etiqueta, fecha y párrafos). Aparecen en la sección «Guías y análisis». Si escribes reseñas jugadas por ti, añádelas ahí con la etiqueta «Reseña».

## Boletín semanal
1. Crea una cuenta en Buttondown y copia tu usuario en `NEWSLETTER_USER` de `public/index.html` (aparece el formulario de suscripción).
2. En GitHub → Settings → Secrets: `BUTTONDOWN_API_KEY`. En Variables: `SITE_URL` y, cuando confíes en el resultado, `NEWSLETTER_SEND=1`.
3. Cada lunes (08:00 UTC) se crea el boletín con las mejores rebajas de Steam, los juegos gratis de Epic y cinco lecturas. Sin `NEWSLETTER_SEND=1` queda como **borrador** para que lo revises antes de enviarlo.
4. Comprueba en la documentación de Buttondown que la API y la dirección del formulario siguen siendo las mismas.

## Cobrar
Pega tus enlaces en `DONATE` (`public/index.html`): PayPal.Me, Ko-fi o Patreon. Antes de elegir, comprueba en cada plataforma si puede pagar a tu país.
