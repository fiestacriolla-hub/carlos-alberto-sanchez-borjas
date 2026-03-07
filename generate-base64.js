import fs from 'fs';

const zipBuffer = fs.readFileSync('./public/hostinger-listo.zip');
const base64 = zipBuffer.toString('base64');

const tsContent = `export const zipBase64 = "${base64}";\n`;
fs.writeFileSync('./src/zipData.ts', tsContent);
console.log('zipData.ts created');
