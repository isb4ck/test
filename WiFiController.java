package com.nexabot.trendyolbot;

import android.content.Context;
import android.content.Intent;
import android.net.wifi.WifiManager;
import android.os.Handler;
import android.os.Looper;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

public class WiFiController {
    
    private Context context;
    private Handler handler;
    private WifiManager wifiManager;
    
    public WiFiController(Context context) {
        this.context = context;
        this.handler = new Handler(Looper.getMainLooper());
        this.wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
    }
    
    public void toggleWiFi(boolean enable) {
        try {
            // WiFi durumunu kontrol et
            boolean currentState = wifiManager.isWifiEnabled();
            
            if (currentState == enable) {
                // Zaten istenen durumda
                sendResult(true, enable ? "ON" : "OFF");
                return;
            }
            
            // WiFi durumunu değiştir
            boolean success = wifiManager.setWifiEnabled(enable);
            
            if (success) {
                // Durum değişimini bekle
                waitForWiFiStateChange(enable);
            } else {
                // Manuel müdahale iste
                requestManualToggle(enable);
            }
            
        } catch (Exception e) {
            // Hata durumunda manuel müdahale
            requestManualToggle(enable);
        }
    }
    
    private void waitForWiFiStateChange(boolean expectedState) {
        // 5 saniye boyunca durum değişimini kontrol et
        handler.postDelayed(new Runnable() {
            int attempts = 0;
            
            @Override
            public void run() {
                attempts++;
                boolean currentState = wifiManager.isWifiEnabled();
                
                if (currentState == expectedState) {
                    // Başarılı
                    sendResult(true, expectedState ? "ON" : "OFF");
                } else if (attempts < 10) {
                    // 500ms sonra tekrar kontrol et
                    handler.postDelayed(this, 500);
                } else {
                    // Timeout - manuel müdahale
                    requestManualToggle(expectedState);
                }
            }
        }, 500);
    }
    
    private void requestManualToggle(boolean enable) {
        Intent intent = new Intent("MANUAL_WIFI_REQUEST");
        intent.putExtra("enable", enable);
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
        
        // 10 saniye timeout
        handler.postDelayed(() -> {
            sendResult(false, enable ? "ON" : "OFF");
        }, 10000);
    }
    
    private void sendResult(boolean success, String mode) {
        Intent intent = new Intent("WIFI_RESULT");
        intent.putExtra("success", success);
        intent.putExtra("mode", mode);
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
    }
    
    public void confirmManualToggle(boolean enable) {
        sendResult(true, enable ? "ON" : "OFF");
    }
    
    public boolean isWiFiEnabled() {
        return wifiManager.isWifiEnabled();
    }
}