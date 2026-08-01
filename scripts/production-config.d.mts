export type ProductionRole = "pc" | "server";

export type ProductionEnvValidationResult = {
  readonly ok: boolean;
  readonly errors: readonly string[];
};

export function parseEnvContent(content: string): Record<string, string>;

export function validateProductionEnv(
  envFile: string,
  options: { readonly role: ProductionRole },
): ProductionEnvValidationResult;
