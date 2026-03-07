import http from 'http';

http.get('http://localhost:3000/hostinger-listo.zip', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  console.log('Content-Length:', res.headers['content-length']);
}).on('error', (e) => {
  console.error(e);
});
