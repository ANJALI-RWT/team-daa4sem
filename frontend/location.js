// ✅ Define getLocation() first
function getLocation() {
  const locationInput = document.getElementById('location-input');
  if (!locationInput) return;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lon = position.coords.longitude.toFixed(5);
        locationInput.value = `${lat}, ${lon}`;
      },
      (error) => {
        locationInput.value = 'Location unavailable';
        console.error("Error getting location:", error);
      }
    );
  } else {
    locationInput.value = 'Geolocation not supported';
  }
}

// ✅ Now define registerRole(), which uses getLocation
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

  getLocation(); // ✅ this is now defined above

  const formId = role === 'collector' ? 'collector-form' : 'citizen-form';
  const form = document.getElementById(formId);
  if (form) {
    form.addEventListener('submit', function(event) {
      event.preventDefault();
      document.getElementById('status').textContent = `Thank you for registering as a ${role}!`;
      // You can add your backend submission logic here
      form.reset();
    });
  }
}
