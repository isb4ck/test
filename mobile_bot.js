const { exec } = require("child_process");

// === RANDOM HELPERS ===
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];


// === ANDROİD CİHAZ MODELLERİ ===
const devices = [
  "SM-S908B", "Pixel 7", "Redmi Note 11",
  "OnePlus 9", "Samsung A52", "Pixel 6", "Xiaomi Mi 11", "Samsung S21"
];

// === HTTP HEADER SETLERİ ===
const headerSets = [
  { lang: "tr-TR", uaLang: "tr-TR" },
  { lang: "en-US", uaLang: "en-US" },
  { lang: "tr,en-US", uaLang: "tr-TR,en-US" },
  { lang: "en-US,en", uaLang: "en-US,en" },
  { lang: "tr,en", uaLang: "tr,en" }
];

// === REFERERLER ===
const referers = [
  "https://www.google.com/",
  "https://www.youtube.com/",
  "https://www.instagram.com/",
  "https://www.facebook.com/",
  "https://twitter.com/",
  "https://www.tiktok.com/",
  "https://news.google.com/"
];

// === NOISE ACTIONS ===
const noiseActions = ["search_only", "wrong_search", "google_only", "random_click"];

const wrongSearchTerms = ["hava durumu", "yemek tarifi", "döviz kuru", "son dakika", "çikolatalı kek"];



// === SHELL EXEC WRAPPER ===
function sh(command) {
  return new Promise((resolve) => {
    exec(command, (error, stdout) => {
      resolve(stdout || "");
    });
  });
}



// === GOOGLE SEARCH CRAWLER ===
async function googleSearch(keyword, device, headerSet, referer) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;

  const cmd = `
    curl -s --http2 \
     -A "Mozilla/5.0 (Linux; Android 12; ${device}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117 Mobile Safari/537.36" \
     -H "Accept-Language: ${headerSet.lang}" \
     -e "${referer}" \
     "${url}"
  `;

  return await sh(cmd);
}



// === CHECK DOMAIN IN SEARCH RESULTS ===
function containsDomain(html, domain) {
  return html.includes(domain);
}



// === RANDOM NOISE ACTION LOGIC ===
async function runNoiseAction() {
  const act = choice(noiseActions);

  console.log("🔸 Noise Action:", act);

  if (act === "search_only") {
    await googleSearch("hangi gün", choice(devices), choice(headerSets), choice(referers));
  }

  if (act === "wrong_search") {
    await googleSearch(choice(wrongSearchTerms), choice(devices), choice(headerSets), choice(referers));
  }

  if (act === "google_only") {
    await sh('curl -s https://www.google.com/');
  }

  if (act === "random_click") {
    await sh('curl -s https://www.hurriyet.com.tr/');
  }
}



// === MAIN VISIT FUNCTION ===
async function runVisit(keyword, targetDomain) {
  console.log("\n\n==============================");
  console.log("📍 Yeni Görev Başladı:", keyword);

  const device = choice(devices);
  const headerSet = choice(headerSets);
  const referer = choice(referers);

  console.log("📱 Cihaz:", device);
  console.log("🌐 Dil:", headerSet.lang);
  console.log("🔗 Referer:", referer);

  // %30 Noise Action
  if (Math.random() < 0.3) {
    await runNoiseAction();
  }

  // Random delay (düşünme süresi)
  const think = rand(2000, 5000);
  console.log("⏳ Düşünme süresi:", think / 1000, "sn");
  await delay(think);

  // Google Search
  console.log("🔍 Google araması yapılıyor...");
  const html = await googleSearch(keyword, device, headerSet, referer);

  if (!html || html.length < 50) {
    console.log("⚠️ Google sonuçları gelmedi, IP down olabilir.");
    return;
  }

  if (!containsDomain(html, targetDomain)) {
    console.log("❌ Hedef domain sonuçlarda bulunamadı.");
    return;
  }

  console.log("✅ Hedef domain sonuçlarda bulundu → Ziyaret ediliyor...");

  // Visit domain (dwell time simülasyonu)
  await sh(`curl -s --http2 "${targetDomain}"`);

  const stay = rand(5000, 15000);
  console.log("⏳ Sitede kalma süresi:", stay / 1000, "sn");

  await delay(stay);

  console.log("🏁 Ziyaret tamamlandı.");
}



// === LOOP ===
async function loop() {
  while (true) {
    await runVisit("forklift kiralama", "https://fedaiforklift.com");
    const wait = rand(3000, 7000);
    console.log("🔄 Yeni görev öncesi bekleme:", wait / 1000, "sn");
    await delay(wait);
  }
}

loop();
