import { AiToolError, AiToolSchema } from './ai-tool.interface';

/** Zero-dep schema builder for simple tool inputs/outputs. Richer tools may swap in zod/class-validator. */

type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'object';

interface FieldSpec {
  type: FieldType;
  optional?: boolean;
  description?: string;
}

export interface ObjectSpec {
  [field: string]: FieldSpec;
}

function checkValue(field: string, spec: FieldSpec, value: unknown) {
  if (value === undefined || value === null) {
    if (spec.optional) return;
    throw new AiToolError(`Missing required field "${field}"`, 'invalid_input');
  }
  switch (spec.type) {
    case 'string':
      if (typeof value !== 'string')
        throw new AiToolError(`Field "${field}" must be a string`, 'invalid_input');
      break;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value))
        throw new AiToolError(`Field "${field}" must be a number`, 'invalid_input');
      break;
    case 'integer':
      if (typeof value !== 'number' || !Number.isInteger(value))
        throw new AiToolError(`Field "${field}" must be an integer`, 'invalid_input');
      break;
    case 'boolean':
      if (typeof value !== 'boolean')
        throw new AiToolError(`Field "${field}" must be a boolean`, 'invalid_input');
      break;
    case 'object':
      if (typeof value !== 'object')
        throw new AiToolError(`Field "${field}" must be an object`, 'invalid_input');
      break;
  }
}

export function objectSchema<T = Record<string, any>>(
  spec: ObjectSpec,
): AiToolSchema<T> {
  const required = Object.entries(spec)
    .filter(([, s]) => !s.optional)
    .map(([k]) => k);

  const properties: Record<string, any> = {};
  for (const [k, s] of Object.entries(spec)) {
    properties[k] = { type: s.type, description: s.description };
  }

  return {
    jsonSchema: {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    },
    parse(value: unknown): T {
      const candidate = value === undefined || value === null ? {} : value;
      if (typeof candidate !== 'object' || Array.isArray(candidate)) {
        throw new AiToolError('Input must be an object', 'invalid_input');
      }
      const obj = candidate as Record<string, unknown>;
      for (const [field, fspec] of Object.entries(spec)) {
        checkValue(field, fspec, obj[field]);
      }
      return obj as unknown as T;
    },
  };
}

export const passthroughSchema: AiToolSchema<Record<string, unknown>> = {
  jsonSchema: { type: 'object', additionalProperties: true },
  parse(value: unknown): Record<string, unknown> {
    if (value === undefined || value === null) return {};
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new AiToolError('Value must be an object', 'invalid_input');
    }
    return value as Record<string, unknown>;
  },
};
