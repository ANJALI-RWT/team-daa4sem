// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
//   <title>EcoAI - Citizen Dashboard</title>
//   <link rel="stylesheet" href="style.css">
//   <script defer src="script.js"></script> <!-- JavaScript for real-time logic -->
// </head>
// <body>
//   <nav class="sidebar">
//     <h2>♻ EcoAI</h2>
//     <ul>
//       <li><a href="#scan">Scan Waste</a></li>
//       <li><a href="#status">Bin Status</a></li>
//       <li><a href="#collector">Collector Tracker</a></li>
//     </ul>
//   </nav>

//   <main class="content">
//     <!-- Waste Scanning Section -->
//     <section id="scan">
//       <h1>🧾 Waste Scan & Sort</h1>
//       <p>Upload an image of your waste or scan the barcode to classify:</p>
//       <input type="file" accept="image/*" id="wasteImage">
//       <button class="submit-btn" onclick="classifyWaste()">Classify Waste</button>
//       <div class="result-card" id="classificationResult">Awaiting classification...</div>
//     </section>

//     <!-- Smart Bin Fill Status -->
//     <section id="status">
//       <h1>🗑 Live Bin Fill Levels</h1>
//       <div class="bin-grid" id="binGrid">
//         <!-- JavaScript will populate dynamic bin levels -->
//       </div>
//     </section>

//     <!-- Collector Live Tracker -->
//     <section id="collector">
//       <h1>🚛 Collector Live Location</h1>
//       <p>Track current location of the assigned waste collection truck:</p>
//       <iframe
//         id="mapIframe"
//         src="https://maps.google.com/maps?q=0,0&z=15&output=embed"
//         width="100%" height="300" frameborder="0" style="border-radius: 8px;">
//       </iframe>
//       <p id="collectorStatus">Waiting for truck update...</p>
//     </section>
//   </main>
// </body>
// </html>
