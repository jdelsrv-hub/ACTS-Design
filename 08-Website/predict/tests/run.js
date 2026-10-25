import { tests } from './harness.js';

// Later tasks append their spec files here.
const SPECS = ['./text.test.js', './wordlist.test.js', './memory.test.js', './memory-controls.test.js', './backup.test.js', './spelling.test.js', './mixer.test.js', './storage.test.js', './speech.test.js', './pager.test.js', './panels.test.js'];

const results = [];

for (const spec of SPECS) {
  try {
    await import(spec);
  } catch (error) {
    results.push({ name: `load ${spec}`, pass: false, error: String(error) });
  }
}

for (const { name, fn } of tests) {
  try {
    await fn();
    results.push({ name, pass: true, error: null });
  } catch (error) {
    results.push({ name, pass: false, error: String(error && error.message || error) });
  }
}

const table = document.getElementById('results');
for (const r of results) {
  const row = table.insertRow();
  row.className = r.pass ? 'pass' : 'fail';
  row.insertCell().textContent = r.pass ? 'PASS' : 'FAIL';
  row.insertCell().textContent = r.name;
  row.insertCell().textContent = r.error || '';
}
const failed = results.filter(r => !r.pass).length;
document.getElementById('status').textContent = `${results.length - failed} passed, ${failed} failed`;

window.__results = results;
window.__done = true;
