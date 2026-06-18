const fs = require('fs');
const content = fs.readFileSync('c:/Users/KURNIA/Desktop/kantongku/src/components/HomeDashboard.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('onOpenBudgetModal') || line.includes('Budget')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
