const fs = require('fs');
const path = 'src/app/[locale]/(app)/dashboard/page.tsx';
let c = fs.readFileSync(path, 'utf8');
// Fix Badge variant="outline" which doesn't exist
c = c.replace(
  /variant="outline" className="text-\[8px\] border-green-500\/50 text-green-500"/,
  'className="text-[8px] font-bold border border-green-500/50 text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full"'
);
// Fix Button variant="premium" which doesn't exist -> primary
c = c.replace('variant="premium"', 'variant="primary"');
// Fix Badge JSX to span (since we changed the prop, make the tag a span too)
c = c.replace(
  /<Badge className="text-\[8px\] font-bold border border-green-500\/50 text-green-500 bg-green-500\/10 px-2 py-0.5 rounded-full">SUCCESS<\/Badge>/,
  '<span className="text-[8px] font-bold border border-green-500/50 text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">SUCCESS</span>'
);
fs.writeFileSync(path, c, 'utf8');
console.log('Patched dashboard successfully');
