// ✅ Simulate Bin Fill + Calculate Percentage + Trigger "Needs Pickup"
app.post('/api/simulate-bin-fill', async (req, res) => {
  try {
    const { username, type, weight } = req.body;

    if (!username || !type || weight == null) {
      return res.status(400).json({ error: 'Provide username, type, and weight.' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let newWeight = 0;
    let capacity = 0;
    let percent = 0;
    let status = "Okay";

    if (type === 'Bio') {
      const current = user.currentBioWeight || 0;
      capacity = user.bioCapacity;
      newWeight = current + weight;
      percent = (newWeight / capacity) * 100;
      status = percent >= 100 ? 'Needs Pickup' : 'Okay';

      user.currentBioWeight = newWeight;
      user.bioStatus = status; // Optional: store status
    } else if (type === 'Non-Bio') {
      const current = user.currentNonBioWeight || 0;
      capacity = user.nonBioCapacity;
      newWeight = current + weight;
      percent = (newWeight / capacity) * 100;
      status = percent >= 100 ? 'Needs Pickup' : 'Okay';

      user.currentNonBioWeight = newWeight;
      user.nonBioStatus = status; // Optional: store status
    } else {
      return res.status(400).json({ error: 'Invalid bin type.' });
    }

    await user.save();

    console.log(`[🗑️ Bin Fill] ${username} - ${type} Bin: ${newWeight.toFixed(1)}kg (${percent.toFixed(1)}%) → ${status}`);

    res.json({
      message: `✅ ${type} bin updated for ${username}`,
      weight: newWeight,
      percent: percent.toFixed(1),
      status
    });

  } catch (error) {
    console.error('❌ simulate-bin-fill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
