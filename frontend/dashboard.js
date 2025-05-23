// Simulated data for bins
const bins = [
  { id: 1, fill: 0 }, // Fill level in %
  { id: 2, fill: 0 },
  { id: 3, fill: 0 },
];

// Recycling suggestions based on barcode or AI label
const recyclingSuggestions = {
  '123456789012': 'Recycle as Plastic Waste.',
  '987654321098': 'Dispose as Electronic Waste.',
  'organic': 'Compost as Organic Waste.',
  'plastic': 'Recycle as Plastic Waste.',
  'metal': 'Recycle as Metal Waste.',
  'glass': 'Recycle as Glass Waste.',
};

// Populate bins initially
function renderBins() {
  const binData = document.getElementById('binData');
  binData.innerHTML = '';
  bins.forEach(bin => {
    const binDiv = document.createElement('div');
    binDiv.className = 'bin';
    binDiv.innerHTML = `
      <h3>Bin ${bin.id}</h3>
      <div class="bar" style="height: ${bin.fill * 2}px;"></div>
      <div>${bin.fill}% Full</div>
    `;
    binData.appendChild(binDiv);
  });
}

// Update admin table fill level and status
function updateAdminTable() {
  const adminBody = document.getElementById('adminTableBody');
  // Update fill levels for example bins
  // (simulate admin data using bins array for demo)
  adminBody.innerHTML = '';
  bins.forEach(bin => {
    const status = bin.fill >= 80 ? 'Needs Pickup' : 'Okay';
    const statusClass = bin.fill >= 80 ? 'critical' : 'ok';
    const row = `
      <tr>
        <td>Zone ${bin.id === 1 ? 'A' : bin.id === 2 ? 'B' : 'C'}</td>
        <td>#10${bin.id} </td>
        <td>${bin.fill}%</td>
        <td>2025-05-15</td>
        <td class="status ${statusClass}">${status}</td>
      </tr>
    `;
    adminBody.insertAdjacentHTML('beforeend', row);
  });
}

// Simulate AI classification (mock)
function classifyWasteFromImage(file) {
  // For demo, randomly pick one of the types
  const types = ['organic', 'plastic', 'metal', 'glass'];
  return types[Math.floor(Math.random() * types.length)];
}

// When "Get Recycling Suggestion" clicked
document.getElementById('suggestBtn').addEventListener('click', () => {
  const barcode = document.getElementById('barcodeInput').value.trim();
  const fileInput = document.getElementById('uploadInput');
  const suggestionDiv = document.getElementById('suggestionResult');

  if (barcode) {
    // Lookup barcode suggestion
    const suggestion = recyclingSuggestions[barcode] || 'No suggestion found for this barcode.';
    suggestionDiv.textContent = suggestion;

    // Update bins randomly to simulate fill level change
    bins.forEach(bin => {
      bin.fill = Math.min(100, bin.fill + Math.floor(Math.random() * 10));
    });
    renderBins();
    updateAdminTable();

  } else if (fileInput.files.length > 0) {
    // Simulate AI classification from uploaded image
    const type = classifyWasteFromImage(fileInput.files[0]);
    const suggestion = recyclingSuggestions[type] || 'No suggestion available.';
    suggestionDiv.textContent = `Detected waste type: ${type.charAt(0).toUpperCase() + type.slice(1)}. ${suggestion}`;

    // Increase fill level of random bin
    const binIndex = Math.floor(Math.random() * bins.length);
    bins[binIndex].fill = Math.min(100, bins[binIndex].fill + 15);
    renderBins();
    updateAdminTable();

  } else {
    suggestionDiv.textContent = 'Please scan a barcode or upload an image.';
  }
});

// When AI Analyze Image button clicked
document.getElementById('analyzeBtn').addEventListener('click', () => {
  const aiInput = document.getElementById('aiImageInput');
  const aiResult = document.getElementById('aiResult');

  if (aiInput.files.length === 0) {
    aiResult.textContent = 'Please upload an image to analyze.';
    return;
  }

  // Simulate AI classification prediction
  const prediction = classifyWasteFromImage(aiInput.files[0]);
  aiResult.textContent = `AI Prediction: ${prediction.charAt(0).toUpperCase() + prediction.slice(1)} Waste`;
});

// Initial render
renderBins();
updateAdminTable();
