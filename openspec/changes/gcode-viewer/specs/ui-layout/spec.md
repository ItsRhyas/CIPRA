# Delta for ui-layout

## MODIFIED Requirements

### Requirement: Disposición de los componentes de visualización

La página principal (`page.tsx`) DEBE presentar los componentes de visualización (`CanvasPreview`, `GCodeViewer`, `GCodeOutput`) mediante una interfaz de pestañas (tabs), en lugar de un apilado vertical plano. El estado de la pestaña activa DEBE gestionarse en el componente página padre.

- DEBE haber exactamente tres pestañas: "Vista previa" (`CanvasPreview`), "Visualizador" (`GCodeViewer`) y "Código G" (`GCodeOutput`).
- Solo el contenido de la pestaña activa DEBE renderizarse a la vez (renderizado condicional).
- Al completarse una conversión de imagen a G-Code, el sistema DEBERÍA cambiar automáticamente a la pestaña "Visualizador" (comportamiento deseable, no bloqueante).

(Previously: los tres componentes se mostraban apilados verticalmente en `page.tsx`, todos visibles simultáneamente sin navegación por pestañas.)

#### Scenario: Navegación entre pestañas

- **GIVEN** la página cargada con los tres componentes disponibles
- **WHEN** el usuario hace clic en una pestaña ("Vista previa", "Visualizador" o "Código G")
- **THEN** solo se renderiza el componente correspondiente a esa pestaña y los demás se ocultan
- **AND** el estado de la pestaña activa se mantiene en el componente página padre

#### Scenario: Cambio automático a "Visualizador" al convertir

- **GIVEN** el usuario en la pestaña "Vista previa" e inicia una conversión de imagen a G-Code
- **WHEN** la conversión completa y se genera G-Code
- **THEN** la pestaña activa SHOULD cambiar automáticamente a "Visualizador"
- **AND** si el auto-cambio no ocurre, no debe bloquear el resto de funcionalidades (es nice-to-have)

#### Scenario: Pestaña "Visualizador" sin G-Code

- **GIVEN** el usuario selecciona la pestaña "Visualizador" sin haber convertido ninguna imagen
- **WHEN** el componente `GCodeViewer` se renderiza
- **THEN** se muestra el estado vacío (marco 210×297mm + mensaje) definido en `gcode-viewer`
- **AND** las pestañas "Vista previa" y "Código G" permanecen disponibles y navegables

#### Scenario: Visibilidad inicial

- **GIVEN** la página recién cargada sin conversión previa
- **WHEN** se monta el componente página
- **THEN** la pestaña activa por defecto DEBE ser "Vista previa"
- **AND** los demás componentes no se renderizan hasta que su pestaña sea seleccionada