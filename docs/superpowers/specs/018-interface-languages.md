# Selector de idioma

Botón ES/EN con nombre accesible que anuncia el idioma destino. Estado global persistido en localStorage con fallback español si el almacenamiento está bloqueado. Cambiar idioma no remonta formularios ni elimina datos introducidos. Documento con lang correcto.

Controles de idioma y tema juntos: desde 900 px en cabecera; bajo 900 px dentro del menú desplegable. Mínimo táctil 44 px, contraste y foco mediante tokens existentes.

Traducciones del texto propio de la interfaz, etiquetas, validación y mensajes; datos de catálogo y usuarios conservan su idioma original. URLs, enums y valores de formularios siguen el contrato actual. Moneda COP, fechas según idioma.
