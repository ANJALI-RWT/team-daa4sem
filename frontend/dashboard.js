// dashboard.js

function logout() {
  alert("Logged out!");
  window.location.href = "index.html";
}

function classifyWaste() {
  const resultDiv = document.getElementById("aiResult");
  const imageInput = document.getElementById("aiImageInput");

  if (!imageInput.files.length) {
    alert("Please upload an image first!");
    return;
  }

  resultDiv.textContent = "Classifying... (mock result: Recyclable)";

  // Simulate API call delay
  setTimeout(() => {
    // For demo, just a fixed response
    resultDiv.textContent = "AI Prediction: Recyclable Waste";
  }, 1500);
}

// Populate bins dynamically with random fill levels
window.addEventListener("DOMContentLoaded", () => {
  const binData = document.getElementById("binData");
  if (!binData) return;

  for (let i = 1; i <= 4; i++) {
    const fillPercent = Math.floor(Math.random() * 101); // 0 to 100%
    const bin = document.createElement("div");
    bin.className = "bin";
    bin.innerHTML = `
      <h3>Bin ${i}</h3>
      <div class="bar" style="height: ${fillPercent}%;"></div>
      <p>${fillPercent}% Full</p>
    `;
    binData.appendChild(bin);
  }
});
