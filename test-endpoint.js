async function testEndpoint() {
  try {
    const response = await fetch('http://localhost:3000/api/health-advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': 'test-user'
      },
      body: JSON.stringify({ issue: 'headache' })
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEndpoint();