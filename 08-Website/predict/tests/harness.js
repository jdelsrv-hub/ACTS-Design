// Tiny test harness. Spec files import { test, eq, ok, near } and register tests;
// run.js runs them.

export const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function eq(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg ? msg + ': ' : ''}expected ${e}, got ${a}`);
}

export function ok(value, msg = 'expected a truthy value') {
  if (!value) throw new Error(msg);
}

export function near(a, b, eps = 1e-6) {
  if (!(Math.abs(a - b) <= eps)) throw new Error(`expected ${a} to be within ${eps} of ${b}`);
}
