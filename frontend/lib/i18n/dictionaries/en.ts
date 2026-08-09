import { Dictionary } from '../types';

export const en: Dictionary = {
  'app.title': 'CIPRA',
  'app.tagline': 'Converter for Intelligent Pixel Route Automation',

  'tabs.preview': 'Preview',
  'tabs.viewer': 'Paths',
  'tabs.gcode': 'G-Code',
  'tabs.views': 'Conversion views',

  'toggle.realtime': 'Real-time',
  'toggle.live': 'Live',
  'toggle.description': 'Regenerates paths automatically when parameters change.',

  'button.reset': 'Reset',
  'button.convert': 'Convert',
  'button.converting': 'Converting…',

  'status.generating': 'Generating…',

  'publish.button': 'Send to Bombolab',
  'publish.publishing': 'Sending…',
  'publish.success': 'Sent to Bombolab — live',
  'publish.queued': 'Queued for delivery: no Bombolab device connected right now.',
  'publish.error.noJob': 'There is no converted image to send. Convert an image first.',
  'publish.error.fallback': 'Could not send the G-Code.',
  'publish.ariaLabel': 'Send the generated G-Code to the Bombolab device',

  'params.imageType': 'Image type',
  'params.scale': 'Scale',
  'params.scale.tooltip': 'Scales the final drawing size. 1.0 keeps the original size.',
  'params.threshold': 'Threshold',
  'params.threshold.tooltip': 'Edge detection sensitivity. Lower values capture more detail.',
  'params.tolerance': 'Simplify tolerance',
  'params.tolerance.tooltip': 'Controls path detail. Higher values produce smoother but less detailed lines.',
  'params.variant': 'Variant',
  'params.variant.tooltip': 'Image preprocessing mode. "balanced" uses automatic threshold detection.',
  'params.transform': 'Transform',
  'params.workArea': 'Work area',
  'params.workArea.show': 'Show',
  'params.workArea.hide': 'Hide',
  'params.workArea.preset': 'Preset',
  'params.workArea.w': 'W (mm)',
  'params.workArea.h': 'H (mm)',
  'params.travelSpeed': 'Travel speed (mm/min)',
  'params.travelSpeed.placeholder': 'Default',
  'params.drawSpeed': 'Draw speed (mm/min)',
  'params.drawSpeed.placeholder': 'Default',
  'params.resetDefaults': 'Reset defaults',
  'params.resetAria': 'Reset {label} to default',

  'dropzone.empty': 'Drop an image here, or click to browse',
  'dropzone.formats': 'PNG, JPEG, or WebP — up to 10 MB',
  'dropzone.uploading': 'Uploading…',
  'dropzone.error.type': 'Unsupported file type. Use PNG, JPEG, or WebP.',
  'dropzone.error.size': 'File exceeds the 10 MB limit.',

  'preview.empty': 'Upload an image to preview',
  'preview.ariaLabel': 'Image preview',

  'viewer.empty': 'Convert an image to see the toolpath',
  'viewer.warning': 'Some G-Code lines were not recognized and have been omitted.',
  'viewer.ariaLabel': 'G-Code toolpath visualization',

  'gcode.empty': 'Convert an image to generate G-Code',
  'gcode.copy': 'Copy',
  'gcode.copied': 'Copied',
  'gcode.copyFailed': 'Copy failed',
  'gcode.copyAria': 'G-Code copied to clipboard',
  'gcode.copyFailedAria': 'Failed to copy G-Code',
  'gcode.download': 'Download .gcode',
  'gcode.warnings': 'Warnings',

  'error.unexpected': 'An unexpected error occurred',

  'preset.photo': 'Photo',
  'preset.lineArt': 'Line Art',
  'preset.sketch': 'Sketch',
  'preset.text': 'Text',
  'preset.custom': 'Custom',
  'preset.a4portrait': 'A4 Portrait',
  'preset.a4landscape': 'A4 Landscape',
  'preset.a3': 'A3',
  'preset.letter': 'Letter',
  'preset.customSize': 'Custom',

  'rotate.0': '0°',
  'rotate.90': '90°',
  'rotate.180': '180°',
  'rotate.270': '270°',

  'flip.h': 'Flip H',
  'flip.v': 'Flip V',

  'variant.fast': 'Fast',
  'variant.detailed': 'Detailed',
  'variant.balanced': 'Balanced',
};
