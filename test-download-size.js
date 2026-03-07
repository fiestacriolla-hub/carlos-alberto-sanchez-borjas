import http from 'http';

http.get('http://localhost:3000/hostinger-listo.zip', (res) => {
  let size = 0;
  res.on('data', (chunk) => {
    size += chunk.length;
  });
  res.on('end', () => {
    console.log('Downloaded size:', size);
  });
}).on('error', (e) => {
  console.error(e);
});
