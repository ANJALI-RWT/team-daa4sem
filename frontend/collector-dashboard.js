// collectorMap.js
const API_BASE = 'https://team-daa4sem.onrender.com'; // Your backend API base URL

let map; // Leaflet map object
let routingControl; // Leaflet Routing Machine control object
let collectorLocation = null; // Stores the collector's current LatLng
let collectorMarker = null; // To store the collector's marker for easy removal/update

// Initialize the map and start the process
function initMap() {
  // Set default map view (e.g., Bareilly, Uttar Pradesh, India - based on current context)
  // You might want to center it on the collector's last known location from DB or a default area.
  map = L.map('map').setView([28.367, 79.430], 13); // Latitude, Longitude, Zoom level for Bareilly

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  getCollectorLocation(); // Get collector's real-time location
  // Fetch bins immediately and then set an interval for updates
  fetchAndDisplayFullBins();
  // THIS IS THE CRUCIAL PART FOR AUTOMATIC UPDATES:
  setInterval(fetchAndDisplayFullBins, 30000); // Refresh full bins and routes every 30 seconds
}

// Get the collector's current geographical location
function getCollectorLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        collectorLocation = L.latLng(position.coords.latitude, position.coords.longitude);
        console.log('✅ Collector Current Location:', collectorLocation);

        // Remove old collector marker if it exists
        if (collectorMarker) {
          map.removeLayer(collectorMarker);
        }

        // Add or update a marker for the collector's location
        collectorMarker = L.marker(collectorLocation, {
          title: 'Your Current Location',
          icon: L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/3667/3667185.png', // A truck icon, you can host your own
            iconSize: [38, 38],
            iconAnchor: [19, 38],
            popupAnchor: [0, -30]
          })
        }).addTo(map)
          .bindPopup('<b>Your Current Location</b>')
          .openPopup(); // Optionally open on load

        map.setView(collectorLocation, 13); // Center map on collector's location
        fetchAndDisplayFullBins(); // Re-fetch bins to draw routes with collector's location
      },
      (error) => {
        console.error('❌ Error getting collector location:', error);
        alert('Could not get your current location. Please allow location access for route planning.');
        // If location cannot be obtained, still attempt to fetch bins but without a starting point for routing
        fetchAndDisplayFullBins();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Force fresh location data
      }
    );
  } else {
    alert('Geolocation is not supported by your browser. Cannot get live location.');
    fetchAndDisplayFullBins(); // Still try to get bins, but no collector point for routing
  }
}

// Fetch full bins from the backend and display them on the map
async function fetchAndDisplayFullBins() {
  try {
    const response = await fetch(`${API_BASE}/api/full-bins`);
    if (!response.ok) throw new Error('Failed to fetch full bins from server.');
    const fullBins = await response.json();
    console.log('Fetched Full Bins:', fullBins);

    // Clear existing routing control and all bin markers
    if (routingControl) {
      map.removeControl(routingControl);
      routingControl = null; // Reset routing control
    }
    map.eachLayer(layer => {
      // Remove all markers except the one for the collector's location (if it exists)
      if (layer instanceof L.Marker && layer !== collectorMarker) {
        map.removeLayer(layer);
      }
    });

    if (fullBins.length > 0 && collectorLocation) {
      // Sort bins by distance from collector to create a more efficient route
      // This is a simple Euclidean distance sort for demonstration.
      // For real-world, a more complex routing algorithm would determine optimal order.
      fullBins.sort((a, b) => {
          const distA = collectorLocation.distanceTo(L.latLng(a.lat, a.lng));
          const distB = collectorLocation.distanceTo(L.latLng(b.lat, b.lng));
          return distA - distB;
      });

      const waypoints = [collectorLocation]; // Start waypoint is collector's location

      // Add markers for each full bin
      fullBins.forEach(bin => {
        const binLatLng = L.latLng(bin.lat, bin.lng);
        waypoints.push(binLatLng); // Add bin to waypoints for routing

        // Custom icon for bins (e.g., a trash can)
        const binIcon = L.icon({
          iconUrl: bin.type === 'Bio' ? 'https://cdn-icons-png.flaticon.com/512/1792/1792557.png' : 'https://cdn-icons-png.flaticon.com/512/1792/1792559.png', // Green for bio, blue for non-bio
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -25]
        });

        L.marker(binLatLng, { icon: binIcon })
          .addTo(map)
          .bindPopup(`
            <b>🗑️ ${bin.type} Bin for ${bin.username}</b><br>
            Location: ${bin.lat.toFixed(4)}, ${bin.lng.toFixed(4)}<br>
            <button onclick="confirmPickup('${bin._id}')" style="background-color: #4CAF50; color: white; padding: 8px 12px; border: none; border-radius: 5px; cursor: pointer; margin-top: 5px;">
              Mark as Collected
            </button>
          `);
      });

      // Initialize Leaflet Routing Machine with waypoints
      routingControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        showAlternatives: false,
        addWaypoints: false,
        draggableWaypoints: false,
        lineOptions: {
            styles: [{ color: 'blue', opacity: 0.8, weight: 6 }]
        },
        router: L.routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1'
        })
      }).addTo(map);

      // Fit map bounds to the route
      routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        if (routes.length > 0) {
          const bounds = L.latLngBounds(routes[0].coordinates);
          map.fitBounds(bounds.pad(0.1));
        }
      });

    } else if (fullBins.length === 0) {
      console.log('🎉 No bins need pickup right now.');
      // Optional: Clear a previous "No bins" message if needed
      // alert('🎉 No bins need pickup right now!'); // Too many popups for periodic check
    } else if (!collectorLocation) {
      console.warn("Collector's location not available. Cannot draw route to bins.");
      // alert("Collector's location not available. Cannot draw route to bins."); // Too many popups for periodic check
    }

  } catch (error) {
    console.error('❌ Error fetching and displaying full bins:', error);
    alert('Error loading bin data: ' + error.message);
  }
}

// Function to confirm a bin pickup (called from marker popup)
async function confirmPickup(binId) {
  if (!confirm('Are you sure you want to mark this bin as collected? This will reset the bin\'s weight to zero.')) {
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/api/pickup-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ binId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to confirm pickup.');
    }

    const result = await response.json();
    alert(result.message);
    fetchAndDisplayFullBins(); // Refresh the map to remove the collected bin and redraw routes
  } catch (error) {
    console.error('❌ Error confirming pickup:', error);
    alert('Error confirming pickup: ' + error.message);
  }
}

// Initialize map when the window loads
window.onload = initMap;
