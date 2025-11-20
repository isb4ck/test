#!/bin/bash
# Mobile SEO Bot - Otomatik Kurulum

echo "📱 Mobile SEO Bot Kurulumu Başlatılıyor..."

# Repo güncelle
echo "🔄 Repo güncelleniyor..."
pkg update -y

# Gerekli paketleri kur
echo "📦 Gerekli paketler kuruluyor..."
pkg install -y nodejs npm git curl python x11-repo

# Chromium kur
echo "🌐 Chromium kuruluyor..."
pkg install -y chromium || pkg install -y firefox

# Node.js paketlerini kur
echo "📦 Node.js paketleri kuruluyor..."
npm install puppeteer@19.11.1 puppeteer-core@19.11.1 ws axios cheerio

# Chromium path'ini ayarla
echo "🔧 Chromium path ayarlanıyor..."
export PUPPETEER_EXECUTABLE_PATH=/data/data/com.termux/files/usr/bin/chromium
echo 'export PUPPETEER_EXECUTABLE_PATH=/data/data/com.termux/files/usr/bin/chromium' >> ~/.bashrc

# Alternatif Firefox path
if [ ! -f "/data/data/com.termux/files/usr/bin/chromium" ]; then
    export PUPPETEER_EXECUTABLE_PATH=/data/data/com.termux/files/usr/bin/firefox
    echo 'export PUPPETEER_EXECUTABLE_PATH=/data/data/com.termux/files/usr/bin/firefox' >> ~/.bashrc
fi

echo "✅ Kurulum tamamlandı!"
echo "📱 Bot'u başlatmak için: node mobile_bot.js"
echo "🌐 Dashboard: Chrome'da mobile_dashboard.html dosyasını aç"