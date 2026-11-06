/**
 * Pure 60-second Alert Persistence State Machine.
 *
 * Rules:
 * 1. A zone must remain over its threshold for 60 seconds continuously (persistence)
 *    before generating an active alert.
 * 2. An active/confirmed alert will automatically resolve if the zone remains
 *    below threshold for 60 seconds continuously.
 */

import { AlertLifecycleStatus } from '../types.ts';

export const ALERT_TRIGGER_PERSISTENCE_MS = 60 * 1000;
export const ALERT_RESOLVE_PERSISTENCE_MS = 60 * 1000;

export interface ZonePersistenceState {
  zoneId: number;
  overSince: number | null; // timestamp in ms
  belowSince: number | null; // timestamp in ms
  activeAlertStatus: AlertLifecycleStatus | null;
  pendingAlertId: number | null;
  activeAlertId: number | null;
}

export interface StateMachineEvaluation {
  updatedState: ZonePersistenceState;
  event:
    | 'NONE'
    | 'PENDING_STARTED'
    | 'ALERT_ACTIVATED'
    | 'PENDING_CANCELLED'
    | 'ALERT_RESOLVED';
  overThresholdSeconds: number;
  belowThresholdSeconds: number;
  message?: string;
}

export function createInitialZonePersistenceState(zoneId: number): ZonePersistenceState {
  return {
    zoneId,
    overSince: null,
    belowSince: null,
    activeAlertStatus: null,
    pendingAlertId: null,
    activeAlertId: null,
  };
}

export function evaluateZonePersistence(
  currentState: ZonePersistenceState,
  count: number,
  criticalThreshold: number,
  nowMs: number = Date.now()
): StateMachineEvaluation {
  const state: ZonePersistenceState = { ...currentState };
  const isOver = count >= criticalThreshold;

  let event: StateMachineEvaluation['event'] = 'NONE';
  let message: string | undefined;

  let overThresholdSeconds = 0;
  let belowThresholdSeconds = 0;

  if (isOver) {
    // Clear recovery timer
    state.belowSince = null;

    if (state.overSince === null) {
      // Just crossed threshold -> start pending timer
      state.overSince = nowMs;
      if (!state.activeAlertId) {
        event = 'PENDING_STARTED';
        message = `Zone crossed threshold (${count} >= ${criticalThreshold}). Starting 60s verification timer.`;
      }
    } else {
      const elapsedMs = nowMs - state.overSince;
      overThresholdSeconds = Math.floor(elapsedMs / 1000);

      // Check if 60 seconds have elapsed and no active alert yet
      if (
        elapsedMs >= ALERT_TRIGGER_PERSISTENCE_MS &&
        (!state.activeAlertStatus || state.activeAlertStatus === 'pending')
      ) {
        event = 'ALERT_ACTIVATED';
        state.activeAlertStatus = 'active';
        message = `Zone threshold breached continuously for ${overThresholdSeconds}s (>= 60s). Alert now ACTIVE.`;
      }
    }
  } else {
    // Count is below critical threshold
    if (state.overSince !== null && state.activeAlertStatus === 'pending') {
      event = 'PENDING_CANCELLED';
      message = 'Surge subsided before 60-second persistence window. Pending alert cancelled.';
      state.activeAlertStatus = null;
      state.pendingAlertId = null;
    }
    state.overSince = null;

    // Check resolution timer for active or confirmed alerts
    if (state.activeAlertStatus === 'active' || state.activeAlertStatus === 'confirmed') {
      if (state.belowSince === null) {
        state.belowSince = nowMs;
      } else {
        const recoveryElapsedMs = nowMs - state.belowSince;
        belowThresholdSeconds = Math.floor(recoveryElapsedMs / 1000);

        if (recoveryElapsedMs >= ALERT_RESOLVE_PERSISTENCE_MS) {
          event = 'ALERT_RESOLVED';
          state.activeAlertStatus = 'resolved';
          message = `Zone density remained normal for ${belowThresholdSeconds}s (>= 60s). Alert resolved automatically.`;
          state.activeAlertId = null;
          state.belowSince = null;
        }
      }
    }
  }

  return {
    updatedState: state,
    event,
    overThresholdSeconds,
    belowThresholdSeconds,
    message,
  };
}
