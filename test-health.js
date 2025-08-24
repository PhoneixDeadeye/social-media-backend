const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3006,
  path: '/health',
  method: 'GET'
};

console.log('Testing health endpoint...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
