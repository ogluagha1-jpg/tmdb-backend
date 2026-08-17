const { renderDashboardHtml } = require('./dist/views/dashboard.html');
const html = renderDashboardHtml();
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const scriptContent = scriptMatch[1];
const lines = scriptContent.split('\n');
for (let i = 570; i < 620 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
