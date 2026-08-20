import type { SignalStatus } from '../../database/schema';

export type WorkflowAction = 'acknowledge' | 'close';

/**
 * Pure status-transition rule for the supervisor loop.
 *   'apply'    -> perform the transition
 *   'noop'     -> already in the target state (idempotent, no change)
 *   'conflict' -> not allowed from the current state
 */
export function transition(
  current: SignalStatus,
  action: WorkflowAction,
): 'apply' | 'noop' | 'conflict' {
  if (action === 'acknowledge') {
    if (current === 'open') return 'apply';
    if (current === 'acknowledged') return 'noop';
    return 'conflict'; // closed
  }
  // close
  if (current === 'open' || current === 'acknowledged') return 'apply';
  return 'conflict'; // already closed
}
