// smart-waste-frontend/location.js

// API Base URL (Important for connecting to your Render backend)
const API_BASE_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:5000' // Your local Node.js server
    : 'https://team-daa4sem.onrender.com'; // Your deployed Render Node.js server URL

document.addEventListener('DOMContentLoaded', () => {
    const registerUserForm = document.getElementById('registerUserForm');
    const registerCollectorForm = document.getElementById('registerCollectorForm');

    // Handle user registration
    if (registerUserForm) {
        registerUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const userLocation = document.getElementById('userLocation').value;
            const bioCapacity = document.getElementById('bioCapacity').value;
            const nonBioCapacity = document.getElementById('nonBioCapacity').value;

            try {
                const response = await fetch(`${API_BASE_URL}/api/register/user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username,
                        location: userLocation,
                        bioCapacity: parseFloat(bioCapacity),
                        nonBioCapacity: parseFloat(nonBioCapacity)
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    alert('User registered successfully!');
                    console.log('User registration successful:', result);
                    // Store user ID and bin IDs in localStorage for later use in dashboard.js
                    localStorage.setItem('currentUserId', result.user);
                    localStorage.setItem('currentBioBinId', result.bioBinId);
                    localStorage.setItem('currentNonBioBinId', result.nonBioBinId);
                    window.location.href = 'dashboard.html'; // Redirect to user dashboard
                } else {
                    const errorData = await response.json();
                    alert(`User registration failed: ${errorData.error}`);
                }
            } catch (error) {
                console.error('Error during user registration:', error);
                alert('An error occurred during registration. Please try again.');
            }
        });
    }

    // Handle collector registration
    if (registerCollectorForm) {
        registerCollectorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const collectorUsername = document.getElementById('collectorUsername').value;
            const collectorLocation = document.getElementById('collectorLocation').value;
            const truckCapacity = document.getElementById('truckCapacity').value;

            try {
                const response = await fetch(`${API_BASE_URL}/api/register/collector`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: collectorUsername,
                        location: collectorLocation,
                        truckCapacity: parseFloat(truckCapacity)
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    alert('Collector registered successfully!');
                    console.log('Collector registration successful:', result);
                    // Store collector ID in localStorage if needed for collector-dashboard
                    localStorage.setItem('currentCollectorId', result.collectorId);
                    // *** IMPORTANT CHANGE HERE ***
                    window.location.href = 'collector-dashboard.html'; // Redirect to collector dashboard
                } else {
                    const errorData = await response.json();
                    alert(`Collector registration failed: ${errorData.error}`);
                }
            } catch (error) {
                console.error('Error during collector registration:', error);
                alert('An error occurred during registration. Please try again.');
            }
        });
    }
});

// Function to handle getting current location (used by both user and collector registration forms)
async function getCurrentLocation(inputId) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                document.getElementById(inputId).value = `${latitude},${longitude}`;
                console.log(`Location set for ${inputId}: ${latitude},${longitude}`);
            },
            (error) => {
                console.error("Error getting location:", error);
                alert(`Unable to retrieve your location: ${error.message}. Please enter manually or try again.`);
            }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}
