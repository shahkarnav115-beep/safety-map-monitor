/************************************************
 * GLOBAL STATE
 ************************************************/
let map;
let userMarker;
let safetyCircle; // The blue bubble showing GPS accuracy around you

// 🔥 NEW: Fixed Danger Zone State
let dangerZoneCircle;      // The static red circle on the map
let dangerZoneCenter = null; 
const DANGER_RADIUS = 100; // 100 meters fixed radius

// Overlay state
let overlayActive = false;
let overlayElements = [];

// Sensor history & SOS
let lastSpeed = null;
let lastAltitude = null;
let lastTimestamp = null;
let sosTriggered = false;

/************************************************
 * 1. INIT MAP
 ************************************************/
function initMap() {
  const defaultLoc = { lat: 22.5645, lng: 72.9289 };

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 15,
    center: defaultLoc,
    zoomControl: true,
    mapTypeControl: false,
    fullscreenControl: false,
    styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
  });

  // 🔥 ACTION: Click anywhere on the map to create a Danger Zone
  map.addListener("click", (e) => {
    createDangerZone(e.latLng);
  });

  // Check monitoring status
  if (localStorage.getItem("monitoring") !== "active") {
    console.log("⏸ Monitoring inactive.");
    return;
  }

  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return;
  }

  navigator.geolocation.watchPosition(
    onPosition,
    onLocationError,
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
  );
}

/************************************************
 * 2. NEW: CREATE DANGER ZONE FUNCTION
 ************************************************/
function createDangerZone(latLng) {
  dangerZoneCenter = latLng;
  
  // Remove old circle if it exists (so we only have one danger zone for testing)
  if (dangerZoneCircle) dangerZoneCircle.setMap(null);

  // Draw the new static Red Zone (100m)
  dangerZoneCircle = new google.maps.Circle({
    strokeColor: "#FF0000",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#FF0000",
    fillOpacity: 0.35,
    map: map,
    center: latLng,
    radius: DANGER_RADIUS, // 100 meters
  });

  console.log("⚠️ New Danger Zone created. Walk into it to test!");
}

/************************************************
 * 3. LOCATION UPDATE LOOP
 ************************************************/
function onPosition(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const accuracy = position.coords.accuracy || 20;
  
  // Save sensor data (for future SOS features)
  lastSpeed = position.coords.speed;
  lastAltitude = position.coords.altitude;

  const userLoc = { lat, lng };
  
  // Center map on user
  map.setCenter(userLoc);

  // --- DRAW USER MARKER ---
  if (!userMarker) {
    userMarker = new google.maps.Marker({
      position: userLoc,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "white"
      }
    });
  } else {
    userMarker.setPosition(userLoc);
  }

  // --- DRAW ACCURACY BUBBLE (Visual only) ---
  if (!safetyCircle) {
    safetyCircle = new google.maps.Circle({
      map,
      center: userLoc,
      radius: accuracy, 
      fillOpacity: 0.1,
      strokeWeight: 1,
      fillColor: "#4285F4",
      strokeColor: "#4285F4"
    });
  } else {
    safetyCircle.setCenter(userLoc);
    safetyCircle.setRadius(accuracy);
  }

  // --- 🔥 LOGIC: AM I IN DANGER? ---
  let zone = "safe";
  let score = 90;
  let color = "#2a9d8f"; // Green

  // Check 1: Are we inside the Fixed Danger Zone?
  if (dangerZoneCenter) {
    // Calculate distance using Google Geometry Library
    const distanceToDanger = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(userLoc.lat, userLoc.lng),
      dangerZoneCenter
    );

    console.log(`Distance to Danger Zone: ${Math.round(distanceToDanger)} meters`);

    if (distanceToDanger <= DANGER_RADIUS) {
      zone = "danger";
      score = 25;
      color = "#e63946"; // Red
    }
  }

  // Check 2: If not in danger zone, check GPS Accuracy (fallback logic)
  if (zone !== "danger") {
    if (accuracy > 50) {
      zone = "moderate";
      score = 60;
      color = "#e9c46a"; // Yellow
    }
  }

  // Update UI Colors
  safetyCircle.setOptions({ fillColor: color, strokeColor: color });

  // Save to LocalStorage for other pages to see
  localStorage.setItem("riskLevel", zone);
  localStorage.setItem("safetyScore", score);

  // Show Overlay if in Danger
  if (!overlayActive && zone !== "safe") {
    showOverlayGuide(zone);
  }
}

/************************************************
 * 4. ERROR HANDLING & UTILS
 ************************************************/
function onLocationError(error) {
  console.warn("Location error:", error);
  if (error.code === error.PERMISSION_DENIED) {
    alert("Location permission is required for live monitoring.");
  }
}

/************************************************
 * 5. OVERLAY UI FUNCTIONS (Unchanged)
 ************************************************/
function showOverlayGuide(zone) {
  overlayActive = true;

  const container = document.createElement("div");
  // Basic Styling
  Object.assign(container.style, {
    position: "absolute", left: "50%", bottom: "140px",
    transform: "translateX(-50%)", background: "white",
    padding: "10px 14px", borderRadius: "12px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
    zIndex: "999", fontFamily: "system-ui, sans-serif",
    maxWidth: "260px", textAlign: "center"
  });

  const title = document.createElement("div");
  title.style.fontWeight = "600";
  title.style.marginBottom = "4px";

  const sub = document.createElement("div");
  sub.style.fontSize = "12px";
  sub.style.color = "#666";

  if (zone === "safe") {
    title.textContent = "Safe area";
    sub.textContent = "Conditions around you are stable";
  } else if (zone === "moderate") {
    title.textContent = "Moderate safety zone";
    sub.textContent = "Lower activity and changing surroundings";
  } else {
    title.textContent = "⚠️ High Risk Area";
    sub.textContent = "You have entered a designated danger zone.";
  }

  const skip = document.createElement("div");
  skip.textContent = "Dismiss";
  skip.style.marginTop = "6px";
  skip.style.color = "#1d3557";
  skip.style.cursor = "pointer";
  skip.style.fontWeight = "600";
  skip.onclick = removeOverlayGuide;

  container.appendChild(title);
  container.appendChild(sub);
  container.appendChild(skip);
  document.body.appendChild(container);
  overlayElements.push(container);
}

function removeOverlayGuide() {
  overlayElements.forEach(el => el.remove());
  overlayElements = [];
  overlayActive = false;
}

function triggerSOS(reason) {
  sosTriggered = true;
  localStorage.setItem("sosReason", reason);
  localStorage.setItem("riskLevel", "danger");
  localStorage.setItem("safetyScore", 5);
  window.location.href = "sos.html";
}

function goHome() {
  window.location.href = "home.html";
}
