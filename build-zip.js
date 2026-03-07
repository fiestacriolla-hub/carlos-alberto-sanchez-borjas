import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const output = fs.createWriteStream('hostinger-listo.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(archive.pointer() + ' total bytes');
  console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory('dist/', false); // false means don't put it in a 'dist' folder inside the zip
archive.finalize();
