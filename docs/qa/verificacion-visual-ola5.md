# Verificación visual de la ola 5 — zoom y navegadores

Procedimiento manual para lo que el e2e no cubre (zoom real del navegador y
Safari/Firefox). No se automatiza: la emulación de zoom no equivale al zoom real.

## Pasos

1. Levanta el stack (gateway :8088) y `npm run dev`; comprueba que sirve el árbol
   bajo prueba (un fichero nuevo debe existir en `/src/`).
2. Chrome: zoom del navegador a **200 %** (Ctrl/Cmd + dos veces, no emulación) en
   `/explorar`, `/eventos`, `/atractivos`, `/servicios`, `/recomendaciones`,
   `/reportes`, `/perfil` y `/app/solicitudes`. Claro y oscuro.
3. Safari (macOS/iOS) y Firefox: mismas rutas a 375, 768 y 1280, claro y oscuro.
4. Comprueba: sin scroll horizontal de página, foco visible en teclado, targets
   táctiles de 44 px con dedo, cabecera del panel alcanzable tras scrollear y
   menú móvil operable.

## Estado (2026-11-12)

- Chrome headless: cubierto por `npm run test:e2e` (responsive, touch, sticky).
- **Pendiente:** zoom 200 % real, Safari y Firefox. No se declaran probados.
