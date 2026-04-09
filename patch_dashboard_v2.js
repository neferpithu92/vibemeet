const fs = require('fs');
const path = 'src/app/[locale]/(app)/dashboard/page.tsx';
let c = fs.readFileSync(path, 'utf8');

// Fix Badge variant="primary" -> "default"
c = c.replace('Badge variant="primary"', 'Badge variant="default"');

// Fix Button variant="premium" -> "primary" (some might have matched before but let's be sure)
c = c.replace('variant="premium"', 'variant="primary"');

fs.writeFileSync(path, c, 'utf8');
console.log('Patched dashboard second round');
