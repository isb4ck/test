#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mobile SEO Bot - Otomatik Kurulum ve Başlatma
Termux için özel tasarlanmış
"""

import os
import sys
import subprocess
import time
import threading
import http.server
import socketserver
from pathlib import Path

class MobileBotSetup:
    def __init__(self):
        self.base_dir = Path.cwd()
        self.http_server = None
        self.http_thread = None
        
    def print_banner(self):
        print("""
╔══════════════════════════════════════╗
║        📱 MOBILE SEO BOT 2.0         ║
║     Otomatik Kurulum ve Başlatma     ║
║        Termux Özel Versiyonu         ║
╚══════════════════════════════════════╝
        """)
    
    def run_command(self, command, description):
        """Komut çalıştır ve sonucu göster"""
        print(f"🔄 {description}...")
        try:
            result = subprocess.run(command, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ {description} tamamlandı")
                return True
            else:
                print(f"❌ {description} başarısız: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ {description} hatası: {str(e)}")
            return False
    
    def check_termux(self):
        """Termux ortamını kontrol et"""
        print("🔍 Termux ortamı kontrol ediliyor...")
        if not os.path.exists('/data/data/com.termux'):
            print("❌ Bu script sadece Termux'ta çalışır!")
            return False
        print("✅ Termux ortamı tespit edildi")
        return True
    
    def update_packages(self):
        """Paket listesini güncelle"""
        commands = [
            ("pkg update -y", "Paket listesi güncelleniyor"),
            ("pkg upgrade -y", "Paketler yükseltiliyor")
        ]
        
        for cmd, desc in commands:
            if not self.run_command(cmd, desc):
                print("⚠️ Paket güncellemesi başarısız, devam ediliyor...")
    
    def install_dependencies(self):
        """Gerekli paketleri kur"""
        packages = [
            "nodejs", "npm", "git", "curl", "python", "termux-api"
        ]
        
        print("📦 Gerekli paketler kuruluyor...")
        for package in packages:
            self.run_command(f"pkg install -y {package}", f"{package} kuruluyor")
    
    def install_node_modules(self):
        """Node.js modüllerini kur"""
        print("📦 Node.js modülleri kuruluyor...")
        
        # package.json varsa npm install çalıştır
        if os.path.exists("package.json"):
            return self.run_command("npm install", "Node.js modülleri kuruluyor")
        else:
            # Manuel kurulum
            modules = ["axios", "cheerio", "ws"]
            for module in modules:
                self.run_command(f"npm install {module}", f"{module} kuruluyor")
            return True
    
    def setup_permissions(self):
        """Root izinlerini kontrol et"""
        print("🔐 Root izinleri kontrol ediliyor...")
        
        # Su komutunu test et
        result = subprocess.run("su -c 'echo test'", shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Root erişimi mevcut")
            return True
        else:
            print("⚠️ Root erişimi yok - IP rotasyonu çalışmayabilir")
            return False
    
    def start_http_server(self, port=8093):
        """HTTP server başlat"""
        try:
            os.chdir(self.base_dir)
            handler = http.server.SimpleHTTPRequestHandler
            self.http_server = socketserver.TCPServer(("", port), handler)
            
            def serve():
                print(f"🌐 HTTP Server başlatıldı: http://localhost:{port}")
                self.http_server.serve_forever()
            
            self.http_thread = threading.Thread(target=serve, daemon=True)
            self.http_thread.start()
            return port
        except Exception as e:
            print(f"❌ HTTP server hatası: {str(e)}")
            return None
    
    def start_mobile_bot(self):
        """Mobile bot'u başlat"""
        print("🤖 Mobile SEO Bot başlatılıyor...")
        
        if not os.path.exists("mobile_bot.js"):
            print("❌ mobile_bot.js bulunamadı!")
            return False
        
        try:
            # Bot'u arka planda başlat
            subprocess.Popen(["node", "mobile_bot.js"], 
                           stdout=subprocess.PIPE, 
                           stderr=subprocess.PIPE)
            print("✅ Mobile SEO Bot başlatıldı")
            return True
        except Exception as e:
            print(f"❌ Bot başlatma hatası: {str(e)}")
            return False
    
    def show_instructions(self, http_port):
        """Kullanım talimatlarını göster"""
        print(f"""
╔══════════════════════════════════════╗
║            🎉 KURULUM TAMAM!         ║
╚══════════════════════════════════════╝

📱 Dashboard Adresi:
   http://localhost:{http_port}/mobile_dashboard.html

🔧 Kontrol Paneli:
   • Hedef URL'i girin
   • Anahtar kelimeleri ekleyin  
   • Ziyaret hızını ayarlayın
   • IP rotasyon aralığını seçin
   • "Botu Başlat" butonuna basın

⚡ Özellikler:
   ✅ HTTP-Only (Puppeteer gerektirmez)
   ✅ Sıralı işlem (IP rotasyonu güvenli)
   ✅ Mobil veri rotasyonu
   ✅ Google arama trafiği
   ✅ Gerçek zamanlı istatistikler

🔄 Bot Durumu:
   • Bot çalışıyor: Terminal'de logları görebilirsiniz
   • Dashboard: Tarayıcıda yukarıdaki adresi açın
   • Durdurma: Terminal'de Ctrl+C

⚠️ Önemli Notlar:
   • Root erişimi IP rotasyonu için gerekli
   • Her ziyaret tamamlanmadan sonrakine geçmez
   • Güvenli hız ayarları kullanın (5-10/dakika)

🚀 Bot başarıyla çalışıyor!
        """)
    
    def cleanup(self):
        """Temizlik işlemleri"""
        if self.http_server:
            self.http_server.shutdown()
        print("\n🧹 Temizlik tamamlandı")
    
    def run(self):
        """Ana kurulum sürecini çalıştır"""
        try:
            self.print_banner()
            
            # Termux kontrolü
            if not self.check_termux():
                return False
            
            # Paket güncellemeleri
            self.update_packages()
            
            # Bağımlılıkları kur
            self.install_dependencies()
            
            # Node modüllerini kur
            self.install_node_modules()
            
            # Root izinlerini kontrol et
            self.setup_permissions()
            
            # HTTP server başlat
            http_port = self.start_http_server()
            if not http_port:
                print("❌ HTTP server başlatılamadı")
                return False
            
            # Mobile bot'u başlat
            if not self.start_mobile_bot():
                return False
            
            # Talimatları göster
            self.show_instructions(http_port)
            
            # Sürekli çalışmaya devam et
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\n🛑 Kurulum sonlandırılıyor...")
                self.cleanup()
                return True
                
        except Exception as e:
            print(f"❌ Kurulum hatası: {str(e)}")
            return False

if __name__ == "__main__":
    setup = MobileBotSetup()
    success = setup.run()
    sys.exit(0 if success else 1)