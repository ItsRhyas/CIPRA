# Delta for gcode-viewer

## ADDED Requirements

### Requirement: Renderizado de trazos G-Code en canvas

El sistema DEBE parsear una cadena de G-Code y renderizarla en un `<canvas>` HTML5 nativo, distinguiendo trazos de dibujo (`G1`) de traslados rápidos (`G0`).

- Los trazos `G1` DEBEN dibujarse como líneas sólidas de color negro.
- Los traslados `G0` DEBEN dibujarse como líneas punteadas de color gris claro.
- El bloque entre `M3` y `M5` define un trazo de dibujo individual (pluma abajo → dibujar → pluma arriba).
- El origen de coordenadas DEBE ser la esquina inferior izquierda (bottom-left) del área de trabajo.

#### Scenario: G-Code válido con trazos y traslados

- **GIVEN** una cadena G-Code válida que contiene `G21`, `G90`, bloques `M3`/`M5` con `G1` interiores y `G0` entre bloques
- **WHEN** el componente `GCodeViewer` recibe la cadena y se monta en el DOM
- **THEN** el `<canvas>` muestra los `G1` como líneas negras sólidas y los `G0` como líneas grises punteadas
- **AND** las proporciones del dibujo mín en mm se respetan

#### Scenario: Solo traslados G0 sin trazos

- **GIVEN** una cadena G-Code que solo contiene comandos `G0` (sin bloques `M3`/`M5`/`G1`)
- **WHEN** se renderiza en el canvas
- **THEN** solo se muestran líneas grises punteadas y no aparece ningún trazo negro sólido

### Requirement: Marco de área de trabajo

El sistema DEBE dibujar un marco rectangular que represente el área de trabajo de 210×297mm (proporción A4) alrededor del contenido renderizado.

#### Scenario: Marco visible con G-Code

- **GIVEN** G-Code disponible y canvas montado
- **WHEN** se renderiza el contenido
- **THEN** el marco 210×297mm se dibuja y el G-Code se escala para caber dentro del canvas manteniendo el aspect ratio

#### Scenario: Sin escala milimétrica exacta

- **GIVEN** cualquier G-Code válido
- **WHEN** se calcula la escala
- **THEN** el resultado es esquemático (proporciones correctas) y no requiere precisión milimétrica exacta

### Requirement: Estado vacío (placeholder)

El sistema DEBE mostrar un estado vacío cuando no exista G-Code disponible, consistente en el marco 210×297mm y un mensaje en español.

#### Scenario: Sin conversión previa

- **GIVEN** el usuario abre la pestaña "Visualizador" antes de convertir ninguna imagen
- **WHEN** no hay G-Code disponible
- **THEN** se muestra el marco 210×297mm y el texto "Convierte una imagen para ver la visualización"

### Requirement: Tolerancia a G-Code malformado

El sistema DEBE tolerar G-Code parcialmente malformado, renderizando lo que sea parseable y mostrando una advertencia sutil al usuario.

#### Scenario: Líneas no reconocidas intercaladas

- **GIVEN** una cadena G-Code con líneas válidas intercaladas con líneas no reconocidas o malformadas
- **WHEN** se ejecuta el parser
- **THEN** se renderizan las líneas válidas parseables y se muestra una advertencia sutil (warning)
- **AND** el componente NO lanza una excepción que rompa la pestaña

#### Scenario: Comandos de configuración ignorados

- **GIVEN** G-Code que incluye `G21` (unidades mm) y `G90` (coordenadas absolutas)
- **WHEN** se parsea el contenido
- **THEN** `G21` y `G90` se reconocen pero no afectan el renderizado (controlan configuración, no geometría)