import fs from 'fs';
console.log('index.html size:', fs.statSync('./index.html').size);
