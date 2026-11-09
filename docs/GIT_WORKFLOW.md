# Git y flujo de trabajo con GitHub

Sigue estas reglas en todas las tareas de desarrollo.

## Gestión de ramas

1. Nunca trabajes directamente sobre `main`.
2. Antes de comenzar una tarea, actualiza la rama `main` con los últimos cambios del repositorio remoto.
3. Crea una rama independiente para cada tarea.
4. Utiliza las siguientes convenciones para nombrar las ramas:
   - `feat/` para nuevas funcionalidades.
   - `fix/` para corregir errores.
   - `docs/` para cambios en la documentación.
   - `refactor/` para refactorizar código existente.

Ejemplos:
- `feat/workout-history`
- `fix/timer-reset`
- `docs/update-readme`
- `refactor/exercise-service`

## Commits

5. Realiza commits al completar cambios lógicos y relacionados.
6. Utiliza el formato Conventional Commits para los mensajes:
   - `feat: añadir historial de entrenamientos`
   - `fix: corregir reinicio del temporizador`
   - `docs: actualizar README`
   - `refactor: reorganizar servicio de ejercicios`
7. No incluyas cambios ajenos a la tarea actual.
8. Nunca incluyas contraseñas, claves API, archivos `.env` ni información sensible en los commits.

## Pruebas y publicación

9. Ejecuta las pruebas correspondientes antes de publicar los cambios.
10. Comprueba que no existan errores de compilación o de TypeScript.
11. Sube la rama a GitHub mediante `push` cuando la tarea esté terminada y verificada.
12. Crea una Pull Request cuyo destino sea `main`.
13. No fusiones ninguna Pull Request sin autorización explícita del usuario.
14. Nunca utilices `force push`.
15. Nunca elimines ni sobrescribas cambios existentes del usuario sin autorización.

## Informe al finalizar cada tarea

Cuando termines, informa de:

- Nombre de la rama utilizada.
- Resumen de los cambios realizados.
- Archivos modificados o creados.
- Pruebas ejecutadas y sus resultados.
- Identificadores de los commits.
- Enlace a la Pull Request, si se ha creado.

**Objetivo:** mantener el repositorio organizado, evitar introducir código sin verificar en `main` y garantizar que el usuario conserve el control sobre las integraciones.
