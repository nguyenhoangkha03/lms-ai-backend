// const http = require('http');
import http from 'http';

const options = {
  host: '0.0.0.0',
  port: process.env.PORT || 3000,
  path: '/api/v1/health',
  timeout: 2000,
};

const request = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', err => {
  console.log('ERROR:', err);
  process.exit(1);
});

request.end();
