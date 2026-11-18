# Botón Volver compartido

Sustituir enlaces de navegación de regreso (detalles/formularios, errores, recuperación y404) por BackButton: Button accent, icono flecha izquierda y texto Volver (Back en inglés),44px y estados del componente base. Conservar cada destino explícito: no navigate(-1), para que entrada directa y shells no regresen a páginas inesperadas. No cambiar botones de login que retroceden un paso de MFA ni acciones de geolocalización, que no son enlaces de navegación. Reutilizar también acción inferior Volver al listado ya existente.

Componente namedexport/index CSSModules con margen inferior; sin nuevas APIs/dependencias/guardas. Prueba de navegación antes de implementar y gates; actualizar E2E de regreso al reporte y verificar flujo panel en ambos idiomas. Skills especializadas normativas ausentes, ninguna cargada. Sin cambios en lógica de auth ni contratos.
