# Reportes del guía dentro del panel

GUIDE navega a/app/reportes con AppLayout y lista propia. Dentrodelpanel, lista y detalle permitenGUIDE/ADMIN/DESTINATION_MANAGER; index muestraMyReportsPage soloGUIDE yManageReportsPage solootrosrolesautorizados. Nuevo permiteGUIDE. Detalle conserva canManage exclusivamenteadmin/gestora. No conceder guía acciones close/solve ni listado global.

Enlaces públicos heredados deGUIDE (/reportes, /nuevo, /:id) redirigen replace a/app preservandoquery/hash antes de montar páginas. Turista/prestadora mantienenpúblico. useReportsPath obtiene base por shellpara nuevo/detalle/back/cancel/éxito, sin introducirAuthProvider en formulario ni rutas dependientes del viewport. Sidebarvisible desde900px; móvil mantiene menú existente. Sesión,API,ownershipbackend yacciones no cambian.
