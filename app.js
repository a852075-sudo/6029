const data = window.TRAVEL_DATA;
let selectedDay = data.days[0];
let selectedCategory = "全部";
let searchTerm = "";
let userPosition = null;
let map;
let placeLayer;
let routeLayer;
let userLayer;

const $ = (id) => document.getElementById(id);

const categoryColors = {
  "神社寺院": "#198754",
  "購物": "#f59e0b",
  "美食": "#ef6c00",
  "老街": "#7952b3",
  "公園": "#2f855a",
  "地標": "#dc2626",
  "交通": "#2563eb",
  "海岸": "#0891b2",
  "海島": "#0f766e",
  "拍照": "#db2777",
  "街區": "#475569"
};

function init() {
  renderDateTabs();
  initMap();
  bindEvents();
  requestLocation();
  render();
}

function initMap() {
  map = L.map("map", { zoomControl: false }).setView(selectedDay.center, selectedDay.zoom);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "地圖資料 © OpenStreetMap；導航連結開啟 Google Maps"
  }).addTo(map);
  placeLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);
  userLayer = L.layerGroup().addTo(map);
}

function bindEvents() {
  $("locateBtn").addEventListener("click", requestLocation);
  $("searchInput").addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    render();
  });
}

function renderDateTabs() {
  $("dateTabs").innerHTML = data.days.map((day) => `
    <button class="date-tab ${day.id === selectedDay.id ? "active" : ""}" data-day="${day.id}" type="button">
      ${day.label}
    </button>
  `).join("");

  document.querySelectorAll(".date-tab").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDay = data.days.find((day) => day.id === button.dataset.day);
      selectedCategory = "全部";
      searchTerm = "";
      $("searchInput").value = "";
      renderDateTabs();
      render();
      map.setView(selectedDay.center, selectedDay.zoom);
    });
  });
}

function render() {
  $("dayTitle").textContent = selectedDay.title;
  $("dayMeta").textContent = selectedDay.meta;
  renderCategoryFilters();
  const places = filteredPlaces();
  renderMap(places);
  renderStops(places);
  renderCards(places);
  renderTimeline();
  updateRouteLinks(places);
  $("mapCount").textContent = `${places.length} 個景點`;
}

function categories() {
  return ["全部", ...new Set(selectedDay.places.map((place) => place.category))];
}

function renderCategoryFilters() {
  $("categoryFilters").innerHTML = categories().map((category) => `
    <button type="button" class="chip ${category === selectedCategory ? "active" : ""}" data-category="${category}">
      ${category}
    </button>
  `).join("");

  document.querySelectorAll(".chip").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;
      render();
    });
  });
}

function filteredPlaces() {
  return selectedDay.places.filter((place) => {
    const matchCategory = selectedCategory === "全部" || place.category === selectedCategory;
    const text = `${place.name} ${place.area} ${place.category} ${place.note} ${place.file}`.toLowerCase();
    return matchCategory && (!searchTerm || text.includes(searchTerm));
  });
}

function markerHtml(place) {
  const color = categoryColors[place.category] || "#1d7f5f";
  return `
    <div style="width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:${color};color:white;border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,.25);font-weight:800;">
      ${place.name.slice(0, 1)}
    </div>
  `;
}

function renderMap(places) {
  placeLayer.clearLayers();
  routeLayer.clearLayers();

  const bounds = [];
  places.forEach((place, index) => {
    const marker = L.marker([place.lat, place.lng], {
      icon: L.divIcon({ className: "", html: markerHtml(place), iconSize: [32, 32], iconAnchor: [16, 16] })
    }).addTo(placeLayer);
    marker.bindPopup(`
      <strong>${index + 1}. ${place.name}</strong><br>
      ${place.area} · ${place.category}<br>
      <span>${place.note}</span><br>
      <a target="_blank" rel="noreferrer" href="${googleMapsPlaceUrl(place)}">Google 導航</a>
    `);
    bounds.push([place.lat, place.lng]);
  });

  if (places.length > 1) {
    L.polyline(places.map((place) => [place.lat, place.lng]), {
      color: "#2563eb",
      weight: 4,
      opacity: .72,
      dashArray: "8 8"
    }).addTo(routeLayer);
  }

  if (userPosition) bounds.push([userPosition.lat, userPosition.lng]);
  if (bounds.length) map.fitBounds(bounds, { padding: [42, 42], maxZoom: selectedDay.zoom });
  if (!places.length) map.setView(selectedDay.center, selectedDay.zoom);
}

function renderStops(places) {
  if (!places.length) {
    $("stopList").innerHTML = `
      <div class="empty-state">
        <strong>尚未放入當日停靠點</strong>
        <span>等待依「時間行程表」核對日期與行程後再顯示，避免錯亂。</span>
      </div>
    `;
    return;
  }

  $("stopList").innerHTML = places.map((place, index) => `
    <button class="stop" type="button" data-lat="${place.lat}" data-lng="${place.lng}">
      <span class="stop-index">${index + 1}</span>
      <span>
        <strong>${place.name}</strong>
        <span>${place.area} · ${place.category}</span>
      </span>
    </button>
  `).join("");

  document.querySelectorAll(".stop").forEach((button) => {
    button.addEventListener("click", () => {
      map.setView([Number(button.dataset.lat), Number(button.dataset.lng)], 17);
    });
  });
}

function renderCards(places) {
  if (!places.length) {
    $("placeCards").innerHTML = `
      <div class="empty-state wide">
        <strong>此日期尚未完成行程核對</strong>
        <span>請依你提供的日期行程表確認後，才會顯示景點卡片與地圖標記。</span>
      </div>
    `;
    return;
  }

  $("placeCards").innerHTML = places.map((place) => `
    <article class="card">
      <div class="card-media">${place.name}</div>
      <div class="card-body">
        <span class="badge">${place.area} · ${place.category}</span>
        <h3>${place.name}</h3>
        <p>${place.note}</p>
        <div class="card-actions">
          <button type="button" data-focus="${place.lat},${place.lng}">地圖定位</button>
          <a target="_blank" rel="noreferrer" href="${googleMapsPlaceUrl(place)}">Google 導航</a>
        </div>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-focus]").forEach((button) => {
    button.addEventListener("click", () => {
      const [lat, lng] = button.dataset.focus.split(",").map(Number);
      window.scrollTo({ top: 0, behavior: "smooth" });
      map.setView([lat, lng], 17);
    });
  });
}

function renderTimeline() {
  const timeline = data.itineraries?.[selectedDay.id] || [];
  $("timelineTitle").textContent = `${selectedDay.label} ${selectedDay.title}`;
  $("timelineMeta").textContent = timeline.length ? `${timeline.length} 個時間節點` : "尚未建立時間流程";

  if (!timeline.length) {
    $("timelineRows").innerHTML = `
      <div class="empty-state wide">
        <strong>此日期尚未有時間流程</strong>
        <span>切換其他日期可查看已整理的行程表。</span>
      </div>
    `;
    return;
  }

  $("timelineRows").innerHTML = timeline.map((item) => `
    <article class="timeline-row">
      <time>${item.time}</time>
      <div>
        <h3>${item.spot}</h3>
        <p>${item.note}</p>
      </div>
    </article>
  `).join("");
}

function updateRouteLinks(places) {
  $("googleRouteLink").href = googleMapsRouteUrl(places);
  const nearest = nearestPlace(places);
  $("nearestRouteLink").href = nearest ? googleMapsPlaceUrl(nearest) : googleMapsRouteUrl(places);
  $("nearestRouteLink").textContent = nearest ? `導航到最近景點：${nearest.name}` : "導航到最近景點";
}

function requestLocation() {
  if (!navigator.geolocation) {
    $("locationStatus").textContent = "此瀏覽器不支援定位";
    return;
  }
  $("locationStatus").textContent = "定位中...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      $("locationStatus").textContent = "已取得目前位置";
      drawUserPosition();
      render();
    },
    () => {
      $("locationStatus").textContent = "定位未啟用";
      drawUserPosition();
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
}

function drawUserPosition() {
  userLayer.clearLayers();
  if (!userPosition) return;
  L.marker([userPosition.lat, userPosition.lng], {
    icon: L.divIcon({ className: "", html: "<div class='user-marker'></div>", iconSize: [28, 28], iconAnchor: [14, 14] })
  }).addTo(userLayer).bindPopup("你的目前位置");
}

function nearestPlace(places) {
  if (!userPosition || !places.length) return null;
  return [...places].sort((a, b) => distance(userPosition, a) - distance(userPosition, b))[0];
}

function distance(a, b) {
  const rad = Math.PI / 180;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function googleMapsPlaceUrl(place) {
  const origin = userPosition ? `&origin=${userPosition.lat},${userPosition.lng}` : "";
  return `https://www.google.com/maps/dir/?api=1${origin}&destination=${place.lat},${place.lng}&travelmode=${selectedDay.routeMode}`;
}

function displayFileName(fileName) {
  return String(fileName || "").replace(/\.[^.]+$/, "");
}

function googleMapsRouteUrl(places) {
  if (!places.length) return "https://www.google.com/maps";
  const origin = userPosition ? `${userPosition.lat},${userPosition.lng}` : `${places[0].lat},${places[0].lng}`;
  const destination = places[places.length - 1];
  const waypoints = places.slice(0, -1).map((place) => `${place.lat},${place.lng}`).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination.lat},${destination.lng}&waypoints=${encodeURIComponent(waypoints)}&travelmode=${selectedDay.routeMode}`;
}

init();
