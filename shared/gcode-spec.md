# CIPRA G-Code Dialect

CIPRA outputs plain-text, purely geometric G-Code. It intentionally avoids machine-specific inverse kinematics or vendor M-codes so the web backend stays decoupled from the SCARA hardware controller.

## Allowed command set

| Command | Mode | Description |
|---|---|---|
| `G90` | Absolute positioning | All coordinates are absolute. |
| `G21` | Millimeter units | All distances are expressed in millimeters. |
| `M3` | Tool on / pen down | Starts drawing (virtual Z axis down on paper). |
| `M5` | Tool off / pen up | Stops drawing (virtual Z axis up in the air). |
| `G0 X... Y...` | Rapid travel | Moves in air to the start of the next path. |
| `G1 X... Y...` | Linear draw | Moves while the tool is drawing. |

## Program structure

1. **Preamble:** `G21 G90`
2. **Per path:** `G0` to the first point, `M3`, one or more `G1` moves, `M5`.
3. **Postamble:** `M5` (idempotent).

## Example

```gcode
G21 G90
G0 X10.00 Y10.00
M3
G1 X50.00 Y50.00
M5
```

## Reference

See `PropuestaProyecto.md`, section 4, for the original project specification.
