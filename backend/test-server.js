const http = require('http');

// Test Health Endpoint
const testHealth = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✓ Health Check Response:', data);
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (err) => {
      console.error('✗ Health Check Failed:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

// Test Login
const testLogin = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: 'engineer@ecoflow.com',
      password: 'password123'
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n✓ Login Response (Status ${res.statusCode}):`, data.substring(0, 200));
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (err) => {
      console.error('\n✗ Login Failed:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
};

// Run tests
console.log('=== Testing ECOFlow Backend ===\n');

setTimeout(async () => {
  try {
    await testHealth();
    await testLogin();
    console.log('\n=== All Tests Complete ===');
  } catch (err) {
    console.error('\nTest Failed:', err.message);
  }
}, 2000);
