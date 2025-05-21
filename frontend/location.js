function registerRole(role) {
  const formContainer = document.getElementById('dynamic-form');
  let formHTML = '';

  if (role === 'collector') {
    formHTML = `
      <h3>Collector Registration</h3>
      <form id="collector-form">
        <label>Username:<br><input type="text" name="username" required></label><br>
        <label>Location:<br><input type="text" name="location" id="location-input" readonly required></label><br>
        <label>Truck Capacity (tons):<br><input type="number" name="truckCapacity" min="1" required></label><br>
        <button type="submit">Register Collector</button>
      </form>
    `;
  } else if (role === 'citizen') {
    formHTML = `
      <h3>Citizen Registration</h3>
      <form id="citizen-form">
        <label>Username:<br><input type="text" name="username" required></label><br>
        <label>Location:<br><input type="text" name="location" id="location-input" readonly required></label><br>
        <label>Bio Bin Capacity (kg):<br><input type="number" name="bioCapacity" min="0" required></label><br>
        <label>Non-Bio Bin Capacity (kg):<br><input type="number" name="nonBioCapacity" min="0" required></label><br>
        <button type="submit">Register Citizen</button>
      </form>
    `;
  }

  formContainer.innerHTML = formHTML;

  // Auto-fetch location
  getLocation();

  // Dynamic backend URL: Use localhost in dev, real URL in production
  const API_BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://your-production-backend-url.com";  // <-- Replace with your deployed backend URL

  const formId = role === 'collector' ? 'collector-form' : 'citizen-form';
  const form = document.getElementById(formId);
  
  form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Compose full API URL
    const url = role === 'collector'
      ? `${API_BASE_URL}/api/register/collector`
      : `${API_BASE_URL}/api/register/user`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      // Handle possible empty or non-JSON responses gracefully
      let result;
      const text = await response.text();
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { error: text || 'Unknown server response' };
      }

      if (response.ok) {
        document.getElementById('status').textContent = `✅ Registered successfully as ${role}`;
        form.reset();
      } else {
        document.getElementById('status').textContent = `❌ ${result.error || 'Registration failed'}`;
      }
    } catch (error) {
      console.error('Registration error:', error);
      document.getElementById('status').textContent = '❌ Network or server error.';
    }
  });
}

function getLocation() {
  const locationInput = document.getElementById('location-input');
  if (!locationInput) return;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lon = position.coords.longitude.toFixed(5);
        locationInput.value = `${lat}, ${lon}`;
        console.log('📍 Location:', locationInput.value);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            locationInput.value = 'Permission denied for Geolocation.';
            break;
          case error.POSITION_UNAVAILABLE:
            locationInput.value = 'Location unavailable.';
            break;
          case error.TIMEOUT:
            locationInput.value = 'Location request timed out.';
            break;
          default:
            locationInput.value = 'Unknown error occurred.';
        }
        console.error('Geolocation Error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  } else {
    locationInput.value = 'Geolocation not supported';
  }
}
