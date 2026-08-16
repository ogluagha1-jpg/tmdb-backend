const vm = require('vm');
const { renderDashboardHtml } = require('./dist/views/dashboard.html');

const html = renderDashboardHtml();

// Extract the script tag
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('No script tag found!');
  process.exit(1);
}

const jsCode = scriptMatch[1];
console.log('Script length:', jsCode.length);

// Mock browser window and document
const sandbox = {
  window: {},
  document: {
    getElementById: (id) => ({
      innerText: '',
      style: {},
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      value: '',
      options: [],
      selectedIndex: 0,
      getAttribute: () => ''
    }),
    createElement: () => ({
      className: '',
      innerHTML: '',
      appendChild: () => {}
    })
  },
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
  setInterval: () => {},
  setTimeout: () => {},
  console: console,
  confirm: () => true,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent
};
sandbox.window = sandbox;

try {
  vm.runInNewContext(jsCode, sandbox);
  console.log('✅ JavaScript in Dashboard executed without ANY syntax or runtime errors!');
  console.log('Available global functions:', Object.keys(sandbox.window).filter(k => typeof sandbox.window[k] === 'function'));
} catch (err) {
  console.error('❌ JS execution failed:', err);
  process.exit(1);
}
