function registerRole(role) {
  const formContainer = document.getElementById('dynamic-form');
  let formHTML = '';

  const commonFields = `
    <label>Username:<br><input type="text" name="username" required></label><br>
    <label>Location:<br><input type="text" name="location" id="location-input" readonly required placeholder="Detecting location..."></label><br>
  `;

  if (role === 'collector') {
    formHTML = `
      <h3>Collector Registration</h3>
      <form id="collector-form">
        ${commonFields}
        <label>Truck Capacity (tons):<br><input type="number" name="truckCapacity" min="1" required></label><br>
        <button type="submit" id="submit-btn">Register Collector</button>
      </form>
    `;
  } else if (role === 'citizen') {
    formHTML = `
      <h3>Citizen Registration</h3>
      <form id="citizen-form">
        ${commonFields}
        <label>Bio Bin Capacity (kg):<br><input type="number" name="bioCapacity" min="0" required></label><br>
        <label>Non-Bio Bin Capacity (kg):<br><input type="number" name="nonBioCapacity" min="0" required></label><br>
        <button type="submit" id="submit-btn">Register Citizen</button>
      </form>
    `;
  }

  // Inject the dynamic form
  formContainer.innerHTML = formHTML;

  // Fetch location
  getLocation();

  // Determine API base URL
  const API_BASE_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://team-daa4sem.onrender.com';

  const formId = role === 'collector' ? 'collector-form' : 'citizen-form';
  const form = document.getElementById(formId);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const locationInput = document.getElementById('location-input');
    const locationValue = locationInput.value;

    // Prevent form submission if location is not valid
    if (!locationValue || locationValue.includes('error') || locationValue.includes('not supported') || locationValue.includes('Detecting')) {
      alert('📍 Please allow location access and wait for location to load.');
      return;
    }

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

      const result = await response.json();
      const statusDiv = document.getElementById('status');
if (response.ok) {
  statusDiv.textContent = `✅ Registered successfully: ${JSON.stringify(result)}`;
  setTimeout(() => {
    window.location.href = "citizen-dashboard.html"; // 👈 Redirects to dashboard
  }, 1500);
}

      } else {
        statusDiv.style.color = 'red';
        statusDiv.textContent = `❌ Error: ${result.message || 'Registration failed'}`;
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  });
}

function getLocation() {
  const locInput = document.getElementById('location-input');
  if (!navigator.geolocation) {
    if (locInput) locInput.value = 'Geolocation is not supported by your browser';
    return;
  }

  if (locInput) locInput.value = 'Detecting location...';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      if (locInput) locInput.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    },
    (error) => {
      if (locInput) locInput.value = `Error: ${error.message}`;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}
