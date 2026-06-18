const fs = require('fs');
const content = fs.readFileSync('c:/Users/KURNIA/Desktop/kantongku/src/components/AddTransactionModal.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('<CalcKeyboard')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
