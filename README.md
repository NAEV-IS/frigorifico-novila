# Frigorífico Novila

Prototipo funcional interactivo de **Frigorífico Novila** — Web cliente, NovilaBot, panel del frigorífico y CRM WhatsApp.

## Estructura del proyecto

- `src/` — Código fuente de la aplicación React (`app.jsx`, `data.js`, `images.js`, `styles.css`, `fonts.css`).
- `assets/` — Recursos gráficos e imágenes optimizadas.
- `index.template.html` — Plantilla HTML base.
- `tailwind.config.js` — Configuración de Tailwind CSS.
- `build.mjs` — Script de compilación con `esbuild` y `tailwindcss` que genera el HTML autónomo.
- `combine.mjs` — Script auxiliar para empaquetar los artefactos de `dist/` en el HTML final.
- `Frigorifico-Novila-Demo.html` — Demostración compilada en un único archivo HTML autónomo (sin CDN).

## Compilación

```bash
pnpm install
node build.mjs
```

El comando `node build.mjs` genera `Frigorifico-Novila-Demo.html` listo para abrir directamente en cualquier navegador.
