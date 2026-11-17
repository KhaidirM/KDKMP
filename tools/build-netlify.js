const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive:true });
for (const file of ['index.html','app.js','auth.js','app.css','pages.css','auth.css','supabase-config.js']) {
  fs.copyFileSync(path.join(root,file),path.join(out,file));
}
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true,force:true});
console.log('Netlify static bundle written to dist/');
