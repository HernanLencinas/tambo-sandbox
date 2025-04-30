# Changelog

Todas las modificaciones relevantes de este proyecto se documentarán en este archivo.

## [1.1.11] - 30.04.2025
### Fixed
- Se modifica el nombre del parametro airflow-sandbox por airflow para ajustar a los cambios aplicados en la nueva version del servicio.
- Se incluye la posibilidad de permitir seleccionar el ambiente al cual conectarse desde la extension.

## [1.1.9] - 25.04.2025
### Fixed
- Se corrige que no se muestre el boton de iniciar sandbox si no se cargan correctamente los grupos.
- Se modifica en el boton de Gitlab que habra en el navegador el repositorio activo.

## [1.1.6] - 15.04.2025
### Fixed
- Nuevo fix al error intentando clonar el repositorio al cambiar de grupo.

## [1.1.3] - 10.04.2025
### Fixed
- Se reemplazo la libreria fs por rimraf para eliminar carpetas temporales.

## [1.1.0] - 07.04.2025
### Fixed
- Se valida el usuario y token de Gitlab correctamente.
- Al guardar el nombre de usuario en la conexion en minusculas por default.
- Se muestra en el panel de estado en nombre del usuario.
- Se incluye una validacion y advertencia en caso que git no este instalado.
- Se agrega nombre del grupo a la carpeta del workspace

## [1.0.7] - 19.03.2025
### Fixed
- Falla al eliminar la configuracion de conexion. Se queda bloqueado sin respuesta desde Sandbox.

## [1.0.6] - 19.03.2025
### Fixed
- Se eliminó el botón de "Actualizar" de la vista de conexión, ya que no era necesario y causaba confusión.

## [1.0.5] - 18.03.2025
### Fixed
- Se ocultaron de la interfaz gráfica de Settings las configuraciones de `usuario` y `token` de GitLab para mejorar la seguridad y reducir la exposición de información sensible.
- Se solucionó un problema donde los cambios realizados al guardar un documento no se estaban enviando automáticamente a GitLab.

## [1.0.4] - 14.03.2025
### Added
- Versión inicial de la extensión.