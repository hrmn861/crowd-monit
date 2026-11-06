import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateModelHysteresis,
  HYSTERESIS_UPPER_THRESHOLD,
  HYSTERESIS_LOWER_THRESHOLD,
} from '../src/services/hysteresis.ts';
import {
  createInitialZonePersistenceState,
  evaluateZonePersistence,
  ALERT_TRIGGER_PERSISTENCE_MS,
  ALERT_RESOLVE_PERSISTENCE_MS,
} from '../src/services/alertStateMachine.ts';

test('Hysteresis: switches from YOLO to DM-Count at count >= 45', () => {
  const resultLow = evaluateModelHysteresis('YOLO', 44);
  assert.equal(resultLow.nextModel, 'YOLO');
  assert.equal(resultLow.didSwitch, false);

  const resultThreshold = evaluateModelHysteresis('YOLO', 45);
  assert.equal(resultThreshold.nextModel, 'DM-Count');
  assert.equal(resultThreshold.didSwitch, true);

  const resultHigh = evaluateModelHysteresis('YOLO', 80);
  assert.equal(resultHigh.nextModel, 'DM-Count');
  assert.equal(resultHigh.didSwitch, true);
});

test('Hysteresis: switches from DM-Count to YOLO at count < 35', () => {
  const resultMid = evaluateModelHysteresis('DM-Count', 35);
  assert.equal(resultMid.nextModel, 'DM-Count');
  assert.equal(resultMid.didSwitch, false);

  const resultBelow = evaluateModelHysteresis('DM-Count', 34);
  assert.equal(resultBelow.nextModel, 'YOLO');
  assert.equal(resultBelow.didSwitch, true);

  const resultZero = evaluateModelHysteresis('DM-Count', 10);
  assert.equal(resultZero.nextModel, 'YOLO');
  assert.equal(resultZero.didSwitch, true);
});

test('State Machine: does not trigger active alert before 60 seconds', () => {
  const state0 = createInitialZonePersistenceState(1);
  const now = 1000000;

  // First reading exceeding threshold (65)
  const eval1 = evaluateZonePersistence(state0, 70, 65, now);
  assert.equal(eval1.event, 'PENDING_STARTED');
  assert.equal(eval1.updatedState.activeAlertStatus, null);

  // 30 seconds later (under 60s)
  const eval2 = evaluateZonePersistence(eval1.updatedState, 72, 65, now + 30000);
  assert.equal(eval2.event, 'NONE');
  assert.equal(eval2.overThresholdSeconds, 30);
  assert.equal(eval2.updatedState.activeAlertStatus, null);

  // 59 seconds later
  const eval3 = evaluateZonePersistence(eval2.updatedState, 74, 65, now + 59000);
  assert.equal(eval3.event, 'NONE');
  assert.equal(eval3.overThresholdSeconds, 59);
  assert.equal(eval3.updatedState.activeAlertStatus, null);
});

test('State Machine: triggers active alert after 60 continuous seconds', () => {
  const state0 = createInitialZonePersistenceState(1);
  const now = 1000000;

  const eval1 = evaluateZonePersistence(state0, 70, 65, now);
  const eval2 = evaluateZonePersistence(eval1.updatedState, 75, 65, now + 60000);

  assert.equal(eval2.event, 'ALERT_ACTIVATED');
  assert.equal(eval2.updatedState.activeAlertStatus, 'active');
  assert.equal(eval2.overThresholdSeconds, 60);
});

test('State Machine: resolves active alert only after 60 continuous seconds below threshold', () => {
  const state0 = createInitialZonePersistenceState(1);
  const now = 1000000;

  // Trigger active alert
  const eval1 = evaluateZonePersistence(state0, 70, 65, now);
  const evalActive = evaluateZonePersistence(eval1.updatedState, 72, 65, now + 60000);
  assert.equal(evalActive.updatedState.activeAlertStatus, 'active');

  // Drops below threshold at now + 70000
  const evalDrop = evaluateZonePersistence(evalActive.updatedState, 50, 65, now + 70000);
  assert.equal(evalDrop.updatedState.activeAlertStatus, 'active'); // Still active, timer started

  // 30 seconds below threshold (now + 100000)
  const evalMid = evaluateZonePersistence(evalDrop.updatedState, 48, 65, now + 100000);
  assert.equal(evalMid.event, 'NONE');
  assert.equal(evalMid.belowThresholdSeconds, 30);
  assert.equal(evalMid.updatedState.activeAlertStatus, 'active');

  // 60 seconds below threshold (now + 130000)
  const evalResolved = evaluateZonePersistence(evalMid.updatedState, 45, 65, now + 130000);
  assert.equal(evalResolved.event, 'ALERT_RESOLVED');
  assert.equal(evalResolved.updatedState.activeAlertStatus, 'resolved');
  assert.equal(evalResolved.belowThresholdSeconds, 60);
});
