
// smart-waste-frontend/collector-dashboard.js

const API_BASE_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://team-daa4sem.onrender.com';

// --- DOM Elements ---
const mapStatusDiv = document.getElementById('mapStatus');
const collectorMapDiv = document.getElementById('collectorMap');
const pickupDoneBtn = document.getElementById('pickupDoneBtn');
const centerMapBtn = document.getElementById('centerMapBtn');
const currentCollectorLocationSpan = document.getElementById('currentCollectorLocation');
const nextBinInfoSpan = document.getElementById('nextBinInfo');

// --- Map Variables ---
let map;
let collectorMarker;
let fullBinMarkers = {}; // Object to store Leaflet markers, keyed by bin._id
let currentRoutePolyline;
let currentCollectorLocation = null;
let currentTargetBin = null; // The bin currently targeted for collection

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    startGeolocationTracking();
    fetchFullBinsPeriodically(); // Start polling for full bins
    setupEventListeners();
});

// --- Map Initialization ---
function initMap() {
    // Default view if geolocation not immediately available
    map = L.map(collectorMapDiv).setView([28.3670, 79.4304], 13); // Bareilly coordinates

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    mapStatusDiv.textContent = 'Map loaded. Detecting your location...';

    // Add a placeholder collector marker
    collectorMarker = L.marker([0, 0], {
        icon: L.divIcon({ // Custom icon for collector
            className: 'collector-icon',
            html: '🚛', // Truck emoji
            iconSize: [30, 30]
        }),
        draggable: true // Allow dragging collector marker for testing
    }).addTo(map);

    collectorMarker.bindTooltip("Your Location").openTooltip();

    collectorMarker.on('dragend', function (event) {
        const markerLatLng = event.target.getLatLng();
        currentCollectorLocation = markerLatLng;
        currentCollectorLocationSpan.textContent = `${markerLatLng.lat.toFixed(6)}, ${markerLatLng.lng.toFixed(6)}`;
        console.log("Collector marker dragged to:", currentCollectorLocation);
        updateRouteToNextClosestBin(); // Recalculate route after drag
    });
}

// --- Geolocation Tracking ---
function startGeolocationTracking() {
    if (!navigator.geolocation) {
        mapStatusDiv.textContent = 'Geolocation is not supported by your browser.';
        return;
    }

    // Watch position for continuous updates
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const latLng = L.latLng(latitude, longitude);

            currentCollectorLocation = latLng;
            currentCollectorLocationSpan.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            collectorMarker.setLatLng(latLng);
            map.setView(latLng, map.getZoom() > 10 ? map.getZoom() : 15); // Zoom in if initially zoomed out
            mapStatusDiv.textContent = 'Map centered on your location.';
            updateRouteToNextClosestBin(); // Update route when location changes
        },
        (error) => {
            console.error("Geolocation error:", error);
            mapStatusDiv.textContent = `Error detecting location: ${error.message}`;
            // If location is denied, keep the default view or ask user to enable
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// --- Fetch Full Bins from Backend ---
async function fetchFullBins() {
    try {
        mapStatusDiv.textContent = 'Checking for full bins...';
        const response = await fetch(`${API_BASE_URL}/api/full-bins`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fullBins = await response.json();
        console.log("Fetched full bins:", fullBins);
        updateMapMarkers(fullBins);
        updateRouteToNextClosestBin(fullBins); // Pass fullBins to avoid re-fetching
        mapStatusDiv.textContent = `${fullBins.length} full bins detected.`;
    } catch (error) {
        console.error("Error fetching full bins:", error);
        mapStatusDiv.textContent = `Error fetching full bins: ${error.message}`;
    }
}

// Poll for full bins every 30 seconds
function fetchFullBinsPeriodically() {
    setInterval(fetchFullBins, 30000); // Fetch every 30 seconds
}

// --- Update Map Markers ---
function updateMapMarkers(fullBins) {
    const newFullBinIds = new Set(fullBins.map(bin => bin._id));

    // Remove markers for bins that are no longer full
    for (const binId in fullBinMarkers) {
        if (!newFullBinIds.has(binId)) {
            map.removeLayer(fullBinMarkers[binId]);
            delete fullBinMarkers[binId];
            console.log(`Removed marker for bin: ${binId}`);
        }
    }

    // Add/Update markers for currently full bins
    fullBins.forEach(bin => {
        const binLatLng = L.latLng(bin.location.latitude, bin.location.longitude);
        const markerHtml = `
            <div class="full-bin-icon">
                📍<br>
                <span class="bin-label">Full: ${bin.binType.toUpperCase()}</span>
            </div>
        `;
        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: markerHtml,
            iconSize: [60, 60], // Size of the entire div
            iconAnchor: [30, 60] // Point of the icon which will correspond to marker's location
        });

        if (fullBinMarkers[bin._id]) {
            // Update existing marker position if needed (less common for static bins)
            fullBinMarkers[bin._id].setLatLng(binLatLng);
            fullBinMarkers[bin._id].setTooltipContent(`Full Bin (Type: ${bin.binType.toUpperCase()})`);
        } else {
            // Add new marker
            const marker = L.marker(binLatLng, { icon: customIcon }).addTo(map);
            marker.bindTooltip(`Full Bin ID: ${bin._id}<br>Type: ${bin.binType.toUpperCase()}`).openTooltip();
            marker.binData = bin; // Store bin data with the marker
            fullBinMarkers[bin._id] = marker;
            console.log(`Added marker for new full bin: ${bin._id}`);
        }
    });
}

// --- Route Calculation and Drawing ---
function updateRouteToNextClosestBin(fullBins = Object.values(fullBinMarkers).map(marker => marker.binData)) {
    if (!currentCollectorLocation || fullBins.length === 0) {
        if (currentRoutePolyline) {
            map.removeLayer(currentRoutePolyline);
            currentRoutePolyline = null;
        }
        pickupDoneBtn.style.display = 'none';
        nextBinInfoSpan.textContent = 'No full bins detected.';
        return;
    }

    // Calculate distance to each full bin and find the closest
    let closestBin = null;
    let minDistance = Infinity;

    fullBins.forEach(bin => {
        const binLatLng = L.latLng(bin.location.latitude, bin.location.longitude);
        const distance = currentCollectorLocation.distanceTo(binLatLng); // Leaflet's built-in distance
        if (distance < minDistance) {
            minDistance = distance;
            closestBin = bin;
        }
    });

    if (closestBin) {
        currentTargetBin = closestBin;
        const targetLatLng = L.latLng(closestBin.location.latitude, closestBin.location.longitude);

        // Remove previous route if it exists
        if (currentRoutePolyline) {
            map.removeLayer(currentRoutePolyline);
        }

        // Draw a simple polyline route (straight line for now)
        // In a real app, you'd fetch route coordinates from a routing API (OSRM/GraphHopper)
        const routePoints = [
            [currentCollectorLocation.lat, currentCollectorLocation.lng],
            [targetLatLng.lat, targetLatLng.lng]
        ];
        currentRoutePolyline = L.polyline(routePoints, { color: 'blue', weight: 5, opacity: 0.7 }).addTo(map);

        // Adjust map view to show both collector and target bin
        const bounds = L.latLngBounds(currentCollectorLocation, targetLatLng);
        map.fitBounds(bounds.pad(0.2)); // Pad bounds slightly

        nextBinInfoSpan.textContent = `Next bin: Type ${closestBin.binType.toUpperCase()} at approx ${(minDistance / 1000).toFixed(2)} km`;
        pickupDoneBtn.style.display = 'block'; // Show pickup button
    } else {
        nextBinInfoSpan.textContent = 'No full bins to route to.';
        pickupDoneBtn.style.display = 'none';
    }
}

// --- Pickup Confirmation ---
async function confirmPickup() {
    if (!currentTargetBin) {
        alert('No bin selected for pickup.');
        return;
    }

    const confirm = window.confirm(`Confirm pickup for Bin ID: ${currentTargetBin._id} (${currentTargetBin.binType.toUpperCase()})?`);
    if (!confirm) {
        return;
    }

    pickupDoneBtn.disabled = true; // Disable button to prevent double clicks
    pickupDoneBtn.textContent = 'Confirming...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/pickup-confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ binId: currentTargetBin._id, collectorId: 'rahul_collector_id_placeholder' }) // Replace with actual collector ID
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Server error: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        alert(result.message);
        console.log("Pickup confirmed:", result);

        // Remove bin marker and route
        if (fullBinMarkers[currentTargetBin._id]) {
            map.removeLayer(fullBinMarkers[currentTargetBin._id]);
            delete fullBinMarkers[currentTargetBin._id];
        }
        if (currentRoutePolyline) {
            map.removeLayer(currentRoutePolyline);
            currentRoutePolyline = null;
        }
        currentTargetBin = null; // Clear target bin

        fetchFullBins(); // Re-fetch to get the next closest bin
        mapStatusDiv.textContent = 'Pickup confirmed. Checking for next full bin...';

    } catch (error) {
        console.error("Error during pickup confirmation:", error);
        alert(`Pickup failed: ${error.message}`);
    } finally {
        pickupDoneBtn.disabled = false;
        pickupDoneBtn.textContent = '✅ Pickup Done';
        pickupDoneBtn.style.display = 'none'; // Hide until next route is drawn
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    pickupDoneBtn.addEventListener('click', confirmPickup);
    centerMapBtn.addEventListener('click', () => {
        if (currentCollectorLocation) {
            map.setView(currentCollectorLocation, map.getZoom() > 10 ? map.getZoom() : 15);
        } else {
            alert('Your location is not yet detected. Please allow geolocation.');
        }
    });
}
