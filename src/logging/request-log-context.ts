import { AsyncLocalStorage } from 'node:async_hooks';

/** Bindings attached to domain logs for the duration of an HTTP request. */
export interface RequestLogBindings {
  requestId?: string;
  userId?: number;
  tenantId?: number;
}

export const requestLogContext = new AsyncLocalStorage<RequestLogBindings>();

export function getRequestLogBindings(): RequestLogBindings {
  return requestLogContext.getStore() ?? {};
}

/** Merge actor fields into the current request store (no-op outside HTTP). */
export function bindRequestLogActor(partial: {
  userId?: number;
  tenantId?: number;
}): void {
  const store = requestLogContext.getStore();
  if (!store) return;
  if (partial.userId !== undefined) store.userId = partial.userId;
  if (partial.tenantId !== undefined) store.tenantId = partial.tenantId;
}
