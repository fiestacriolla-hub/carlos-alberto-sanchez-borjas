import fs from 'fs';
import AdmZip from 'adm-zip';

const zip = new AdmZip('./public/hostinger-listo.zip');
const zipEntries = zip.getEntries();
zipEntries.forEach(function(zipEntry) {
    console.log(zipEntry.entryName);
});
