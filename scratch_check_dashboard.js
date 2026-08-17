const { renderDashboardHtml } = require('./dist/views/dashboard.html');

try {
  const html = renderDashboardHtml();
  console.log('HTML rendered successfully, length:', html.length);
  
  // Extract script block
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (scriptMatch) {
    const scriptContent = scriptMatch[1];
    console.log('Script length:', scriptContent.length);
    // Test parsing script with Function constructor or vm
    const vm = require('vm');
    const sandbox = {
      window: {},
      document: {
        getElementById: () => null,
        createElement: () => ({ appendChild: () => {}, setAttribute: () => {} }),
      },
      setInterval: () => {},
      setTimeout: () => {},
      fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
      encodeURIComponent: (s) => s,
      decodeURIComponent: (s) => s,
      console: console,
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(scriptContent, sandbox);
    console.log('Script executed cleanly in sandbox without errors!');
  } else {
    console.log('No script tag found!');
  }
} catch (e) {
  console.error('Validation error:', e);
}
