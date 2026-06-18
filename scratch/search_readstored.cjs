const fs = require('fs');
const content = fs.readFileSync('c:/Users/KURNIA/Desktop/kantongku/src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('readStoredState') || line.includes('readItem')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
