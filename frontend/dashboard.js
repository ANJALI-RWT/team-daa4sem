// dashboard.js

// API Base URL (Important for connecting to your Render backend)
const API_BASE_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:5000' // Your local Flask server
    : 'https://team-daa4sem.onrender.com'; // Your deployed Render Flask server

// --- Simulated Data (for frontend-only demo without full backend integration) ---
// In a real scenario, bin data would come from the backend/database
let bins = [
    { id: 1, type: 'plastic', fill: 20 },
    { id: 2, type: 'organic', fill: 45 },
    { id: 3, type: 'metal', fill: 70 },
    { id: 4, type: 'glass', fill: 10 },
    { id: 5, type: 'paper', fill: 55 },
];

// Map of waste types to average volume/weight increase (simulated)
// This helps determine how much a bin's fill level increases
const wasteVolumeImpact = {
    'plastic': 5, // % increase for plastic
    'organic': 8, // % increase for organic
    'metal': 3,   // % increase for metal
    'glass': 4,   // % increase for glass
    'paper': 6    // % increase for paper
};

// Recycling suggestions based on waste type or barcode
const recyclingSuggestions = {
    '123456789012': { type: 'plastic', suggestion: 'Recycle as Plastic Waste. Please rinse before disposing.' },
    '987654321098': { type: 'electronic', suggestion: 'Dispose as Electronic Waste. Take to a specialized e-waste collection point.' },
    'organic': { type: 'organic', suggestion: 'Compost as Organic Waste. Ideal for gardening.' },
    'plastic': { type: 'plastic', suggestion: 'Recycle as Plastic Waste. Check for recycling symbols.' },
    'metal': { type: 'metal', suggestion: 'Recycle as Metal Waste. Cans and foils go here.' },
    'glass': { type: 'glass', suggestion: 'Recycle as Glass Waste. Separate by color if possible.' },
    'paper': { type: 'paper', suggestion: 'Recycle as Paper Waste. Keep dry and clean.' },
    'unknown': { type: 'unknown', suggestion: 'Cannot classify. Please consult local waste guidelines.' }
};

// --- Frontend Rendering Functions ---

// Populate bins initially and on update
function renderBins() {
    const binData = document.getElementById('binData');
    binData.innerHTML = '';
    bins.forEach(bin => {
        const binDiv = document.createElement('div');
        binDiv.className = 'bin';
        const fillHeight = Math.min(bin.fill, 100); // Cap fill height at 100%
        binDiv.innerHTML = `
            <h3>Bin ${bin.id} (${bin.type.charAt(0).toUpperCase() + bin.type.slice(1)})</h3>
            <div class="bar-container">
                <div class="bar" style="height: ${fillHeight * 2}px;"></div>
            </div>
            <div>${bin.fill}% Full</div>
        `;
        binData.appendChild(binDiv);
    });
}

// Update admin table fill level and status
function updateAdminTable() {
    const adminBody = document.getElementById('adminTableBody');
    adminBody.innerHTML = ''; // Clear existing rows
    bins.forEach(bin => {
        const status = bin.fill >= 80 ? 'Needs Pickup' : 'Okay';
        const statusClass = bin.fill >= 80 ? 'critical' : 'ok';
        const row = `
            <tr>
                <td>Zone ${bin.id === 1 ? 'A' : bin.id === 2 ? 'B' : bin.id === 3 ? 'C' : bin.id === 4 ? 'D' : 'E'}</td>
                <td>#BIN${bin.id}</td>
                <td>${bin.fill}%</td>
                <td>${new Date().toISOString().slice(0, 10)}</td> <td class="status ${statusClass}">${status}</td>
            </tr>
        `;
        adminBody.insertAdjacentHTML('beforeend', row);
    });
}

// --- Barcode Scanner Logic (QuaggaJS) ---
const barcodeScannerVideo = document.getElementById('barcodeScanner');
const barcodeResultDiv = document.getElementById('barcodeResult');
const startBarcodeScanBtn = document.getElementById('startBarcodeScanBtn');
const stopBarcodeScanBtn = document.getElementById('stopBarcodeScanBtn');

let scanning = false;

function startBarcodeScanner() {
    if (scanning) return;
    scanning = true;
    barcodeScannerVideo.style.display = 'block';
    startBarcodeScanBtn.style.display = 'none';
    stopBarcodeScanBtn.style.display = 'block';

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: barcodeScannerVideo, // Or '#barcodeScanner'
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment" // Use rear camera if available
            },
        },
        decoder: {
            readers: ["ean_reader", "upc_reader", "code_128_reader"] // Specify barcode types
        }
    }, function (err) {
        if (err) {
            console.error(err);
            barcodeResultDiv.textContent = `Error starting barcode scanner: ${err.message}`;
            scanning = false;
            stopBarcodeScanBtn.style.display = 'none';
            startBarcodeScanBtn.style.display = 'block';
            return;
        }
        console.log("Initialization finished. Ready to start");
        Quagga.start();
    });

    Quagga.onDetected(function (result) {
        console.log("Barcode detected:", result.codeResult.code);
        const barcode = result.codeResult.code;
        barcodeResultDiv.textContent = `Scanned Barcode: ${barcode}`;
        handleRecyclingSuggestion(barcode); // Process the scanned barcode
        stopBarcodeScanner(); // Stop scanning after first detection
    });
}

function stopBarcodeScanner() {
    if (!scanning) return;
    Quagga.stop();
    barcodeScannerVideo.style.display = 'none';
    startBarcodeScanBtn.style.display = 'block';
    stopBarcodeScanBtn.style.display = 'none';
    scanning = false;
    console.log("Barcode scanner stopped.");
}

startBarcodeScanBtn.addEventListener('click', startBarcodeScanner);
stopBarcodeScanBtn.addEventListener('click', stopBarcodeScanner);


// --- Camera Input Logic ---
const cameraFeed = document.getElementById('cameraFeed');
const cameraCanvas = document.getElementById('cameraCanvas');
const captureImageBtn = document.getElementById('captureImageBtn');
const startCameraBtn = document.getElementById('startCameraBtn');
const stopCameraBtn = document.getElementById('stopCameraBtn');
const classifyCapturedImageBtn = document.getElementById('classifyCapturedImageBtn');
let mediaStream = null;

async function startCamera() {
    if (mediaStream) return; // Camera already active

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraFeed.srcObject = mediaStream;
        cameraFeed.style.display = 'block';
        startCameraBtn.style.display = 'none';
        captureImageBtn.style.display = 'block';
        stopCameraBtn.style.display = 'block';
        classifyCapturedImageBtn.style.display = 'none'; // Hide classify button until image is captured
        document.getElementById('suggestionResult').textContent = 'Suggestion will appear here.'; // Clear previous suggestion
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert(`Error accessing camera: ${err.message}. Please allow camera access.`);
    }
}

function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
        cameraFeed.srcObject = null;
    }
    cameraFeed.style.display = 'none';
    captureImageBtn.style.display = 'none';
    stopCameraBtn.style.display = 'none';
    startCameraBtn.style.display = 'block';
    classifyCapturedImageBtn.style.display = 'none';
    cameraCanvas.style.display = 'none';
    document.getElementById('aiResult').textContent = 'AI Prediction: Organic Waste'; // Reset AI prediction
}

function captureImage() {
    cameraCanvas.width = cameraFeed.videoWidth;
    cameraCanvas.height = cameraFeed.videoHeight;
    const context = cameraCanvas.getContext('2d');
    context.drawImage(cameraFeed, 0, 0, cameraCanvas.width, cameraCanvas.height);
    cameraCanvas.style.display = 'block'; // Show the captured image
    cameraFeed.style.display = 'none'; // Hide live feed after capture
    classifyCapturedImageBtn.style.display = 'block'; // Show classify button
    console.log("Image captured to canvas.");
    // Optionally stop camera after capture if you don't need live preview anymore
    // stopCamera();
}

startCameraBtn.addEventListener('click', startCamera);
captureImageBtn.addEventListener('click', captureImage);
stopCameraBtn.addEventListener('click', stopCamera);

// --- Waste Classification & Bin Update Logic ---

// Function to send image to backend for classification
async function classifyWasteFromImage(imageBlob) {
    const suggestionDiv = document.getElementById('suggestionResult');
    suggestionDiv.textContent = 'Analyzing image...';

    const formData = new FormData();
    formData.append('image', imageBlob, 'waste_image.png');

    try {
        const response = await fetch(`${API_BASE_URL}/api/classify-waste`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Server error: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        console.log("Classification result from backend:", result);

        const wasteType = result.waste_type;
        const suggestionInfo = recyclingSuggestions[wasteType] || recyclingSuggestions['unknown'];

        suggestionDiv.textContent = `Detected waste type: ${wasteType.charAt(0).toUpperCase() + wasteType.slice(1)}. ${suggestionInfo.suggestion}`;

        // Update bins based on classified waste type
        updateBinsWithWaste(wasteType);

    } catch (error) {
        console.error("Error during waste classification:", error);
        suggestionDiv.textContent = `Error classifying waste: ${error.message}`;
    }
}

// Handler for recycling suggestion button (from direct upload or captured image)
document.getElementById('uploadInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        await classifyWasteFromImage(file);
    }
});

// For captured image from camera
classifyCapturedImageBtn.addEventListener('click', () => {
    cameraCanvas.toBlob(async (blob) => {
        if (blob) {
            await classifyWasteFromImage(blob);
        } else {
            document.getElementById('suggestionResult').textContent = 'Failed to capture image as blob.';
        }
    }, 'image/png'); // Specify image format
});

// Handler for "Analyze Image" button in AI Waste Detection section
document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const aiInput = document.getElementById('aiImageInput');
    const aiResult = document.getElementById('aiResult');

    if (aiInput.files.length === 0) {
        aiResult.textContent = 'Please upload an image to analyze.';
        return;
    }

    aiResult.textContent = 'Analyzing image...';
    const file = aiInput.files[0];

    const formData = new FormData();
    formData.append('image', file, file.name);

    try {
        const response = await fetch(`${API_BASE_URL}/api/classify-waste`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Server error: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        const wasteType = result.waste_type;
        aiResult.textContent = `AI Prediction: ${wasteType.charAt(0).toUpperCase() + wasteType.slice(1)} Waste`;
    } catch (error) {
        console.error("Error during AI analysis:", error);
        aiResult.textContent = `Error analyzing image: ${error.message}`;
    }
});

// Function to handle recycling suggestion (for barcode or direct type)
function handleRecyclingSuggestion(input) {
    const suggestionDiv = document.getElementById('suggestionResult');
    const suggestionInfo = recyclingSuggestions[input] || recyclingSuggestions['unknown'];

    suggestionDiv.textContent = `Detected: ${input}. ${suggestionInfo.suggestion}`;

    // Update bins based on the suggested type (if available)
    if (suggestionInfo.type && suggestionInfo.type !== 'unknown') {
        updateBinsWithWaste(suggestionInfo.type);
    }
}

// --- Smart Bin Fill Level Update Logic ---

// Function to update the fill level of the most suitable bin
function updateBinsWithWaste(wasteType) {
    const impact = wasteVolumeImpact[wasteType] || 5; // Default impact if type not found

    // Find the bin of the matching type that is NOT full
    let targetBin = bins.find(bin => bin.type === wasteType && bin.fill < 100);

    // If no specific bin for the type or all are full, find the least full bin
    if (!targetBin) {
        targetBin = bins.sort((a, b) => a.fill - b.fill).find(bin => bin.fill < 100);
    }

    if (targetBin) {
        targetBin.fill = Math.min(100, targetBin.fill + impact);
        console.log(`Bin ${targetBin.id} (${targetBin.type}) updated. New fill: ${targetBin.fill}%`);
    } else {
        console.warn("All bins are full or no suitable bin found. Cannot update fill level.");
        document.getElementById('suggestionResult').textContent += " (Note: All bins are full or no specific bin type found for this waste.)";
    }

    renderBins();
    updateAdminTable();
}

// Initial render of bins and admin table on page load
renderBins();
updateAdminTable();
