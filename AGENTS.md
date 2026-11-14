# AGENTS.md

Reglas de trabajo para este repositorio. Los requisitos funcionales están en [PROJECT.md](./PROJECT.md): léelo completo antes de empezar cualquier tarea.

## Contexto

- Aplicación móvil de seguimiento de entrenamientos.
- Stack: TypeScript estricto, React Native, Expo, Expo Router, Supabase (PostgreSQL).
- La persona que dirige el proyecto no tiene experiencia previa en desarrollo. Explica las propuestas con claridad y evita dar por sabidos términos técnicos.

## Regla universal: código explicado y comentado

Quien dirige el proyecto **está aprendiendo a programar**. Explicar el código no es una preferencia de estilo: es un requisito de todas las tareas, sin excepciones.

- **Comenta mucho y en lenguaje sencillo.** Cada bloque no evidente debe explicar qué hace, por qué existe y qué se rompería si no estuviera.
- Los comentarios explican el **porqué**; no repiten el **qué** obvio.
- Explica cada término técnico la primera vez que aparece, entre paréntesis.
- Evita abreviaturas crípticas y trucos de una línea imposibles de leer.
- Usa nombres de funciones y variables que se entiendan sin contexto.
- Deja ejemplos de uso en las funciones importantes.
- En cada entrega, acompaña el código de una explicación breve: archivos tocados, qué hace cada uno y cómo probarlo.
- La documentación también se escribe simple: frases cortas, tablas cuando ayuden y ejemplos reales.

## Cómo trabajar

**Si hay dos personas:** el reparto de carpetas, tareas y contratos está en [docs/TRABAJO_PARALELO.md](./docs/TRABAJO_PARALELO.md). Leerlo antes de tocar código.

1. **Antes de implementar:** analiza los requisitos, revisa el código existente, identifica los módulos afectados, propón una solución y señala los riesgos.
2. **Pide aprobación** cuando haya decisiones importantes pendientes. No decidas por tu cuenta lo marcado como "Pendiente de aprobación" en PROJECT.md.
3. **Trabaja en tareas pequeñas** y con alcance limitado. Una tarea cada vez.
4. **Prueba** cada funcionalidad antes de darla por terminada.
5. **Haz commits de Git** frecuentes y con mensajes claros.
6. **No reescribas** grandes partes del código por cambios pequeños, ni introduzcas parches que deterioren la arquitectura.

## Alcance actual

- El MVP es el **flujo individual**. Las sesiones compartidas están definidas, pero **no se implementan** hasta que se apruebe esa fase.
- Aun así, el modelo de datos debe quedar preparado para varios participantes.
- No comiences la implementación integral sin aprobación. El primer paso es la propuesta descrita en la sección "Estado del proyecto" de PROJECT.md.

## Reglas de código

- Separa interfaz, componentes, tipos, servicios, repositorios, lógica de negocio y validaciones.
- No mezcles consultas a Supabase con componentes visuales.
- La lógica de negocio (motor de ejecución de entrenamientos, comparación de rendimiento, alternancia de turnos) va en capas independientes de React Native y de la interfaz.
- Usa variables de entorno para claves y configuración. No escribas secretos en el código.
- Las sesiones en curso se guardan localmente de inmediato y se sincronizan después con Supabase. Una sincronización no se considera hecha hasta confirmar el guardado remoto.
- La seguridad se valida en el servidor (RLS). No te fíes del `user_id` que envíe el cliente.

## Documentación

- Mantén PROJECT.md como fuente de los requisitos funcionales.
- ARCHITECTURE.md, DATABASE.md, WORKFLOW.md, DECISIONS.md y ROADMAP.md existen ya porque hay propuestas aprobadas. Actualízalos cuando cambie algo aprobado.
- Mantén ROADMAP.md al día: al terminar una fase, marca su estado real y sus pruebas.
- Documenta únicamente decisiones aprobadas. Nunca marques como implementado algo que solo está especificado.
- Si PROJECT.md y el código se contradicen, avísalo antes de continuar.
