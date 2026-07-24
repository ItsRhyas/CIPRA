import { Dictionary } from '../types';

export const es: Dictionary = {
  'app.title': 'CIPRA',
  'app.tagline': 'Convertidor Inteligente de Píxeles a Rutas Automatizadas',

  'tabs.preview': 'Vista previa',
  'tabs.viewer': 'Trayectorias',
  'tabs.gcode': 'G-Code',
  'tabs.views': 'Vistas de conversión',

  'toggle.realtime': 'Tiempo real',
  'toggle.live': 'Activo',
  'toggle.description': 'Regenera trayectorias automáticamente al cambiar parámetros.',

  'button.reset': 'Reiniciar',
  'button.convert': 'Convertir',
  'button.converting': 'Convirtiendo…',

  'status.generating': 'Generando…',

  'params.imageType': 'Tipo de imagen',
  'params.scale': 'Escala',
  'params.scale.tooltip': 'Escala el tamaño final del dibujo. 1.0 mantiene el tamaño original.',
  'params.threshold': 'Umbral',
  'params.threshold.tooltip': 'Sensibilidad de detección de bordes. Valores bajos capturan más detalle.',
  'params.tolerance': 'Tolerancia de simplificación',
  'params.tolerance.tooltip': 'Controla el detalle de la trayectoria. Valores altos producen líneas más suaves.',
  'params.variant': 'Variante',
  'params.variant.tooltip': 'Modo de preprocesamiento. "balanced" usa detección automática de umbral.',
  'params.transform': 'Transformar',
  'params.workArea': 'Área de trabajo',
  'params.workArea.show': 'Mostrar',
  'params.workArea.hide': 'Ocultar',
  'params.workArea.preset': 'Predefinido',
  'params.workArea.w': 'A (mm)',
  'params.workArea.h': 'L (mm)',
  'params.travelSpeed': 'Velocidad de desplazamiento (mm/min)',
  'params.travelSpeed.placeholder': 'Por defecto',
  'params.drawSpeed': 'Velocidad de dibujo (mm/min)',
  'params.drawSpeed.placeholder': 'Por defecto',
  'params.resetDefaults': 'Restaurar valores',
  'params.resetAria': 'Restaurar {label} al valor por defecto',

  'dropzone.empty': 'Suelta una imagen aquí o haz clic para buscar',
  'dropzone.formats': 'PNG, JPEG o WebP — hasta 10 MB',
  'dropzone.uploading': 'Subiendo…',
  'dropzone.error.type': 'Tipo de archivo no soportado. Usa PNG, JPEG o WebP.',
  'dropzone.error.size': 'El archivo supera el límite de 10 MB.',

  'preview.empty': 'Sube una imagen para previsualizar',
  'preview.ariaLabel': 'Vista previa de la imagen',

  'viewer.empty': 'Convierte una imagen para ver la trayectoria',
  'viewer.warning': 'Algunas líneas de G-Code no se reconocieron y fueron omitidas.',
  'viewer.ariaLabel': 'Visualización de trayectoria G-Code',

  'gcode.empty': 'Convierte una imagen para generar G-Code',
  'gcode.copy': 'Copiar',
  'gcode.copied': 'Copiado',
  'gcode.copyFailed': 'Error al copiar',
  'gcode.copyAria': 'G-Code copiado al portapapeles',
  'gcode.copyFailedAria': 'Error al copiar el G-Code',
  'gcode.download': 'Descargar .gcode',
  'gcode.warnings': 'Advertencias',

  'error.unexpected': 'Ocurrió un error inesperado',

  'preset.photo': 'Foto',
  'preset.lineArt': 'Dibujo lineal',
  'preset.sketch': 'Boceto',
  'preset.text': 'Texto',
  'preset.custom': 'Personalizado',
  'preset.a4portrait': 'A4 Vertical',
  'preset.a4landscape': 'A4 Horizontal',
  'preset.a3': 'A3',
  'preset.letter': 'Carta',
  'preset.customSize': 'Personalizado',

  'rotate.0': '0°',
  'rotate.90': '90°',
  'rotate.180': '180°',
  'rotate.270': '270°',

  'flip.h': 'Voltear H',
  'flip.v': 'Voltear V',

  'variant.fast': 'Rápido',
  'variant.detailed': 'Detallado',
  'variant.balanced': 'Equilibrado',
};
