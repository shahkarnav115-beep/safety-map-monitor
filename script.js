/************************************************
 * GLOBAL STATE
 ************************************************/
let map;
let userMarker;
let safetyCircle;

// Overlay state
let overlayActive = false;
let overlayElements = [];
let overlayTimeout = null;

// Geofence config (DYNAMIC)
const GEOFENCE_RADIUS = 150; // meters
let geofenceCenter = null;   // ✅ FIX: dynamic center

let wasInsideGeofence = null;

// Sensor history (for SOS logic later)
let lastSpeed = null;
let lastAltitude = null;
let lastTimestamp = null;

// SOS lock
let sosTriggered = false;

/************************************************
 * INIT MAP (CALLED BY GOOGLE MAPS)
 ************************************************/
function initMap() {
  const defaultLoc = { lat: 22.5645, lng: 72.9289 }; // fallback only

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 15,
    center: defaultLoc,
    zoomControl: true,
    mapTypeControl: false,
    fullscreenControl: false,
    styles: [
      { featureType: "poi", stylers: [{ visibility: "off" }] }
    ]
  });

  // 🔐 IMPORTANT: only start tracking if monitoring is active
  if (localStorage.getItem("monitoring") !== "active") {
    console.log("⏸ Monitoring inactive. Location not requested.");
    return;
  }

  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return;
  }

  navigator.geolocation.watchPosition(
    onPosition,
    onLocationError,
    {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 10000
    }
  );
}

/************************************************
 * LOCATION UPDATE
 ************************************************/
function onPosition(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const speed = position.coords.speed || 0;
  const altitude = position.coords.altitude;
  const accuracy = position.coords.accuracy || 20;
  const now = Date.now();

  const userLoc = { lat, lng };
  map.setCenter(userLoc);

  // 📍 FIX 1: Geofence ALWAYS follows user
  geofenceCenter = userLoc;

  // Marker
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

  // Geofence circle
  if (!safetyCircle) {
    safetyCircle = new google.maps.Circle({
      map,
      center: geofenceCenter,
      radius: GEOFENCE_RADIUS,
      fillOpacity: 0.25,
      strokeWeight: 2
    });
  } else {
    safetyCircle.setCenter(geofenceCenter);
  }

  /************************************************
   * FIX 2: PROPER ZONE CLASSIFICATION
   * (NO MORE DANGER 24/7)
   ************************************************/

  let zone, color, score;

  // We use GPS accuracy as a proxy for stability/context for now
  if (accuracy <= 30) {
    zone = "safe";
    color = "#2a9d8f"; // green
    score = 85;
  } else if (accuracy <= 70) {
    zone = "moderate";
    color = "#e9c46a"; // yellow
    score = 60;
  } else {
    zone = "danger";
    color = "#e63946"; // red
    score = 35;
  }

  safetyCircle.setOptions({
    fillColor: color,
    strokeColor: color
  });

  localStorage.setItem("riskLevel", zone);
  localStorage.setItem("safetyScore", score);

  // Overlay (ONLY ONCE)
  if (!overlayActive) {
    showOverlayGuide(zone);
  }

  // Preserve SOS-related history (unchanged)
  lastSpeed = speed;
  lastAltitude = altitude;
  lastTimestamp = now;
}

/************************************************
 * LOCATION ERROR
 ************************************************/
function onLocationError(error) {
  console.warn("Location error:", error);

  if (error.code === error.PERMISSION_DENIED) {
    alert(
      "Location permission is required for live monitoring.\n" +
      "Please enable it in browser settings."
    );
  }
}

/************************************************
 * DISTANCE HELPER (HAVERSINE)
 ************************************************/
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/************************************************
 * OVERLAY UI (UNCHANGED, BUT FIXED CENTER)
 ************************************************/
function showOverlayGuide(zone) {
  overlayActive = true;

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "50%";
  container.style.bottom = "140px";
  container.style.transform = "translateX(-50%)";
  container.style.background = "white";
  container.style.padding = "10px 14px";
  container.style.borderRadius = "12px";
  container.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)";
  container.style.zIndex = "999";
  container.style.fontFamily = "system-ui, sans-serif";
  container.style.maxWidth = "260px";
  container.style.textAlign = "center";

  const title = document.createElement("div");
  title.style.fontSize = "14px";
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
    title.textContent = "Higher risk area";
    sub.textContent = "Surroundings are less predictable here";
  }

  const skip = document.createElement("div");
  skip.textContent = "Skip";
  skip.style.marginTop = "6px";
  skip.style.fontSize = "12px";
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

function generateMockSafeSpots(center) {
  return [
    { lat: center.lat + 0.00005, lng: center.lng + 0.00003 },
    { lat: center.lat - 0.00004, lng: center.lng + 0.00006 },
    { lat: center.lat + 0.00006, lng: center.lng - 0.00004 }
  ];
}

function addSkipOverlayButton() {
  const btn = document.createElement("button");
  btn.innerText = "Skip";
  btn.style.position = "absolute";
  btn.style.top = "20px";
  btn.style.right = "20px";
  btn.style.zIndex = "999";
  btn.style.padding = "8px 14px";
  btn.style.borderRadius = "20px";
  btn.style.border = "none";
  btn.style.fontWeight = "600";
  btn.style.cursor = "pointer";
  btn.style.background = "rgba(0,0,0,0.7)";
  btn.style.color = "white";

  btn.onclick = removeOverlayGuide;

  document.body.appendChild(btn);
  overlayElements.push(btn);
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

