const API_BASE = 'https://team-daa4sem.onrender.com';
const USERNAME = sessionStorage.getItem('username');

async function fetchUserBinStatus() {
  if (!USERNAME) return;

  try {
    const res = await fetch(`${API_BASE}/api/get-user/${USERNAME}`);
    if (!res.ok) throw new Error('Failed to fetch user data');

    const user = await res.json();

    const bioPercent = Math.min(100, ((user.currentBioWeight / user.bioCapacity) * 100).toFixed(1));
    const nonBioPercent = Math.min(100, ((user.currentNonBioWeight / user.nonBioCapacity) * 100).toFixed(1));

    // Update Text
    document.getElementById("bio-fill").textContent =
      `${user.currentBioWeight} / ${user.bioCapacity} kg (${bioPercent}%)`;

    document.getElementById("nonbio-fill").textContent =
      `${user.currentNonBioWeight} / ${user.nonBioCapacity} kg (${nonBioPercent}%)`;

    document.getElementById("bio-status").textContent = user.bioStatus;
    document.getElementById("nonbio-status").textContent = user.nonBioStatus;

    // Color-coded status
    document.getElementById("bio-status").style.color =
      user.bioStatus === 'Needs Pickup' ? 'red' : 'green';

    document.getElementById("nonbio-status").style.color =
      user.nonBioStatus === 'Needs Pickup' ? 'red' : 'green';

    // OPTIONAL: Update progress bar widths (if using)
    // document.getElementById("bio-progress").style.width = `${bioPercent}%`;
    // document.getElementById("nonbio-progress").style.width = `${nonBioPercent}%`;

  } catch (error) {
    console.error('❌ Error fetching bin status:', error);
  }
}

// Start on load and auto-refresh every 10s
fetchUserBinStatus();
setInterval(fetchUserBinStatus, 10000);
