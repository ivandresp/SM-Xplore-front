# Botón Volver compartido

Sustituir enlaces de navegación de regreso (detalles/formularios, errores, recuperación y404) por BackButton: Button accent, icono flecha izquierda y texto Volver (Back en inglés),44px y estados del componente base. Conservar cada destino explícito: no navigate(-1), para que entrada directa y shells no regresen a páginas inesperadas. No cambiar botones de login que retroceden un paso de MFA ni acciones de geolocalización, que no son enlaces de navegación. Reutilizar también acción inferior Volver al listado ya existente.

Componente namedexport/index CSSModules con margen inferior; sin nuevas APIs/dependencias/guardas. Prueba de navegación antes de implementar y gates; actualizar E2E de regreso al reporte y verificar flujo panel en ambos idiomas. Skills especializadas normativas ausentes, ninguna cargada. Sin cambios en lógica de auth ni contratos.

## Evidencia

37 puntos de regreso en22páginas usan BackButton; búsquedas no encuentran «←Volver» en páginas. Se conserva destino de cada Link previo y navegación dentro del shell. Prueba roja inicial importaba componente inexistente; focal final5/5 destinos explícitos, incluso entrada directa sin historial.

Typecheck/lint/build exit0 tras retirar navigate sin uso en ActivityManagePage. Lint conserva avisos previos. Suite594/596: fallan ExplorePage (resultado Caminata) y EventListPage (esqueleto), mismos casos previos. Índice273,95kB/84,90gzip. Auditor audit_table PASA sin hallazgos.

Playwright turista25/25 (1,6min), incluye botón44px/color/icono y retorno en375/768/1280 sin overflow. Captura /tmp/back-button-375.png revisada. No se probó cada uno de los37 recorridos individualmente, Safari/iOS ni lector de pantalla/zoom200%. Skills normativas especializadas ausentes, ninguna cargada. Sin dependencias, contratos ni cambios de permisos.

Playwright panel20/20 en36,4s: botónVolver retorna al panel de guía/prestadora en español e inglés y conserva rutas/guardas existentes. git diff --check sin errores.
