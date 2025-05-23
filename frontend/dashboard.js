// Simulate fetching bin data
document.addEventListener("DOMContentLoaded", () => {
  const binData = [
    { id: "Bin A", level: 76 },
    { id: "Bin B", level: 32 },
  ];

  const container = document.getElementById("binData");
  binData.forEach(bin => {
    const div = document.createElement("div");
    div.className = "bin";
    div.innerHTML = `
      <h3>${bin.id}</h3>
      <div class="bar" style="height: ${bin.level}%;"></div>
      <p>${bin.level}% Full</p>
    `;
    container.appendChild(div);
  });
});

// Simulate AI waste classification
function classifyWaste() {
  const result = document.getElementById("aiResult");
  result.textContent = "Analyzing...";
  setTimeout(() => {
    result.textContent = "Prediction: Recyclable Plastic";
    document.getElementById("recycleCount").textContent = 5;
  }, 1000);
}

function logout() {
  alert("Logged out!");
  window.location.href = "index.html";
}
