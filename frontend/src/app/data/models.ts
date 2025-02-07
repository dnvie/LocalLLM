export interface Models {
  models: Model[];
}

export interface Model {
  name: string;
  name_trimmed: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: ModelDetails;
}

export interface ModelDetails {
  parent_model: string;
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}
