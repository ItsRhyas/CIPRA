// SOURCE: shared/api-contract.json
// Hand-rolled TypeScript types from the JSON Schema contract for POST /api/v1/convert/.

/**
 * Physical SCARA machine configuration.
 * Overrides are optional; defaults match an A4 drawing area.
 * SOURCE: shared/api-contract.json#/$defs/ScaraConfig
 */
export interface ScaraConfig {
  work_area_w_mm?: number;
  work_area_h_mm?: number;
  travel_speed?: number;
  draw_speed?: number;
}

/**
 * Processing parameters for the vision pipeline.
 * SOURCE: shared/api-contract.json#/$defs/ConvertParams
 */
export interface ConvertParams {
  scale: number;
  threshold: number;
  simplify_tolerance: number;
  scara?: ScaraConfig;
}

/**
 * Metadata returned with a successful conversion.
 * SOURCE: shared/api-contract.json#/$defs/ConvertResponseMeta
 */
export interface ConvertResponseMeta {
  variant: Variant;
  stages_run: string[];
  elapsed_ms: number;
}

/**
 * Conversion quality preset.
 * The backend serializer accepts all three values; the schema enum is stale.
 * SOURCE: shared/api-contract.json#/$defs/ConvertRequest/properties/variant
 */
export type Variant = 'fast' | 'detailed' | 'balanced';

/**
 * Logical request body. On the wire this is sent as multipart/form-data
 * with 'image' as a file field and 'params' as a JSON string.
 * SOURCE: shared/api-contract.json#/$defs/ConvertRequest
 */
export interface ConvertRequest {
  image: File;
  params: ConvertParams;
  variant: Variant;
}

/**
 * Successful conversion response.
 * SOURCE: shared/api-contract.json#/$defs/ConvertResponse
 */
export interface ConvertResponse {
  gcode: string;
  meta: ConvertResponseMeta;
  warnings: string[];
}

/**
 * Validation or processing error response.
 * SOURCE: shared/api-contract.json#/$defs/ErrorResponse
 */
export interface ErrorResponse {
  error: string;
  detail?: string;
  field_errors?: Record<string, string>;
}
