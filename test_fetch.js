const url = 'https://kpnngvzswjgulmvgsbrn.supabase.co/functions/v1/request-password-reset';

async function testFetch() {
  console.log('Fetching live Edge Function...');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Missing Authorization header intentionally to see if it needs anon key
      },
      body: JSON.stringify({
        email: 'joaocalves.21032001@gmail.com',
        nova_senha: 'testPassword123',
        motivo: 'test script bypass'
      })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch err:', err);
  }
}

testFetch();
