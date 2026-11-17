# Navegación del turista centrada en Para ti

Usuario autoriza reemplazar panel turista: inicio/login default y legacy /app→/recomendaciones. Menú habitual exactamente Para ti, Explorar, Reportes de seguridad, Mi perfil. En catálogos y detalles de éstos: Home→recomendaciones más4catálogos. Sin Ir al panel para turista; roles profesionales conservan panel/navegación. Mantener URLs de reservas/viajes, sin enlaces extra en menú. Registro/onboarding existentes fuera de alcance.

Implementación: configuración turista común, PublicLayout elige menú según zona, HomeRedirect espera restauración de sesión antes de decidir, TouristPanelRedirect conserva query/hash y rutas legacy perfil/reportes, login conserva returnTo explícito y default nuevo. Eliminar dashboard turista descontinuado. Extraer icono LogoutButton existente para mantener salida de sesión en shell turista y panel sin duplicar acción.

Tests primero navegación4/5opciones, aliases/activo, ocultar botón panel solo turista, restauración/redirectlegacy/loginMFA y acceso staff. E2E conAPI simulada en desktop/móvil recorridoParaTi→reportes→perfil→explorar→catálogos→Home, root/app ylogout. Puertas typecheck/lint/test/build, auditor adversario e independiente por navegación auth. Sin APIs/dependencias nuevas. Skills normativas ausentes según búsqueda previa.

## Evidencia final

- Regresión inicial falló en menú/destinoMFA/componentesrutasnoimplementados. Focal final5archivos/44tests aprobados; typecheck/lint/build exit0 (build899ms).
- Suite general ejecutada577casos:576aprobados/1fallo temporal previo en EventListPage primera carga sin esqueleto. Los3casos adicionales de compatibilidad alias se verificaron después en focales44y navegador.
- Navegador E2E_BROWSER_EXECUTABLE=…/chromium-1254/chrome-linux64/chrome npx playwright test --config playwright.tourist-navigation.config.ts --reporter=line →33passed51.8s exit0. test-results/.last-run.json passed failedTests[]. El log/tmp/tourist-navigation-e2e.log conserva intento inicial fallido por servidor sandbox; el resultado final procede de stdout de ejecución escalada.
-13casos turista: menú4habitual/5catálogos en375/768/1280 ES/EN,Home/root,reportes/perfil,logout(tokenlimpio),5legacyquery/hash y2login(default/returnTo). Además20regresiones de guía/prestadora/admin/gestora y anónimo. Sin sidebar ni Ir al panel turista, sin overflow. APIs simuladas.
- Capturas inspeccionadas/tmp/tourist-navigation-1280-es.png y375-es.png. Auditor adversario PASA; independiente sin hallazgos tras corregir alias/app/mis-reservas y/app/explorar. Sin APIs nuevas; permisosrestantesintactos.
- No probado backend real/expiración JWT durante navegación, lector de pantalla ni Safari/iOS/zoom200%. Skills normativas ausentes, no se afirma uso. Registro/onboarding sin cambios.

## Corrección solicitada053

La restricción de4opciones aplica al menú habitual; el usuario aclara conservar Mis viajes/Mis reservas en Explorar. La implementación inicial eliminó esos enlaces por una interpretación incorrecta. Plan053 y pruebas actualizadas restituyen menúExplorar7 y lo mantienen en itinerario/reservas. La evidencia5opciones de arriba describe la versión anterior, no el estado final corregido.
