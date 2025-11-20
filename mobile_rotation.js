// Mobile Data Rotation Module for Android
const { exec } = require('child_process');

async function rotateMobileData() {
    return new Promise((resolve) => {
        console.log('✈️ Uçak modu açılıyor...');
        
        // Uçak modunu aç
        exec('su -c "settings put global airplane_mode_on 1"', (error) => {
            if (error) {
                console.log('⚠️ Root erişimi gerekli');
                resolve();
                return;
            }
            
            // Uçak modu broadcast
            exec('su -c "am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true"');
            
            setTimeout(() => {
                console.log('📱 Uçak modu kapatılıyor...');
                
                // Uçak modunu kapat
                exec('su -c "settings put global airplane_mode_on 0"', () => {
                    exec('su -c "am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false"');
                    
                    setTimeout(() => {
                        console.log('🌐 Yeni IP alındı');
                        resolve();
                    }, 8000); // Uçak modu sonrası daha uzun bekle
                });
            }, 4000); // Uçak modunda daha uzun bekle
        });
    });
}

async function getCurrentMobileIP() {
    return new Promise((resolve) => {
        // Birkaç IP servisini dene
        const ipServices = [
            'curl -s ifconfig.me',
            'curl -s ipinfo.io/ip',
            'curl -s api.ipify.org'
        ];
        
        let tried = 0;
        
        function tryNext() {
            if (tried >= ipServices.length) {
                resolve('IP Unknown');
                return;
            }
            
            exec(ipServices[tried], (error, stdout) => {
                if (error || !stdout.trim()) {
                    tried++;
                    tryNext();
                } else {
                    resolve(stdout.trim());
                }
            });
        }
        
        tryNext();
    });
}

// Test fonksiyonu
async function testMobileRotation() {
    console.log('📱 Mobil rotasyon test ediliyor...');
    const oldIP = await getCurrentMobileIP();
    console.log(`🌐 Eski IP: ${oldIP}`);
    
    await rotateMobileData();
    
    const newIP = await getCurrentMobileIP();
    console.log(`🌐 Yeni IP: ${newIP}`);
    
    if (oldIP !== newIP) {
        console.log('✅ IP başarıyla değişti!');
    } else {
        console.log('⚠️ IP değişmedi, tekrar denenecek');
    }
}

module.exports = { rotateMobileData, getCurrentMobileIP, testMobileRotation };