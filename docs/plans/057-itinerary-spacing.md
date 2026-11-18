# Separación del itinerario

Aumentar separación entre entradas de0,6rem a1rem y entre grupos de días a1,5rem. Título con margen inferior0,75rem. El selector first-of-type actual elimina el margen superior de cada título por su contenedor, por lo que añadir clase al contenedor de día permite separar los grupos explícitamente. Cambio solo visual, sin nuevos tests unitarios redundantes; ejecutar gates existentes y auditoría por inspección. Skills normativas siguen sin estar disponibles.

Verificación: typecheck y lint exit0; build exit0. Suite583/586, persisten fallos ExplorePage/EventListPage/SiteListPage descritos en056. git diff --check sin errores. Auditor audit_table PASA por inspección con evidencia CSS70–92 y página215. No probado navegador tras este ajuste, zoom200% ni nombres extensos. Sin cambios de lógica.
