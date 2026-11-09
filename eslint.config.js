/**
 * Configuración del linter (ESLint).
 *
 * Un linter no ejecuta el código: lo lee y avisa de errores probables,
 * imports sin usar o malas prácticas. Es como un corrector ortográfico.
 *
 * `eslint-config-expo/flat` trae las reglas recomendadas por Expo y
 * React Native. Se usa el formato moderno "flat config".
 */
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Carpetas que el linter debe ignorar.
    ignores: ['dist/**', 'node_modules/**', '.expo/**'],
  },
]);
