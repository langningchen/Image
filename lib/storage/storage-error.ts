export class StorageConfigurationError extends Error {
  constructor(
    readonly code: string,
    readonly params?: Record<string, string | number>,
  ) {
    super(code);
    this.name = "StorageConfigurationError";
  }
}
