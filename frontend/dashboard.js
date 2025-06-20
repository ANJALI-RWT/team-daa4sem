const bins = [
  { id: 1, fill: 0 }, // Fill level in %
  { id: 2, fill: 0 },
  { id: 3, fill: 0 },
];

const recyclingSuggestions = {
  '123456789012': 'Recycle as Plastic Waste.',
  '987654321098': 'Dispose as Electronic Waste.',
  'organic': 'Compost as Organic Waste.',
  'plastic': 'Recycle as Plastic Waste.',
  'metal': 'Recycle as Metal Waste.',
  'glass': 'Recycle as Glass Waste.',
};

// Simulate bin capacities per citizen (replace with real data later)
let bioBin = 0;
let nonBioBin = 0;
let bioCapacity = 10;
let nonBioCapacity = 15;

const API_BASE = 'https://team-daa4sem.onrender.com';

function renderBins() {
  const binData = document.getElementById('binData');
  binData.innerHTML = `
    <div class="bin">
      <h3>Bio Bin</h3>
      <div class="bar" style="height: ${(bioBin / bioCapacity) * 100 * 2}px;"></div>
      <div>${bioBin.toFixed(1)} / ${bioCapacity} kg</div>
    </div>
    <div class="bin">
      <h3>Non-Bio Bin</h3>
      <div class="bar" style="height: ${(nonBioBin / nonBioCapacity) * 100 * 2}px;"></div>
      <div>${nonBioBin.toFixed(1)} / ${nonBioCapacity} kg</div>
    </div>
  `;
}

function updateAdminTable() {
  const adminBody = document.getElementById('adminTableBody');
  const bioPercent = (bioBin / bioCapacity) * 100;
  const nonBioPercent = (nonBioBin / nonBioCapacity) * 100;

  adminBody.innerHTML = `
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

function classifyWasteFromImage(file) {
  const types = ['organic', 'plastic', 'metal', 'glass'];
  return types[Math.floor(Math.random() * types.length)];
}

async function lookupBarcode(barcode) {
  const res = await fetch(`${API_BASE}/api/lookup-barcode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ barcode })
  });
  return await res.json(); // Expect { waste_type, estimated_weight }
}

// 🎯 MAIN BUTTON HANDLER: Get Suggestion
document.getElementById('suggestBtn').addEventListener('click', async () => {
  const barcode = document.getElementById('barcodeInput').value.trim();
  const fileInput = document.getElementById('uploadInput');
  const suggestionDiv = document.getElementById('suggestionResult');

  if (barcode) {
    try {
      const result = await lookupBarcode(barcode);
      suggestionDiv.textContent = `♻️ Detected Waste Type: ${result.waste_type}. Recycle as ${result.waste_type} Waste.`;

      if (result.waste_type.toLowerCase() === 'organic') {
        bioBin += result.estimated_weight;
      } else {
        nonBioBin += result.estimated_weight;
      }

      renderBins();
      updateAdminTable();
    } catch (err) {
      console.error(err);
      suggestionDiv.textContent = '❌ Barcode lookup failed.';
    }
  } else if (fileInput.files.length > 0) {
    // Simulate AI image classification
    const type = classifyWasteFromImage(fileInput.files[0]);
    suggestionDiv.textContent = `♻️ AI Detected Waste Type: ${type}.`;

    const estWeight = Math.random() * 0.3 + 0.1; // Simulate weight between 0.1 - 0.4 kg

    if (type === 'organic') {
      bioBin += estWeight;
    } else {
      nonBioBin += estWeight;
    }

    renderBins();
    updateAdminTable();
  } else {
    suggestionDiv.textContent = 'Please scan a barcode or upload an image.';
  }
});

// AI ANALYZE button
document.getElementById('analyzeBtn').addEventListener('click', () => {
  const aiInput = document.getElementById('aiImageInput');
  const aiResult = document.getElementById('aiResult');

  if (aiInput.files.length === 0) {
    aiResult.textContent = 'Please upload an image to analyze.';
    return;
  }

  const prediction = classifyWasteFromImage(aiInput.files[0]);
  aiResult.textContent = `AI Prediction: ${prediction.charAt(0).toUpperCase() + prediction.slice(1)} Waste`;
});

// Initial render
renderBins();
updateAdminTable();
