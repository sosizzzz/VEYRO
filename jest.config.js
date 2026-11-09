/**
 * Configuración de los tests automáticos.
 *
 * `jest-expo` es el preset oficial de Expo: enseña a Jest a entender
 * archivos de React Native y TypeScript.
 *
 * Solo se recogen tests dentro de `src/`. Las pantallas se prueban a mano
 * en el móvil; la lógica (dominio) se prueba aquí.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  // Los tests viven junto al código que prueban, no en una carpeta aparte.
  // Así, al mover un archivo, el test se mueve con él.
};
