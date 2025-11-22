 /* ================= CONFIG =================== */
const UNSPLASH_KEY = "RyX7Ms-sU3CG3_CWB_aJWMklWKLRS1xmMaAxCLk-ZKs";
const OPENWEATHER_KEY = "118ad815e728dbdd3806731304a1385a";

/* ================ DATA ===================== */
const featuredData = [
  { id: "paris", title: "Paris, France", desc: "City of lights and romance.", q: "paris, france" },
  { id: "bali", title: "Bali, Indonesia", desc: "Tropical beaches and serene temples.", q: "bali beach" },
  { id: "tokyo", title: "Tokyo, Japan", desc: "Vibrant city mixing tradition and neon.", q: "tokyo skyline" },
  { id: "reykjavik", title: "Reykjavik, Iceland", desc: "Northern lights and dramatic landscapes.", q: "iceland northern lights" }
];

/* ================ HELPERS =================== */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function fallbackImage(q){ return `https://source.unsplash.com/1200x800/?${encodeURIComponent(q)}`; }

/* ================ MODAL ===================== */
const modal = $('#modal');
const modalImg = $('#modal-img');
const modalTitle = $('#modal-title');
const modalDesc = $('#modal-desc');
const modalClose = $('#modal-close');

function openModal(img, title, desc, extraHTML = "") {
  modalImg.src = img || "";
  modalTitle.textContent = title || "";
  modalDesc.textContent = desc || "";
  const extra = document.getElementById('modal-extra');
  if (extra) extra.innerHTML = extraHTML || "";
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
}
function closeModal(){
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
}
modalClose?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });

/* ================ UNSPLASH HELPERS =========== */
async function fetchUnsplashPhoto(query) {
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&client_id=${UNSPLASH_KEY}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Unsplash failed');
    const data = await res.json();
    return data.results && data.results[0] ? data.results[0].urls.regular : fallbackImage(query);
  } catch { return fallbackImage(query); }
}
async function fetchUnsplashPhotos(query, perPage=9){
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&client_id=${UNSPLASH_KEY}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Unsplash search failed');
    const data = await res.json();
    return data.results.map(r=>r.urls.regular);
  } catch { return Array.from({length:perPage},()=>fallbackImage(query)); }
}

/* ================ WIKIPEDIA ================== */
async function fetchWikiSummary(title){
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?origin=*`;
  const res = await fetch(url);
  if(!res.ok) return null;
  return await res.json();
}

/* ================ OPENWEATHER (Geocode + Weather) =========== */
async function geocodePlace(q){
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=1&appid=${OPENWEATHER_KEY}`;
  const res = await fetch(url);
  if(!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}
async function fetchWeather(lat, lon){
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_KEY}`;
  const res = await fetch(url);
  if(!res.ok) return null;
  return await res.json();
}

/* ================ UI HELPERS ================== */
function buildExtraHTML(wiki, geo, weather){
  let html = '';
  if(wiki){
    html += `<div><strong>${wiki.title || ''}</strong><p>${wiki.extract || ''}</p>`;
    if(wiki.thumbnail?.source) html += `<img src="${wiki.thumbnail.source}" style="width:100%;border-radius:8px;margin-top:8px" alt="">`;
    html += `</div>`;
  }
  if(geo){
    html += `<div style="margin-top:8px"><strong>Coordinates:</strong> ${geo.lat?.toFixed(4)}, ${geo.lon?.toFixed(4)} <br><strong>Country:</strong> ${geo.country || ''}</div>`;
  }
  if(weather && weather.weather && weather.weather[0] && weather.main){
    html += `<div style="margin-top:8px"><strong>Weather:</strong> ${weather.weather[0].description}, ${Math.round(weather.main.temp)}°C (feels like ${Math.round(weather.main.feels_like)}°C)</div>`;
  }
  return html;
}

/* ================ CARD ANIMATION (Observer) =============== */
function observeCards() {
  const cards = document.querySelectorAll('.card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('show');
    });
  }, { threshold: 0.2 });
  cards.forEach(card => observer.observe(card));
}

/* ================ FEATURED GRID ================== */
async function initFeatured(){
  const container = $('#featured-grid');
  if (!container) return;
  for(const item of featuredData){
    const img = await fetchUnsplashPhoto(item.q);
    const card = createCard(item, img);
    container.appendChild(card);
  }
  observeCards();
}
function createCard(item, imgUrl){
  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.query = item.q;
  div.innerHTML = `
    <img loading="lazy" src="${imgUrl}" alt="${item.title}" />
    <div class="card-body">
      <h3>${item.title}</h3>
      <p>${item.desc}</p>
    </div>
  `;
  div.addEventListener('click', async ()=>{
    const q = item.q.split(',')[0];
    const wiki = await fetchWikiSummary(q);
    const geo = await geocodePlace(q);
    const weather = geo ? await fetchWeather(geo.lat, geo.lon) : null;
    const extra = buildExtraHTML(wiki, geo, weather);
    openModal(imgUrl, item.title, item.desc, extra);
    if(geo) centerMap([geo.lat, geo.lon], 6);
  });
  return div;
}

/* ================ SEARCH ================== */
async function doSearch(){
  const q = $('#search-input')?.value.trim();
  if(!q) return alert('Type a destination like "Paris" or "Tokyo"');
  $('#search-loader').style.display = 'inline-block';
  try {
    const photos = await fetchUnsplashPhotos(q, 9);
    renderSearchResults(q, photos);
    const wiki = await fetchWikiSummary(q);
    const geo = await geocodePlace(q);
    const weather = geo ? await fetchWeather(geo.lat, geo.lon) : null;
    renderInfoPanel(q, wiki, geo, weather);

    if(geo){
      centerMap([geo.lat, geo.lon], 6);
      fetchNearbyLandmarks(geo.lat, geo.lon, q);
    } else {
      const grid = $('#landmark-grid');
      if (grid) grid.innerHTML = "<p>No landmarks found (location unavailable).</p>";
    }
  } catch(e){
    console.error(e);
    alert('Error fetching info. Please check API keys or try again.');
  } finally {
    $('#search-loader').style.display = 'none';
  }
}
function renderSearchResults(query, photos){
  const grid = $('#search-grid');
  if (!grid) return;
  grid.innerHTML = '';
  photos.forEach((p, idx) => {
    const div = document.createElement('div');
    div.className = 'card show';
    div.innerHTML = `
      <img loading="lazy" src="${p}" alt="${query} ${idx+1}" />
      <div class="card-body"><h3>${capitalize(query)}</h3><p>Image ${idx+1}</p></div>
    `;
    div.addEventListener('click', async ()=>{
      const wiki = await fetchWikiSummary(query);
      const geo = await geocodePlace(query);
      const weather = geo ? await fetchWeather(geo.lat, geo.lon) : null;
      const extra = buildExtraHTML(wiki, geo, weather);
      openModal(p, capitalize(query), `Image ${idx+1} — ${query}`, extra);
      if(geo) centerMap([geo.lat, geo.lon], 7);
    });
    grid.appendChild(div);
  });
}
function renderInfoPanel(q, wiki, geo, weather){
  const info = $('#wiki-info');
  if (info) {
    let html = `<h3>${capitalize(q)}</h3>`;
    if(wiki) {
      html += `<p>${wiki.extract}</p>`;
      if(wiki.thumbnail?.source) html += `<img src="${wiki.thumbnail.source}" alt="${wiki.title}" />`;
    } else html += `<p>No Wikipedia summary found.</p>`;
    if(geo) html += `<p><strong>Coords:</strong> ${geo.lat.toFixed(2)}, ${geo.lon.toFixed(2)} • <strong>Country:</strong> ${geo.country}</p>`;
    info.innerHTML = html;
  }
  const wbox = $('#weather-info');
  if(wbox){
    if(weather && weather.weather && weather.main){
      wbox.innerHTML = `<p><strong>Weather:</strong> ${weather.weather[0].description} • ${Math.round(weather.main.temp)}°C</p>`;
    } else {
      wbox.innerHTML = `<p>No weather available.</p>`;
    }
  }
}

/* ================ MAP (Leaflet) ================= */
let map, markerLayer;
function initMap(){
  try {
    const mapEl = $('#map');
    if (!mapEl) return;
    map = L.map('map', { center:[20,0], zoom:2, scrollWheelZoom:false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap contributors' }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    window.addEventListener('resize', ()=>{ map.invalidateSize(); });
  } catch(e){ console.error("Map init failed:", e); }
}
 function centerMap(latlng, zoom=6){
  if(!map || !latlng) return;
  markerLayer.clearLayers();
  L.marker(latlng).addTo(markerLayer).bindPopup("📍 Destination").openPopup();
  map.flyTo(latlng, zoom, { duration: 2, easeLinearity: 0.2 });
}


/* ================ LANDMARKS ================== */
async function fetchNearbyLandmarks(lat, lon, destination) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates|pageimages|description&generator=geosearch&ggscoord=${lat}|${lon}&ggsradius=10000&ggslimit=6&origin=*`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Wiki landmarks fetch failed");
    const data = await res.json();
    const grid = document.getElementById("landmark-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (!data.query) {
      grid.innerHTML = "<p>No landmarks found nearby.</p>";
      return;
    }

    const pages = Object.values(data.query.pages);
    for (const place of pages) {
      const imgUrl = await fetchUnsplashPhoto(`${place.title} ${destination}`);
      const desc = place.description || `A notable site near ${destination}`;
      const card = document.createElement("div");
      card.className = "landmark-card";
      card.innerHTML = `
        <img src="${imgUrl}" alt="${place.title}">
        <div class="landmark-info">
          <h4>${place.title}</h4>
          <p>${desc}</p>
        </div>
      `;
      grid.appendChild(card);
    }
  } catch (e) {
    console.error("Landmarks fetch failed:", e);
    const grid = document.getElementById("landmark-grid");
    if (grid) grid.innerHTML = "<p>Unable to load landmarks.</p>";
  }
}

/* ================ HERO BUTTONS (Explore + Random) =============== */
document.addEventListener('DOMContentLoaded', () => {
  const exploreBtn = document.getElementById('explore-btn');
  const randomBtn = document.getElementById('random-btn');

  if (exploreBtn) {
    exploreBtn.addEventListener('click', () => {
      const featuredSection = document.getElementById('featured');
      if (featuredSection) featuredSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

   if (randomBtn) {
  randomBtn.addEventListener('click', async () => {
    randomBtn.classList.add("loading"); // ✈️ Add animation
    randomBtn.disabled = true;
    
    const randomItem = featuredData[Math.floor(Math.random() * featuredData.length)];
    const img = await fetchUnsplashPhoto(randomItem.q);
    const key = randomItem.q.split(',')[0];
    const wiki = await fetchWikiSummary(key);
    const geo = await geocodePlace(key);
    const weather = geo ? await fetchWeather(geo.lat, geo.lon) : null;
    const extra = buildExtraHTML(wiki, geo, weather);

    setTimeout(() => {
      openModal(img, randomItem.title, randomItem.desc, extra);
      if (geo) centerMap([geo.lat, geo.lon], 6);
      randomBtn.classList.remove("loading");
      randomBtn.disabled = false;
    }, 1000); // small delay for effect
  });
}
});

/* ================ INIT APP ================== */
document.addEventListener('DOMContentLoaded', async ()=>{
  initMap();
  await initFeatured();
  $('#search-btn')?.addEventListener('click', doSearch);
  $('#search-input')?.addEventListener('keypress', e => { if(e.key === 'Enter') doSearch(); });
  $('#top-btn')?.addEventListener('click', ()=>window.scrollTo({ top:0, behavior:'smooth' }));
});

/* ================ AI TRIP PLANNER ================== */
(function(){
  function randomPick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function titleCase(s){ return s.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase()); }
  const AI_DB = {
    intros: [
      "Welcome to your custom itinerary! Here's how to make the most of your trip.",
      "I mapped a balanced plan of sights, food, and downtime for you.",
      "This plan blends must-see spots with hidden gems."
    ],
    closers: [
      "Tip: keep one meal open each day to try a local recommendation.",
      "Remember to book stays early during peak season.",
      "Check local events—they can seriously level up your experience."
    ],
    activities: {
      Food: ["street-food crawl", "popular breakfast café", "heritage restaurant", "local dessert stop"],
      Nature: ["sunrise viewpoint", "botanical garden walk", "lakeside picnic", "nature trail"],
      Adventure: ["water sports", "ATV ride", "paragliding", "river rafting"],
      Relaxation: ["spa hour", "beach lounge", "slow café break"],
      History: ["heritage walk", "fort visit", "museum stop"],
      Nightlife: ["pub night", "live music", "skybar sunset"]
    }
  };

  function estimateBudget(days, tier){
    const perDay = tier==="Luxury"?12000:tier==="Budget"?3500:6500;
    const buffer = Math.round(perDay*days*0.12);
    const total = perDay*days+buffer;
    return { perDay, total, currency:"INR" };
  }

  function generateDayPlan(day, dest, interests){
    const blocks=["Morning","Afternoon","Evening"];
    const chosen=interests.length?interests.slice(0,3):["Food","Nature","Relaxation"];
    const plan=blocks.map((b,i)=>{
      const cat=chosen[i%chosen.length];
      return `${b}: ${randomPick(AI_DB.activities[cat])}`;
    });
    return { title:`Day ${day}: ${titleCase(dest)}`, bullets:plan };
  }

  async function mockGenerateItinerary({ destination, days, budget, interests }){
    await new Promise(r=>setTimeout(r,500+Math.random()*700));
    const intro=randomPick(AI_DB.intros);
    const closer=randomPick(AI_DB.closers);
    const plan=[];
    for(let i=1;i<=days;i++) plan.push(generateDayPlan(i,destination,interests));
    const est=estimateBudget(days,budget);
    return { intro, plan, closer, budget:est };
  }

  function renderAIResults(node,result,opts){
    const html=[`
      <p>${result.intro}</p>
      <div class="ai-budget"><strong>Budget:</strong> ₹${result.budget.total.toLocaleString('en-IN')} (${result.budget.currency})</div>
    `];
    result.plan.forEach(d=>{
      html.push(`<article class="ai-card"><h3>${d.title}</h3><ul>${d.bullets.map(b=>`<li>${b}</li>`).join("")}</ul></article>`);
    });
    html.push(`<p class="ai-closer">${result.closer}</p>`);
    node.innerHTML=html.join("");
  }

  function initAI(){
    const form=document.getElementById("ai-form");
    if(!form) return;
    const dest=document.getElementById("ai-destination");
    const days=document.getElementById("ai-days");
    const budget=document.getElementById("ai-budget");
    const out=document.getElementById("ai-output");
    const status=document.getElementById("ai-status");
    const btnCopy=document.getElementById("ai-copy");
    const btnPrint=document.getElementById("ai-print");

    form.addEventListener("submit", async e=>{
      e.preventDefault();
      const destination=(dest.value||"Goa").trim();
      const numDays=Math.max(1, Math.min(14, parseInt(days.value||"3",10)));
      const tier=budget.value||"Mid";
      const interests=Array.from(document.querySelectorAll(".ai-interests input:checked")).map(c=>c.value);

      out.hidden=true; out.innerHTML=""; status.hidden=false;
      const result=await mockGenerateItinerary({destination,days:numDays,budget:tier,interests});
      status.hidden=true; out.hidden=false;

      renderAIResults(out,result,{destination,days:numDays,budget:tier,interests});
      if (btnCopy) btnCopy.disabled=false;
      if (btnPrint) btnPrint.disabled=false;
    });

    btnCopy?.addEventListener("click", async ()=>{
      try {
        await navigator.clipboard.writeText((document.getElementById("ai-output")?.innerText)||"");
        alert("Itinerary copied to clipboard!");
      } catch {
        alert("Copy failed. Please select and copy manually.");
      }
    });

    btnPrint?.addEventListener("click", ()=> window.print());
  }

  document.addEventListener("DOMContentLoaded", initAI);
})();
