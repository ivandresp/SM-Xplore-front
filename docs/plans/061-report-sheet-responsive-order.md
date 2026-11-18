# Orden de ficha en móvil y tablet

Bajo1000px, aplanar contenedores de columnas con display:contents y ordenar cards: fotos si existen, comentarios, ficha, gestión/historial. Desktop conserva columnas actuales. Sin duplicar ficha/mapa ni cambiar lógica/API. Verificar posiciones375/768/1280 en E2E existente y gates. Skills normativas ausentes, ninguna cargada.

Verificación: typecheck/lint/build exit0; suite589/590 con un fallo previo de catálogo. Auditor audit_table PASA por inspección. Sin duplicación de ficha/mapa. Límite: orden de foco conserva DOM; controles de mapa se leen antes de comentarios aunque visualmente ficha quede después. No probado lector de pantalla/zoom/Safari. git diff --check sin errores.

Playwright25/25 en48,6s: geometría confirma ficha debajo de comentarios375/768 y a izquierda1280, sin overflow. Capturas /tmp/comments-panel-{375,768,1280}.png renovadas.
