/**
 * Punto de entrada del almacenamiento local.
 *
 * Las pantallas importan desde `@/data/local` y no conocen las claves internas
 * de AsyncStorage. Si mañana cambia el formato, solo se toca este módulo.
 */
export {
  clearLocalSession,
  loadActiveLocalSession,
  loadLocalSession,
  saveLocalSession,
} from './sessionStorage';
