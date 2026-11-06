/**
 * Pure hysteresis logic for vision model switching.
 * - If current model is YOLO and count >= 45 -> switch to DM-Count
 * - If current model is DM-Count and count < 35 -> switch to YOLO
 */

import { ModelType } from '../types.ts';

export const HYSTERESIS_UPPER_THRESHOLD = 45;
export const HYSTERESIS_LOWER_THRESHOLD = 35;

export interface HysteresisResult {
  nextModel: ModelType;
  didSwitch: boolean;
  reason?: string;
}

export function evaluateModelHysteresis(
  currentModel: ModelType,
  count: number
): HysteresisResult {
  if (currentModel === 'YOLO' && count >= HYSTERESIS_UPPER_THRESHOLD) {
    return {
      nextModel: 'DM-Count',
      didSwitch: true,
      reason: `Crowd density exceeded ${HYSTERESIS_UPPER_THRESHOLD}. Switched from YOLO to DM-Count for dense regression.`,
    };
  }

  if (currentModel === 'DM-Count' && count < HYSTERESIS_LOWER_THRESHOLD) {
    return {
      nextModel: 'YOLO',
      didSwitch: true,
      reason: `Crowd count dropped below ${HYSTERESIS_LOWER_THRESHOLD}. Switched from DM-Count to YOLO for individual tracking.`,
    };
  }

  return {
    nextModel: currentModel,
    didSwitch: false,
  };
}
