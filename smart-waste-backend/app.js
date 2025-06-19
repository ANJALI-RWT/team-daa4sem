// smart-waste-frontend/dashboard.js

// API Base URL (Important for connecting to your Render backend)
const API_BASE_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:5000' // Your local Node.js server
    : 'https://team-daa4sem.onrender.com'; // Your deployed Render Node.js server URL

console.log('Backend API Base URL:', API_BASE_URL);

// --- Local Simulated Data (for display, real data comes from backend after updates) ---
// This will be replaced by actual bin states fetched from backend if you implement that later.
// For now, it initializes the display, and updates reflect server side changes after classification.
let bins = [
    { id: 'placeholder1', type: 'plastic', fill: 0 },
    { id: 'placeholder2', type: 'organic', fill: 0 },
    { id: 'placeholder3', type: 'metal', fill: 0 },
    { id: 'placeholder4', type: 'glass', fill: 0 },
    { id: 'placeholder5', type: 'paper', fill: 0 },
    { id: 'placeholder6', type: 'electronic', fill: 0 }
];

// Map of waste types to average volume/weight increase (simulated % increase)
const wasteVolumeImpact = {
    'plastic': 5,
    'organic': 8,
    'metal': 3,
    'glass': 4,
    'paper': 6,
    'cardboard': 7,
    'electronic': 10
};

// Recycling suggestions based on waste type or barcode
const recyclingSuggestions = {
    '123456789012': { type: 'plastic', suggestion: 'Recycle as Plastic Waste. Please rinse before disposing.' },
    '987654321098': { type: 'electronic', suggestion: 'Dispose as Electronic Waste. Take to a specialized e-waste collection point.' },
    '501234567890': { type: 'paper', suggestion: 'Recycle as Paper Waste. Keep dry and clean.' },
    'organic': { type: 'organic', suggestion: 'Compost as Organic Waste. Ideal for gardening.' },
    'plastic': { type: 'plastic', suggestion: 'Recycle as Plastic Waste. Check for recycling symbols.' },
    'metal': { type: 'metal', suggestion: 'Recycle as Metal Waste. Cans and foils go here.' },
    'glass': { type: 'glass', suggestion: 'Recycle as Glass Waste. Separate by color if possible.' },
    'paper': { type: 'paper', suggestion: 'Recycle as Paper Waste. Keep dry and clean.' },
    'cardboard': { type: 'cardboard', suggestion: 'Recycle as Cardboard Waste. Flatten boxes.' },
    'electronic': { type: 'electronic', suggestion: 'Dispose of as Electronic Waste. Find an e-waste drop-off.' },
    'unknown': { type: 'unknown', suggestion: 'Cannot classify. Please consult local waste guidelines.' }
};

// --- Frontend Rendering Functions ---
function renderBins() {
    const binData = document.getElementById('binData');
    binData.innerHTML = '';
    bins.forEach(bin => {
        const binDiv = document.createElement('div');
        binDiv.className = 'bin';
        const fillHeight = Math.min(bin.fill, 100);
        const visualHeight = (fillHeight / 100) * 150;
        binDiv.innerHTML = `
            <h3>Bin <span class="math-inline">\{bin\.id\.substring\(0, 8\)\} \(</span>{String(bin.type).charAt(0).toUpperCase() + String(bin.type).slice(1)})</h3>
            <div class="bar-container">
                <div class="bar" style="height: <span class="math-inline">\{visualHeight\}px;"\></div\>
</div\>
<div\></span>{bin.fill}% Full</div>
        `;
        binData.appendChild(binDiv);
    });
}

function updateAdminTable() {
    const adminBody = document.getElementById('adminTableBody');
    adminBody.innerHTML = '';
    bins.forEach(bin => {
        const status = bin.fill >= 80 ? 'Needs Pickup' : (bin.fill >= 50 ? 'Filling Up' : 'Okay');
        const statusClass = bin.fill >= 80 ? 'critical' : (bin.fill >= 50 ? 'warning' : 'ok');
        const row = `
            <tr>
                <td>Zone <span class="math-inline">\{bin\.id\.substring\(0, 4\)\}</td\> <\!\-\- Simplified zone for display \-\-\>
<td\>\#BIN</span>{bin.id.substring(bin.id.length - 4)}</td>
                <td><span class="math-inline">\{bin\.fill\}%</td\>
<td\></span>{new Date().toISOString().slice(0, 10)}</td>
                <td class="status <span class="math-inline">\{statusClass\}"\></span>{status}</td>
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

let scanningBarcode = false;

function startBarcodeScanner() {
    if (scanningBarcode) return;
    scanningBarcode = true;
    barcodeScannerVideo.style.display = 'block';
    startBarcodeScanBtn.style.display = 'none';
    stopBarcodeScanBtn.style.display = 'block';
    barcodeResultDiv.textContent = 'Scanned Barcode: Scanning...';

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: barcodeScannerVideo,
            constraints: {
                width: { min: 640 },
                height: { min: 480 },
                facingMode: "environment",
                aspectRatio: { min: 1, max: 2 }
            },
        },
        decoder: {
            readers: ["ean_reader", "upc_reader", "code_128_reader", "code_39_reader"]
        },
        locate: true
    }, function (err) {
        if (err) {
            console.error(err);
            barcodeResultDiv.textContent = `Error starting barcode scanner: ${err.message}`;
            scanningBarcode = false;
            stopBarcodeScanBtn.style.display = 'none';
            startBarcodeScanBtn.style.display = 'block';
            return;
        }
        console.log("QuaggaJS Initialization finished. Ready to start.");
        Quagga.start();
    });

    Quagga.onDetected(function (result) {
        const barcode = result.codeResult.code;
        if (barcode) {
            console.log("Barcode detected:", barcode);
            barcodeResultDiv.textContent = `Scanned Barcode: ${barcode}`;
            handleRecyclingSuggestion(barcode);
            stopBarcodeScanner();
        }
    });

    barcodeScannerVideo.onloadedmetadata = () => {
        barcodeScannerVideo.play();
    };
}

function stopBarcodeScanner() {
    if (!scanningBarcode) return;
    Quagga.stop();
    barcodeScannerVideo.style.display = 'none';
    startBarcodeScanBtn.style.display = 'block';
    stopBarcodeScanBtn.style.display = 'none';
    scanningBarcode = false;
    console.log("Barcode scanner stopped.");
    barcodeResultDiv.textContent = 'Scanned Barcode: None';
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
    if (mediaStream) return;

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraFeed.srcObject = mediaStream;
        cameraFeed.style.display = 'block';
        startCameraBtn.style.display = 'none';
        captureImageBtn.style.display = 'block';
        stopCameraBtn.style.display = 'block';
        classifyCapturedImageBtn.style.display = 'none';
        document.getElementById('suggestionResult').textContent = 'Suggestion will appear here.';
        cameraCanvas.style.display = 'none';
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert(`Error accessing camera: ${err.name} - ${err.message}. Please allow camera access.`);
    }
}

function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track
