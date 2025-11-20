// Mobile Data Rotation Module for Android
const { exec } = require('child_process');

async function rotateMobileData() {
    return new Promise((resolve) => {
        console.log('✈️ Uçak modu açılıyor...');
        
        exec('su -c "settings put global airplane_mode_on 1"', (error) => {
            if (error) {
                console.log('⚠️ Root erişimi gerekli');
                resolve();
                return;
            }
            
            exec('su -c "am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true"');
            
            setTimeout(() => {
                console.log('📱 Uçak modu kapatılıyor...');
                
                exec('su -c "settings put global airplane_mode_on 0"', () => {
                    exec('su -c "am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false"');
                    
                    setTimeout(() => {
                        console.log('🌐 Yeni IP alındı');
                        resolve();
                    }, 8000);
                });
            }, 4000);
        });
    });
}

async function getCurrentMobileIP() {
    return new Promise((resolve) => {
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

module.exports = { rotateMobileData, getCurrentMobileIP };