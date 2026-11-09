# VEYRO

Aplicación móvil para gestionar entrenamientos: ejercicios, rutinas, sesiones e historial.

**Estado actual:** fase 0 (base del proyecto). Todavía no hay funcionalidad de entrenamiento.

La especificación funcional completa está en [PROJECT.md](./PROJECT.md). Los documentos técnicos son [ARCHITECTURE.md](./ARCHITECTURE.md), [DATABASE.md](./DATABASE.md), [WORKFLOW.md](./WORKFLOW.md), [DECISIONS.md](./DECISIONS.md) y [ROADMAP.md](./ROADMAP.md).

---

## Qué necesitas instalado

| Herramienta | Para qué | Cómo comprobarlo |
|---|---|---|
| Node.js 24 LTS | Ejecutar el proyecto | `node -v` |
| npm (viene con Node) | Instalar dependencias | `npm -v` |
| Git | Guardar versiones del código | `git --version` |
| Expo Go (en el móvil) | Ver la app sin compilar | Se instala desde la tienda de apps |

## Poner el proyecto en marcha

```bash
# 1. Instalar las dependencias (solo la primera vez, o cuando cambie package.json)
npm install

# 2. Arrancar el servidor de desarrollo
npm start
```

Después:

1. Abre **Expo Go** en el móvil.
2. Escanea el código QR que aparece en la terminal.
3. El móvil y el ordenador deben estar en la **misma red Wi-Fi**.

Si la red impide conectarse, usa `npx expo start --tunnel`.

---

## Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca la app en modo desarrollo |
| `npm run android` | Abre directamente en un emulador de Android |
| `npm run web` | Abre la versión web en el navegador |
| `npm test` | Ejecuta los tests automáticos |
| `npm run typecheck` | Comprueba los tipos sin ejecutar nada |
| `npm run lint` | Busca errores y malas prácticas |
| `npm run format` | Da formato al código automáticamente |

---

## Cómo está organizado

```
app/          Pantallas y navegación (una ruta = un archivo)
src/domain/   Reglas de negocio puras, sin React ni Supabase
src/data/     Acceso a Supabase y al almacenamiento del móvil
src/modules/  Lógica por área funcional (rutinas, ejercicios…)
src/ui/       Componentes visuales y tema
src/types/    Tipos compartidos
src/config/   Variables de entorno y constantes
```

La regla de oro: **una capa solo conoce a la que tiene justo debajo**. El detalle está en ARCHITECTURE.md.

---

## Variables de entorno

1. Copia `.env.example` a `.env.local`.
2. Rellena los valores de tu proyecto de Supabase.

`.env.local` nunca se sube a Git.

---

## Antes de dar una tarea por terminada

1. `npm run typecheck` sin errores.
2. `npm run lint` sin errores.
3. `npm test` en verde.
4. Probado en el móvil.
