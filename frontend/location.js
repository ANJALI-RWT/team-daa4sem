function registerRole(role) {
  const formContainer = document.getElementById('dynamic-form');
  let formHTML = '';

  const commonFields = `
    <label>Username:<br><input type="text" name="username" required></label><br>
    <label>Location:<br><input type="text" name="location" id="location-input" readonly required></label><br>
  `;

  if (role === 'collector') {
    formHTML = `
      <h3>Collector Registration</h3>
      <form id="collector-form">
        ${commonFields}
        <label>Truck Capacity (tons):<br><input type="number" name="truckCapacity" min="1" required></label><br>
        <button type="submit">Register Collector</button>
      </form>
    `;
  } else if (role === 'citizen') {
    formHTML = `
      <h3>Citizen Registration</h3>
      <form id="citizen-form">
        ${commonFields}
        <label>Bio Bin Capacity (kg):<br><input type="number" name="bioCapacity" min="0" required></label><br>
        <label>Non-Bio Bin Capacity (kg):<br><input type="number" name="nonBioCapacity" min="0" required></label><br>
        <button type="submit">Register Citizen</button>
      </form>
    `;
  }

  // Inject the dynamic form
  formContainer.innerHTML = formHTML;

  // Fetch location
  getLocation();

  // Determine base API URL
  const API_BASE_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://team-daa4sem.onrender.com';

  const formId = role === 'collector' ? 'collector-form' : 'citizen-form';
  const form = document.getElementById(formId);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const endpoint = role === 'collector'
      ? '/api/register/collector'
      : '/api/register/user';

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const rawText = await response.text();
      const result = rawText ? safeJsonParse(rawText) : {};

      const status = document.getElementById('status');
      if (response.ok) {
        status.textContent = `✅ Registered successfully as ${role}`;
        form.reset();

        // Redirect based on role
        if (role === 'citizen') {
          window.location.href = 'citizen-dashboard.html';
        } else if (role === 'collector') {
          window.location.href = 'collector-dashboard.html';
        }
      } else {
        status.textContent = `❌ ${result.error || 'Registration failed'}`;
      }
    } catch (err) {
      console.error('Registration error:', err);
      document.getElementById('status').textContent = '❌ Network or server error.';
    }
  });
}

function getLocation() {
  const locationInput = document.getElementById('location-input');
  if (!locationInput) return;

  if (!navigator.geolocation) {
    locationInput.value = 'Geolocation not supported.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(5);
      const lon = position.coords.longitude.toFixed(5);
      locationInput.value = `${lat}, ${lon}`;
      console.log('📍 Location:', locationInput.value);
    },
    (error) => {
      const messages = {
        1: 'Permission denied for Geolocation.',
        2: 'Location unavailable.',
        3: 'Location request timed out.'
      };
      locationInput.value = messages[error.code] || 'Unknown error occurred.';
      console.error('Geolocation Error:', error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || 'Invalid JSON response' };
  }
}
