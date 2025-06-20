let bioBin = 0;
let nonBioBin = 0;
let bioCapacity = 10;
let nonBioCapacity = 15;
let lastPickupDate = null;

const API_BASE = 'https://team-daa4sem.onrender.com';

const bioCapStored = sessionStorage.getItem("bioCap");
const nonBioCapStored = sessionStorage.getItem("nonBioCap");
if (bioCapStored) bioCapacity = parseFloat(bioCapStored);
if (nonBioCapStored) nonBioCapacity = parseFloat(nonBioCapStored);

// ✅ Fetch actual bin state from MongoDB on load
async function fetchBinState() {
  const username = sessionStorage.getItem('username');
  if (!username) return;

  try {
    const res = await fetch(`${API_BASE}/api/get-user/${username}`);
    if (!res.ok) throw new Error('User not found');
    const data = await res.json();

    bioBin = data.currentBioWeight || 0;
    nonBioBin = data.currentNonBioWeight || 0;
    bioCapacity = data.bioCapacity || 10;
    nonBioCapacity = data.nonBioCapacity || 15;
    lastPickupDate = data.lastPickup ? new Date(data.lastPickup) : null;

    sessionStorage.setItem("bioCap", bioCapacity);
    sessionStorage.setItem("nonBioCap", nonBioCapacity);

    updateBins();
    updateAdminTable();
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
      <div class="bar" style="height: ${bioPercent * 2}px;"></div>
      <div>${Math.min(bioBin, bioCapacity).toFixed(1)} / ${bioCapacity} kg (${bioPercent.toFixed(0)}%)</div>
    </div>
    <div class="bin">
      <h3>Non-Bio Bin</h3>
      <div class="bar" style="height: ${nonBioPercent * 2}px;"></div>
      <div>${Math.min(nonBioBin, nonBioCapacity).toFixed(1)} / ${nonBioCapacity} kg (${nonBioPercent.toFixed(0)}%)</div>
    </div>
  `;
}

// 📊 Admin Table Update
function updateAdminTable() {
  const bioPercent = Math.min(100, (bioBin / bioCapacity) * 100);
  const nonBioPercent = Math.min(100, (nonBioBin / nonBioCapacity) * 100);

  const lastCollected = lastPickupDate
    ? lastPickupDate.toLocaleDateString()
    : 'Not Available';

  document.getElementById('adminTableBody').innerHTML = `
    <tr>
      <td>Zone A</td>
      <td>#101</td>
      <td>${bioPercent.toFixed(0)}%</td>
      <td>${lastCollected}</td>
      <td class="status ${bioPercent >= 80 ? 'critical' : 'ok'}">${bioPercent >= 80 ? 'Needs Pickup' : 'Okay'}</td>
    </tr>
    <tr>
      <td>Zone B</td>
      <td>#102</td>
      <td>${nonBioPercent.toFixed(0)}%</td>
      <td>${lastCollected}</td>
      <td class="status ${nonBioPercent >= 80 ? 'critical' : 'ok'}">${nonBioPercent >= 80 ? 'Needs Pickup' : 'Okay'}</td>
    </tr>
  `;
}
