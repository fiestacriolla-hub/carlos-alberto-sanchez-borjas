import fs from 'fs';
const stats = fs.statSync('./public/hostinger-listo.zip');
console.log('Size:', stats.size);
