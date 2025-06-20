// 🚮 Bin State (per registered user)
let bioBin = 0;
let nonBioBin = 0;
let bioCapacity = 10;
let nonBioCapacity = 15;

const API_BASE = 'https://team-daa4sem.onrender.com';

// ✅ Load capacity from sessionStorage if available
const bioCapStored = sessionStorage.getItem("bioCap");
const nonBioCapStored = sessionStorage.getItem("nonBioCap");
if (bioCapStored) bioCapacity = parseFloat(bioCapStored);
if (nonBioCapStored) nonBioCapacity = parseFloat(nonBioCapStored);

// ✅ Fetch actual bin state from MongoDB on load
async function fetchBinState() {
  const username = sessionStorage.getItem('username');
  if (!username) {
    console.warn('Username not found in session storage. Please log in.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/get-user/${username}`);
    if (!res.ok) throw new Error('User not found or API error');
    const data = await res.json();

    bioBin = data.currentBioWeight || 0;
    nonBioBin = data.currentNonBioWeight || 0;
    bioCapacity = data.bioCapacity || 10;
    nonBioCapacity = data.nonBioCapacity || 15;

    sessionStorage.setItem("bioCap", bioCapacity);
    sessionStorage.setItem("nonBioCap", nonBioCapacity);

    updateBins();
    updateAdminTable(); // Keep this if the admin table is on the same dashboard, otherwise remove.
  } catch (err) {
    console.error("❌ Failed to fetch user bin state:", err);
  }
}

// 📦 Update Smart Bins (in kg and %)
function updateBins() {
  const bioPercent = Math.min(100, (bioBin / bioCapacity) * 100);
  const nonBioPercent = Math.min(100, (nonBioBin / nonBioCapacity) * 100);

  document.getElementById('binData').innerHTML = `
    <div class="bin">
      <h3>Bio Bin</h3>
      <div class="bar-container">
        <div class="bar-fill" style="width: ${bioPercent}%;"></div>
      </div>
      <div class="bin-text">
        ${bioBin.toFixed(1)} / ${bioCapacity} kg (${bioPercent.toFixed(0)}%)
        ${bioPercent >= 100 ? '<span class="full-warning">🚫 FULL</span>' : ''}
      </div>
    </div>
    <div class="bin">
      <h3>Non-Bio Bin</h3>
      <div class="bar-container">
        <div class="bar-fill" style="width: ${nonBioPercent}%;"></div>
      </div>
      <div class="bin-text">
        ${nonBioBin.toFixed(1)} / ${nonBioCapacity} kg (${nonBioPercent.toFixed(0)}%)
        ${nonBioPercent >= 100 ? '<span class="full-warning">🚫 FULL</span>' : ''}
      </div>
    </div>
  `;
}

// 📊 Admin Table Update - Assuming this is part of the citizen dashboard for some reason.
// If this is only for the actual admin panel, remove it from dashboard.js and put it in admin-dashboard.js
function updateAdminTable() {
  const adminTableBody = document.getElementById('adminTableBody');
  if (!adminTableBody) return; // Prevent error if element doesn't exist on this page

  const bioPercent = Math.min(100, (bioBin / bioCapacity) * 100);
  const nonBioPercent = Math.min(100, (nonBioBin / nonBioCapacity) * 100);

  adminTableBody.innerHTML = `
    <tr>
      <td>Zone A</td>
      <td>#101</td>
      <td>${bioPercent.toFixed(0)}%</td>
      <td>${new Date().toISOString().slice(0, 10)}</td>
      <td class="status ${bioPercent >= 80 ? 'critical' : 'ok'}">${bioPercent >= 80 ? 'Needs Pickup' : 'Okay'}</td>
    </tr>
    <tr>
      <td>Zone B</td>
      <td>#102</td>
      <td>${nonBioPercent.toFixed(0)}%</td>
      <td>${new Date().toISOString().slice(0, 10)}</td>
      <td class="status ${nonBioPercent >= 80 ? 'critical' : 'ok'}">${nonBioPercent >= 80 ? 'Needs Pickup' : 'Okay'}</td>
    </tr>
  `;
}

// 🔍 Barcode Lookup API
async function lookupBarcode(barcode) {
  const res = await fetch(`${API_BASE}/api/lookup-barcode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ barcode })
  });
  if (!res.ok) { // Handle non-OK responses from backend
      const errorData = await res.json();
      throw new Error(errorData.error || 'Barcode lookup failed.');
  }
  return await res.json(); // { waste_type, estimated_weight }
}

// 🧠 AI Classification API
async function sendToAI(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_BASE}/api/classify-image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) { // Handle non-OK responses from backend
      const errorData = await response.json();
      throw new Error(errorData.error || "AI classification failed");
  }

  return await response.json(); // { waste_type, estimated_weight }
}

// Helper function to process waste addition
async function processWaste(result, suggestionDiv) {
  const weight = result.estimated_weight || 0.2;
  const type = result.waste_type.toLowerCase().includes('organic') ? 'Bio' : 'Non-Bio';

  // Frontend overfill prevention
  if (type === 'Bio') {
    if (bioBin + weight > bioCapacity + 0.001) { // Add a small epsilon to account for floating point inaccuracies
      suggestionDiv.textContent = '🚫 Bio bin is too full to add this much waste!';
      alert('🚫 Bio bin is too full to add this much waste!');
      return;
    }
  } else { // Non-Bio
    if (nonBioBin + weight > nonBioCapacity + 0.001) {
      suggestionDiv.textContent = '🚫 Non-Bio bin is too full to add this much waste!';
      alert('🚫 Non-Bio bin is too full to add this much waste!');
      return;
    }
  }

  // Update frontend state first for immediate feedback
  if (type === 'Bio') {
    bioBin += weight;
  } else {
    nonBioBin += weight;
  }
  updateBins();
  updateAdminTable();

  // Then send to backend
  try {
    const res = await fetch(`${API_BASE}/api/simulate-bin-fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: sessionStorage.getItem('username'),
        type: type,
        weight: weight
      })
    });

    if (!res.ok) {
        const errorData = await res.json();
        // If the backend also says it's full, align messages
        if (errorData.error && errorData.error.includes('already full')) {
            suggestionDiv.textContent = `🚫 Bin is full (Backend confirmed)!`;
        } else {
            throw new Error(errorData.error || 'Failed to update bin on server.');
        }
    } else {
        suggestionDiv.textContent = `✅ Waste added! Detected Waste Type: ${result.waste_type}.`;
    }
  } catch (err) {
    console.error("Error updating bin on backend:", err);
    suggestionDiv.textContent = `❌ Server update failed: ${err.message}`;
    // Revert frontend state if backend update fails, or fetch current state again
    fetchBinState();
  }
}


// 📦 Suggestion Button Click
document.getElementById('suggestBtn').addEventListener('click', async () => {
  const barcode = document.getElementById('barcodeInput').value.trim();
  const fileInput = document.getElementById('uploadInput');
  const suggestionDiv = document.getElementById('suggestionResult');
  suggestionDiv.textContent = ''; // Clear previous message

  if (barcode) {
    try {
      suggestionDiv.textContent = '🔎 Looking up barcode...';
      const result = await lookupBarcode(barcode);
      await processWaste(result, suggestionDiv);

    } catch (err) {
      console.error(err);
      suggestionDiv.textContent = `❌ Barcode lookup failed: ${err.message}.`;
    }
  } else if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    try {
      suggestionDiv.textContent = '🔄 Analyzing image...';
      const result = await sendToAI(file);
      await processWaste(result, suggestionDiv);

    } catch (err) {
      console.error(err);
      suggestionDiv.textContent = `❌ Image classification failed: ${err.message}.`;
    }
  } else {
    suggestionDiv.textContent = '⚠️ Please scan a barcode or upload an image.';
  }
});

// 🧠 Analyze Button (AI Only)
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const aiInput = document.getElementById('aiImageInput');
  const aiResult = document.getElementById('aiResult');
  aiResult.textContent = ''; // Clear previous message

  if (aiInput.files.length === 0) {
    aiResult.textContent = '❌ Please upload an image to analyze.';
    return;
  }

  const file = aiInput.files[0];

  try {
    aiResult.textContent = '🔄 Analyzing image...';
    const result = await sendToAI(file);
    await processWaste(result, aiResult); // Use aiResult for messages here

  } catch (error) {
    console.error(error);
    aiResult.textContent = `❌ AI classification failed: ${error.message}.`;
  }
});

// 📷 Start Barcode Scanner
function startBarcodeScanner() {
  const video = document.getElementById('barcodeCam');
  const resultDiv = document.getElementById('suggestionResult');
  video.style.display = 'block';
  resultDiv.textContent = '📷 Starting camera...';

  // Ensure QuaggaJS is loaded before initializing
  if (typeof Quagga === 'undefined') {
    resultDiv.textContent = '❌ Barcode scanner library (QuaggaJS) not loaded.';
    console.error('QuaggaJS is not defined. Make sure the script is loaded.');
    return;
  }

  Quagga.init({
    inputStream: {
      type: "LiveStream",
      constraints: { facingMode: "environment" },
      target: video
    },
    decoder: {
      readers: ["ean_reader", "upc_reader", "code_128_reader", "code_39_reader"]
    },
    locate: true // Highlight the barcode
  }, err => {
    if (err) {
      console.error(err);
      resultDiv.textContent = '❌ Camera init failed: ' + err.message;
      return;
    }
    Quagga.start();
  });

  let lastScannedCode = null;

  Quagga.onDetected(result => {
    const code = result.codeResult.code;
    if (code && code !== lastScannedCode) {
      lastScannedCode = code;
      document.getElementById('barcodeInput').value = code;
      resultDiv.textContent = '✅ Barcode scanned successfully!';
      Quagga.stop();
      video.style.display = 'none';
      // Automatically trigger the suggestion after scanning
      document.getElementById('suggestBtn').click();
    }
  });

  // Optional: Provide feedback if processing takes time or no code is found
  Quagga.onProcessed(result => {
    if (result && result.codeResult && !result.codeResult.code && resultDiv.textContent === '📷 Starting camera...') {
        resultDiv.textContent = '🔍 Looking for barcode...';
    }
  });
}

// ❌ Stop Barcode Scanner
function stopBarcodeScanner() {
  const video = document.getElementById('barcodeCam');
  if (typeof Quagga !== 'undefined' && Quagga.initialized) { // Check if Quagga is initialized before stopping
    Quagga.stop();
  }
  video.style.display = 'none';
  document.getElementById('suggestionResult').textContent = '❌ Scan cancelled.';
}

// 🚀 Initial Load
window.onload = fetchBinState;

// Optional: Periodically fetch bin state to keep UI updated
setInterval(fetchBinState, 15000); // Update every 15 seconds
