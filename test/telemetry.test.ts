import test from 'node:test';
import assert from 'node:assert/strict';

function validateStreamMode(mode: string): boolean {
  const valid = ['raw', 'raw_bbox', 'annotated', 'heatmap', 'blended'];
  return valid.includes(mode.toLowerCase().trim());
}

function calculateHistoricalAggregation(points: { pax_count: number; alert_triggered: boolean }[]) {
  if (!points.length) {
    return { average_crowd_size: 0, peak_limits_hit: 0, alert_frequencies: 0 };
  }
  const total = points.reduce((acc, p) => acc + p.pax_count, 0);
  const peak = Math.max(...points.map((p) => p.pax_count));
  const alerts = points.filter((p) => p.alert_triggered).length;
  return {
    average_crowd_size: Number((total / points.length).toFixed(1)),
    peak_limits_hit: peak,
    alert_frequencies: alerts,
  };
}

test('Stream Mode: accepts raw_bbox, heatmap, and blended', () => {
  assert.equal(validateStreamMode('raw_bbox'), true);
  assert.equal(validateStreamMode('heatmap'), true);
  assert.equal(validateStreamMode('blended'), true);
  assert.equal(validateStreamMode('invalid_mode'), false);
});

test('Telemetry Aggregation: computes average, peak, and alert frequencies', () => {
  const points = [
    { pax_count: 40, alert_triggered: false },
    { pax_count: 50, alert_triggered: false },
    { pax_count: 70, alert_triggered: true },
    { pax_count: 80, alert_triggered: true },
  ];
  const agg = calculateHistoricalAggregation(points);
  assert.equal(agg.average_crowd_size, 60.0);
  assert.equal(agg.peak_limits_hit, 80);
  assert.equal(agg.alert_frequencies, 2);
});
