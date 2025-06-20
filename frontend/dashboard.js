// 🚮 Bin State (per registered user)
let bioBin = 0;
let nonBioBin = 0;
let bioCapacity = 10;
let nonBioCapacity = 15;

// Load capacity from sessionStorage if available
const bioCapStored = sessionStorage.getItem("bioCap");
const nonBioCapStored = sessionStorage.getItem("nonBioCap");

if (bioCapStored) bioCapacity = parseFloat(bioCapStored);
if (nonBioCapStored) nonBioCapacity = parseFloat(nonBioCapStored);

const API_BASE = 'https://team-daa4sem.onrender.com';

// 📦 Update Smart Bins (in kg and %)
function updateBins() {
  const bioPercent = Math.min(100, (bioBin / bioCapacity) * 100);
  const nonBioPercent = Math.min(100, (nonBioBin / nonBioCapacity) * 100);

  document.getElementById('binData').innerHTML = `
    <div class="bin">
      <h3>Bio Bin</h3>
      <div class="bar" style="height: ${bioPercent * 2}px;"></div>
      <div>${bioBin.toFixed(1)} / ${bioCapacity} kg (${bioPercent.toFixed(0)}%)</div>
    </div>
    <div class="bin">
      <h3>Non-Bio Bin</h3>
      <div class="bar" style="height: ${nonBioPercent * 2}px;"></div>
      <div>${nonBioBin.toFixed(1)} / ${nonBioCapacity} kg (${nonBioPercent.toFixed(0)}%)</div>
    </div>
  `;
}

// 📊 Admin Table Update
function updateAdminTable() {
  const bioPercent = Math.min(100, (bioBin / bioCapacity) * 100);
  const nonBioPercent = Math.min(100, (nonBioBin / nonBioCapacity) * 100);

  document.getElementById('adminTableBody').innerHTML = `
    <tr>
      <td>Zone A</td>
      <td>#101</td>
      <td>${bioPercent.toFixed(0)}%</td>
      <td>2025-05-16</td>
      <td class="status ${bioPercent >= 80 ? 'critical' : 'ok'}">${bioPercent >= 80 ? 'Needs Pickup' : 'Okay'}</td>
    </tr>
    <tr>
      <td>Zone B</td>
      <td>#102</td>
      <td>${nonBioPercent.toFixed(0)}%</td>
      <td>2025-05-16</td>
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

  if (!response.ok) throw new Error("AI classification failed");

  return await response.json(); // { waste_type, estimated_weight }
}

// 📦 Suggestion Button Click
document.getElementById('suggestBtn').addEventListener('click', async () => {
  const barcode = document.getElementById('barcodeInput').value.trim();
  const fileInput = document.getElementById('uploadInput');
  const suggestionDiv = document.getElementById('suggestionResult');

  if (barcode) {
    try {
      suggestionDiv.textContent = '🔎 Looking up barcode...';
      const result = await lookupBarcode(barcode);
      suggestionDiv.textContent = `♻️ Detected Waste Type: ${result.waste_type}. Recycle as ${result.waste_type} Waste.`;

      const weight = result.estimated_weight || 0.2;
      const type = result.waste_type.toLowerCase().includes('organic') ? 'Bio' : 'Non-Bio';

      if (type === 'Bio') bioBin += weight;
      else nonBioBin += weight;

      updateBins();
      updateAdminTable();

      await fetch(`${API_BASE}/api/simulate-bin-fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: sessionStorage.getItem('username'),
          type: type,
          weight: weight
        })
      });

    } catch (err) {
      console.error(err);
      suggestionDiv.textContent = '❌ Barcode lookup failed.';
    }
  } else if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    try {
      suggestionDiv.textContent = '🔄 Analyzing image...';
      const result = await sendToAI(file);
      suggestionDiv.textContent = `♻️ AI Detected Waste Type: ${result.waste_type}.`;

      const weight = result.estimated_weight || 0.2;
      const type = result.waste_type.toLowerCase().includes('organic') ? 'Bio' : 'Non-Bio';

      if (type === 'Bio') bioBin += weight;
      else nonBioBin += weight;

      updateBins();
      updateAdminTable();

      await fetch(`${API_BASE}/api/simulate-bin-fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: sessionStorage.getItem('username'),
          type: type,
          weight: weight
        })
      });

    } catch (err) {
      console.error(err);
      suggestionDiv.textContent = '❌ Image classification failed.';
    }
  } else {
    suggestionDiv.textContent = '⚠️ Please scan a barcode or upload an image.';
  }
});

// 🧠 Analyze Button (AI Only)
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const aiInput = document.getElementById('aiImageInput');
  const aiResult = document.getElementById('aiResult');

  if (aiInput.files.length === 0) {
    aiResult.textContent = '❌ Please upload an image to analyze.';
    return;
  }

  const file = aiInput.files[0];

  try {
    aiResult.textContent = '🔄 Analyzing image...';
    const result = await sendToAI(file);
    aiResult.textContent = `♻️ Detected Waste Type: ${result.waste_type}.`;

    const weight = result.estimated_weight || 0.2;
    const type = result.waste_type.toLowerCase().includes('organic') ? 'Bio' : 'Non-Bio';

    if (type === 'Bio') bioBin += weight;
    else nonBioBin += weight;

    updateBins();
    updateAdminTable();

    await fetch(`${API_BASE}/api/simulate-bin-fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: sessionStorage.getItem('username'),
        type: type,
        weight: weight
      })
    });

  } catch (error) {
    console.error(error);
    aiResult.textContent = '❌ AI classification failed.';
  }
});

// 📷 Start Barcode Scanner
function startBarcodeScanner() {
  const video = document.getElementById('barcodeCam');
  const resultDiv = document.getElementById('suggestionResult');
  video.style.display = 'block';
  resultDiv.textContent = '📷 Starting camera...';

  Quagga.init({
    inputStream: {
      type: "LiveStream",
      constraints: { facingMode: "environment" },
      target: video
    },
    decoder: {
      readers: ["ean_reader", "upc_reader", "code_128_reader", "code_39_reader"]
    }
  }, err => {
    if (err) {
      console.error(err);
      resultDiv.textContent = '❌ Camera init failed.';
      return;
    }
    Quagga.start();
  });

  let lastScannedCode = null;

  Quagga.onDetected(result => {
    const code = result.codeResult.code;
    if (code !== lastScannedCode) {
      lastScannedCode = code;
      document.getElementById('barcodeInput').value = code;
      resultDiv.textContent = '✅ Barcode scanned successfully!';
      Quagga.stop();
      video.style.display = 'none';
    }
  });

  Quagga.onProcessed(result => {
    if (!result || !result.codeResult || !result.codeResult.code) {
      resultDiv.textContent = '❌ No barcode detected. Try again.';
    }
  });
}

// ❌ Stop Barcode Scanner
function stopBarcodeScanner() {
  const video = document.getElementById('barcodeCam');
  Quagga.stop();
  video.style.display = 'none';
  document.getElementById('suggestionResult').textContent = '❌ Scan cancelled.';
}

// 🚀 Initial Load
updateBins();
updateAdminTable();
