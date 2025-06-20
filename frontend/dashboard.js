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
      readers: [
        "ean_reader",
        "upc_reader",
        "code_128_reader",
        "code_39_reader"
      ]
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
