// Mobile SEO Bot - Sequential Processing
const WebSocket = require('ws');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { rotateMobileData, getCurrentMobileIP } = require('./mobile_rotation');

// Anti-Detection Arrays
const MOBILE_UA_LIST = [
    "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11; SM-M526BR) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; M2101K9AG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; SM-A336E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; ONEPLUS A6000) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; Redmi Note 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36"
];

const HEADER_SETS = [
    '-H "Accept-Language: tr-TR,tr;q=0.9,en;q=0.8" -H "Connection: keep-alive"',
    '-H "Accept-Language: en-US,en;q=0.9,tr;q=0.8" -H "Upgrade-Insecure-Requests: 1"',
    '-H "Accept-Language: tr,en-US;q=0.9,en;q=0.8" -H "DNT: 1"',
    '-H "Accept-Language: tr-TR,tr;q=0.9" -H "Cache-Control: max-age=0"',
    '-H "Accept-Language: en-US,en;q=0.9" -H "Sec-Fetch-Site: none"'
];

const REF_LIST = [
    "https://www.google.com/",
    "https://m.youtube.com/",
    "https://www.instagram.com/",
    "https://www.facebook.com/",
    "https://news.google.com/",
    "https://twitter.com/",
    "https://www.tiktok.com/"
];

function randomUA() {
    return MOBILE_UA_LIST[Math.floor(Math.random() * MOBILE_UA_LIST.length)];
}

function randomHeaders() {
    return HEADER_SETS[Math.floor(Math.random() * HEADER_SETS.length)];
}

function randomReferer() {
    return REF_LIST[Math.floor(Math.random() * REF_LIST.length)];
}

// Configuration
let TARGET_URL = 'https://fedaiforklift.com';
let SEARCH_KEYWORDS = ['kayseri forklift kiralama', 'forklift kiralama', 'iş makinesi kiralama'];
let VISITS_PER_MINUTE = 10; // Düşük hız - IP rotasyonu için
let IP_ROTATION_INTERVAL = 3;
let TOTAL_VISIT_LIMIT = 0;
let DELAY_BETWEEN_VISITS = 60000 / VISITS_PER_MINUTE;

// Statistics
let visitCount = 0;
let successCount = 0;
let errorCount = 0;
let startTime = Date.now();
let botRunning = false;
let currentIP = 'Unknown';
let isProcessing = false; // Sıralı işlem kontrolü

// WebSocket server
let wss;
try {
    wss = new WebSocket.Server({ port: 8090 });
    console.log('🌐 WebSocket Server: ws://localhost:8090');
} catch (error) {
    wss = new WebSocket.Server({ port: 8091 });
    console.log('🌐 WebSocket Server: ws://localhost:8091');
}

function sendLogToDashboard(message, logType = 'info', ip = null) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'log',
                message: message,
                logType: logType,
                ip: ip
            }));
        }
    });
}

// Davranış çeşitliliği için noise actions
const NOISE_ACTIONS = [
    'search_only',     // Sadece arama yap, tıklama
    'wrong_search',    // Yanlış kelime ara
    'google_only',     // Sadece Google'a gir çık
    'random_click',    // Rastgele başka siteye tıkla
    'normal_search'    // Normal hedef arama
];

function shouldDoNoiseAction() {
    return Math.random() < 0.3; // %30 olasılıkla noise action
}

function getRandomNoiseAction() {
    return NOISE_ACTIONS[Math.floor(Math.random() * NOISE_ACTIONS.length)];
}

// AI Click Behavior Engine - Chromium Headless ile gerçek davranış
async function performRealisticGoogleSearch(keyword) {
    try {
        // Noise action kontrolü
        if (shouldDoNoiseAction()) {
            const noiseAction = getRandomNoiseAction();
            return await performNoiseAction(noiseAction, keyword);
        }
        
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        sendLogToDashboard(`🤖 AI Davranış Motoru: "${keyword}"`, 'info', currentIP);
        
        const siteDomain = new URL(TARGET_URL).hostname.replace('www.', '');
        const ua = randomUA();
        const deviceName = ua.match(/Android \d+; ([^)]+)/)?.[1] || 'Unknown';
        
        sendLogToDashboard(`📱 Simüle edilen cihaz: ${deviceName}`, 'info', currentIP);
        
        // Chromium headless ile gerçek tarayıcı davranışı
        const chromiumScript = `
            const puppeteer = require('puppeteer');
            (async () => {
                const browser = await puppeteer.launch({
                    headless: true,
                    executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser',
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--mobile-emulation',
                        '--user-agent=${ua}'
                    ]
                });
                
                const page = await browser.newPage();
                await page.setViewport({ width: 375, height: 667, isMobile: true });
                
                // 1. Google'a git
                await page.goto('${searchUrl}', { waitUntil: 'networkidle0' });
                
                // 2. İnsan gibi scroll davranışı
                await page.evaluate(() => {
                    return new Promise(resolve => {
                        let scrolls = 0;
                        const maxScrolls = 3 + Math.floor(Math.random() * 3);
                        const scrollInterval = setInterval(() => {
                            window.scrollBy(0, 200 + Math.random() * 300);
                            scrolls++;
                            if (scrolls >= maxScrolls) {
                                clearInterval(scrollInterval);
                                resolve();
                            }
                        }, 800 + Math.random() * 1200);
                    });
                });
                
                // 3. Hedef domain'i ara
                const links = await page.$$eval('a', (anchors, domain) => {
                    return anchors
                        .filter(a => a.href && a.href.includes(domain))
                        .map(a => ({ href: a.href, text: a.textContent }));
                }, '${siteDomain}');
                
                if (links.length > 0) {
                    // 4. Rastgele link seç ve tıkla
                    const targetLink = links[Math.floor(Math.random() * links.length)];
                    
                    // 5. İnsan gibi bekleme
                    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
                    
                    // 6. Hedef siteye git
                    await page.goto(targetLink.href, { waitUntil: 'networkidle0' });
                    
                    // 7. SEO BOOSTER: Gerçek Engagement Davranışları
                    const seoMetrics = await page.evaluate(() => {
                        return new Promise(resolve => {
                            let metrics = { scrollDepth: 0, clicks: 0, dwellTime: 0, interactions: 0 };
                            let startTime = Date.now();
                            let maxScroll = 0;
                            
                            // A) SCROLL DEPTH TRACKING
                            function trackScrollDepth() {
                                const scrolled = window.scrollY;
                                const maxHeight = document.body.scrollHeight - window.innerHeight;
                                const scrollPercent = Math.min(100, (scrolled / maxHeight) * 100);
                                maxScroll = Math.max(maxScroll, scrollPercent);
                                metrics.scrollDepth = maxScroll;
                            }
                            
                            // B) REALISTIC SCROLL PATTERN
                            let scrolls = 0;
                            const maxScrolls = 4 + Math.floor(Math.random() * 6); // 4-10 scroll
                            const scrollInterval = setInterval(() => {
                                // Varyasyonlu scroll miktarları
                                const scrollAmount = 200 + Math.random() * 400;
                                window.scrollBy(0, scrollAmount);
                                trackScrollDepth();
                                scrolls++;
                                
                                // C) LINK CLICKING SIMULATION
                                if (scrolls % 3 === 0 && Math.random() < 0.4) {
                                    const links = document.querySelectorAll('a[href*="${siteDomain}"]');
                                    if (links.length > 0) {
                                        const randomLink = links[Math.floor(Math.random() * links.length)];
                                        randomLink.click();
                                        metrics.clicks++;
                                        console.log('INTERNAL_CLICK:' + randomLink.href);
                                    }
                                }
                                
                                // D) INPUT FOCUS SIMULATION
                                if (scrolls % 4 === 0 && Math.random() < 0.3) {
                                    const inputs = document.querySelectorAll('input, textarea, select');
                                    if (inputs.length > 0) {
                                        const randomInput = inputs[Math.floor(Math.random() * inputs.length)];
                                        randomInput.focus();
                                        setTimeout(() => randomInput.blur(), 1000 + Math.random() * 2000);
                                        metrics.interactions++;
                                    }
                                }
                                
                                if (scrolls >= maxScrolls) {
                                    clearInterval(scrollInterval);
                                    
                                    // E) EXTENDED DWELL TIME (SEO Critical)
                                    const dwellTimeMs = 15000 + Math.random() * 25000; // 15-40 saniye
                                    setTimeout(() => {
                                        metrics.dwellTime = Date.now() - startTime;
                                        resolve(metrics);
                                    }, dwellTimeMs);
                                }
                            }, 1200 + Math.random() * 2000); // Daha yavaş scroll
                        });
                    });
                    
                    // F) ADDITIONAL PAGE INTERACTIONS
                    await page.evaluate(() => {
                        // Hover effects simulation
                        const hoverElements = document.querySelectorAll('button, .btn, [role="button"]');
                        if (hoverElements.length > 0) {
                            const randomElement = hoverElements[Math.floor(Math.random() * hoverElements.length)];
                            randomElement.dispatchEvent(new MouseEvent('mouseover'));
                            setTimeout(() => {
                                randomElement.dispatchEvent(new MouseEvent('mouseout'));
                            }, 2000);
                        }
                        
                        // Menu interactions
                        const menuItems = document.querySelectorAll('nav a, .menu a, .navbar a');
                        if (menuItems.length > 0 && Math.random() < 0.3) {
                            const randomMenu = menuItems[Math.floor(Math.random() * menuItems.length)];
                            randomMenu.dispatchEvent(new MouseEvent('mouseover'));
                        }
                    });
                    
                    console.log('SEO_METRICS:' + JSON.stringify(seoMetrics));
                    
                    console.log('SUCCESS:' + targetLink.href);
                    console.log('CTR_BOOST:COMPLETED');
                } else {
                    console.log('NOT_FOUND:${siteDomain}');
                }
                
                await browser.close();
            })().catch(console.error);
        `;
        
        // Chromium script'i çalıştır
        const { stdout } = await execAsync(`node -e "${chromiumScript.replace(/"/g, '\\"')}"`).catch(() => ({ stdout: 'NOT_FOUND' }));
        
        if (stdout.includes('SUCCESS:')) {
            const visitedUrl = stdout.split('SUCCESS:')[1].trim();
            
            // SEO Metrics extraction
            if (stdout.includes('SEO_METRICS:')) {
                const metricsJson = stdout.split('SEO_METRICS:')[1].split('\n')[0];
                try {
                    const metrics = JSON.parse(metricsJson);
                    sendLogToDashboard(`📈 Scroll Depth: ${Math.round(metrics.scrollDepth)}%`, 'success', currentIP);
                    sendLogToDashboard(`🔗 İç Link Tıklama: ${metrics.clicks} adet`, 'success', currentIP);
                    sendLogToDashboard(`⏱️ Dwell Time: ${Math.round(metrics.dwellTime/1000)} saniye`, 'success', currentIP);
                    sendLogToDashboard(`🎯 Etkileşim: ${metrics.interactions} input focus`, 'success', currentIP);
                } catch (e) {
                    // Metrics parse error, continue
                }
            }
            
            if (stdout.includes('CTR_BOOST:COMPLETED')) {
                sendLogToDashboard(`🚀 SEO Boost Tamamlandı - CTR Artırıldı`, 'success', currentIP);
            }
            
            sendLogToDashboard(`🎯 Hedef bulundu ve ziyaret edildi`, 'success', currentIP);
            sendLogToDashboard(`✅ Gerçekçi davranış tamamlandı: ${visitedUrl}`, 'success', currentIP);
            return true;
        } else {
            sendLogToDashboard(`❌ ${siteDomain} bulunamadı (Chromium tarama)`, 'error', currentIP);
            return false;
        }trim();
            sendLogToDashboard(`🎯 Hedef bulundu ve ziyaret edildi`, 'success', currentIP);
            sendLogToDashboard(`✅ Gerçekçi davranış tamamlandı: ${visitedUrl}`, 'success', currentIP);
            return true;
        } else {
            sendLogToDashboard(`❌ ${siteDomain} bulunamadı (Chromium tarama)`, 'error', currentIP);
            return false;
        }
        
    } catch (error) {
        console.error('Chromium AI error:', error);
        sendLogToDashboard(`❌ AI Davranış hatası: ${error.message}`, 'error', currentIP);
        return false;
    }
}

// Noise Actions - Gerçek kullanıcı çeşitliliği
async function performNoiseAction(action, keyword) {
    sendLogToDashboard(`🎭 Noise Action: ${action}`, 'info', currentIP);
    
    switch (action) {
        case 'search_only':
            // Sadece arama yap, hiçbir yere tıklama
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
            await execAsync(`curl -s "${searchUrl}" > /dev/null`);
            await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 5000));
            sendLogToDashboard(`🔍 Sadece arama yapıldı, tıklama yok`, 'info', currentIP);
            return false;
            
        case 'wrong_search':
            // Yanlış/alakasız kelime ara
            const wrongKeywords = ['hava durumu', 'yemek tarifleri', 'haberler', 'oyunlar'];
            const wrongKeyword = wrongKeywords[Math.floor(Math.random() * wrongKeywords.length)];
            const wrongUrl = `https://www.google.com/search?q=${encodeURIComponent(wrongKeyword)}`;
            await execAsync(`curl -s "${wrongUrl}" > /dev/null`);
            sendLogToDashboard(`🤷 Yanlış arama: "${wrongKeyword}"`, 'info', currentIP);
            return false;
            
        case 'google_only':
            // Sadece Google ana sayfasına gir çık
            await execAsync(`curl -s "https://www.google.com" > /dev/null`);
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
            sendLogToDashboard(`🏠 Sadece Google ana sayfa ziyareti`, 'info', currentIP);
            return false;
            
        case 'random_click':
            // Rastgele başka bir siteye tıkla
            const randomSites = ['https://www.hurriyet.com.tr', 'https://www.sabah.com.tr', 'https://www.ntv.com.tr'];
            const randomSite = randomSites[Math.floor(Math.random() * randomSites.length)];
            await execAsync(`curl -s "${randomSite}" > /dev/null`);
            sendLogToDashboard(`🎲 Rastgele site ziyareti: ${randomSite}`, 'info', currentIP);
            return false;
            
        default:
            return await performRealisticGoogleSearch(keyword);
    }
}

// Ana trafik üretimi - SIRALI
async function generateMobileTraffic() {
    if (!botRunning || isProcessing) return;
    
    isProcessing = true; // İşlem başladı
    
    if (TOTAL_VISIT_LIMIT > 0 && visitCount >= TOTAL_VISIT_LIMIT) {
        console.log(`🏁 Ziyaret limiti ulaşıldı: ${TOTAL_VISIT_LIMIT}`);
        stopBot();
        isProcessing = false;
        return;
    }
    
    visitCount++;
    
    // HER ZİYARET ÖNCESINDE IP DEĞİŞTİR
    console.log(`🔄 IP rotasyonu başlatılıyor... (#${visitCount})`);
    sendLogToDashboard(`🔄 Mobil veri rotasyonu (#${visitCount})`, 'info', currentIP);
    
    await rotateMobileData(); // IP değiştir ve bekle
    
    // Basit bağlantı kontrolü
    console.log(`⏳ İnternet bağlantısı kontrol ediliyor...`);
    sendLogToDashboard(`⏳ İnternet bağlantısı bekleniyor...`, 'info', currentIP);
    
    // Sadece IP alabiliyorsak bağlantı var demektir
    const testIP = await getCurrentMobileIP();
    if (testIP === 'Unknown') {
        console.log(`❌ İnternet bağlantısı yok`);
        sendLogToDashboard(`❌ İnternet bağlantısı kurulamadı`, 'error', currentIP);
        isProcessing = false;
        return;
    }
    
    console.log(`✅ İnternet bağlantısı hazır`);
    sendLogToDashboard(`✅ İnternet bağlantısı hazır`, 'success', testIP);
    
    const newIP = await getCurrentMobileIP();
    console.log(`🌐 Yeni IP: ${newIP}`);
    sendLogToDashboard(`🌐 Yeni IP alındı: ${newIP}`, 'success', newIP);
    currentIP = newIP;
    
    console.log(`🚀 Mobil ziyaret #${visitCount} başlatılıyor...`);
    
    // İstatistikleri güncelle
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'stats',
                data: { visitCount, successCount, errorCount, botRunning: true }
            }));
        }
    });

    try {
        currentIP = await getCurrentMobileIP();
        console.log(`🌐 Kullanılan IP: ${currentIP}`);
        
        const keyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
        const visitSuccess = await performRealisticGoogleSearch(keyword);
        
        if (visitSuccess) {
            successCount++;
            console.log(`✅ Mobil ziyaret #${visitCount} başarılı`);
            sendLogToDashboard(`✅ Ziyaret #${visitCount} başarılı`, 'success', currentIP);
        } else {
            errorCount++;
            console.log(`❌ Mobil ziyaret #${visitCount} başarısız`);
            sendLogToDashboard(`❌ Ziyaret #${visitCount} başarısız`, 'error', currentIP);
        }

    } catch (error) {
        errorCount++;
        console.log(`❌ Ziyaret #${visitCount} hatası: ${error.message}`);
        sendLogToDashboard(`❌ Ziyaret hatası: ${error.message}`, 'error', currentIP);
    }
    
    isProcessing = false; // İşlem bitti
}

// SIRALI bot çalıştırma
async function runSequentialTraffic() {
    while (botRunning) {
        await generateMobileTraffic();
        
        if (botRunning) {
            // Random delay - gerçek kullanıcı gibi
            const randomDelay = DELAY_BETWEEN_VISITS + (Math.random() * 10000); // +0-10 saniye
            console.log(`⏱️ ${Math.round(randomDelay/1000)} saniye bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, randomDelay));
        }
    }
}

// Bot kontrol fonksiyonları
function startBot() {
    if (botRunning) return;
    
    botRunning = true;
    startTime = Date.now();
    visitCount = 0;
    successCount = 0;
    errorCount = 0;
    
    console.log('📱 Mobile SEO Bot başlatıldı (Sıralı İşlem)');
    sendLogToDashboard('📱 Mobile SEO Bot başlatıldı (Sıralı İşlem)', 'success');
    
    runSequentialTraffic(); // Sıralı çalıştır
}

function stopBot() {
    if (!botRunning) return;
    
    botRunning = false;
    
    console.log('🛑 Mobile SEO Bot durduruldu');
    sendLogToDashboard('🛑 Mobile SEO Bot durduruldu', 'error');
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'stats',
                data: { visitCount, successCount, errorCount, botRunning: false }
            }));
        }
    });
}

// WebSocket bağlantı yöneticisi
wss.on('connection', (ws) => {
    console.log('📱 Mobile Dashboard bağlandı');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.action) {
                case 'start':
                    startBot();
                    break;
                case 'stop':
                    stopBot();
                    break;
                case 'config':
                    TARGET_URL = data.targetUrl || TARGET_URL;
                    SEARCH_KEYWORDS = data.keywords || SEARCH_KEYWORDS;
                    VISITS_PER_MINUTE = data.visitsPerMinute || VISITS_PER_MINUTE;
                    IP_ROTATION_INTERVAL = data.ipRotation || IP_ROTATION_INTERVAL;
                    TOTAL_VISIT_LIMIT = data.totalVisitLimit || 0;
                    DELAY_BETWEEN_VISITS = 60000 / VISITS_PER_MINUTE;
                    console.log(`⚙️ Mobil bot ayarları güncellendi`);
                    break;
            }
            
            ws.send(JSON.stringify({
                type: 'stats',
                data: { visitCount, successCount, errorCount, botRunning }
            }));
            
        } catch (error) {
            console.log('❌ WebSocket hatası:', error.message);
        }
    });
});

console.log('📱 Mobile SEO Bot - HTTP Only (Sıralı İşlem)');
console.log('🔄 Mobil veri rotasyonu ile IP değiştirme');
console.log('📱 Dashboard: mobile_dashboard.html');
console.log('✅ Mobil bot hazır...');
