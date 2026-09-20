export class MessagingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MessagingValidationError';
  }
}

export class MessagingProviderError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'MessagingProviderError';
  }
}
