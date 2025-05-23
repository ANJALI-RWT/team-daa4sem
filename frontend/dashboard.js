// dashboard.js
function logout() {
  alert("Logged out!");
  window.location.href = "index.html";
}

function classifyWaste() {
  const resultDiv = document.getElementById("aiResult");
  resultDiv.textContent = "Classifying... (mock result: Recyclable)";
  // Add API call or logic here
}

// Optional: simulate bin data
window.addEventListener("DOMContentLoaded", () => {
  const binData = document.getElementById("binData");
  for (let i = 1; i <= 4; i++) {
    const bin = document.createElement("div");
    bin.className = "bin";
    bin.innerHTML = `<h3>Bin ${i}</h3><div class="bar" style="height: ${Math.random() * 100}px;"></div>`;
    binData.appendChild(bin);
  }
});
