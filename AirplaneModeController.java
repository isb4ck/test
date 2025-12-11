package com.nexabot.trendyolbot;

import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.os.Handler;
import android.os.Looper;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

public class AirplaneModeController {
    
    private Context context;
    private Handler handler;
    
    public AirplaneModeController(Context context) {
        this.context = context;
        this.handler = new Handler(Looper.getMainLooper());
    }
    
    public void toggleAirplaneMode(boolean enable) {
        // Strateji 1: Root komutları dene
        if (tryRootCommand(enable)) {
            sendResult(true, enable ? "ON" : "OFF");
            return;
        }
        
        // Strateji 2: Sistem ayarları dene (ADB izni gerekli)
        if (trySystemSettings(enable)) {
            sendResult(true, enable ? "ON" : "OFF");
            return;
        }
        
        // Strateji 3: Manuel kullanıcı müdahalesi iste
        requestManualToggle(enable);
    }
    
    private boolean tryRootCommand(boolean enable) {
        try {
            String command = "settings put global airplane_mode_on " + (enable ? "1" : "0");
            Process process = Runtime.getRuntime().exec(new String[]{"su", "-c", command});
            int result = process.waitFor();
            
            if (result == 0) {
                // Broadcast gönder
                String broadcastCmd = "am broadcast -a android.intent.action.AIRPLANE_MODE --ez state " + enable;
                Runtime.getRuntime().exec(new String[]{"su", "-c", broadcastCmd});
                return true;
            }
        } catch (Exception e) {
            // Root yok veya hata
        }
        return false;
    }
    
    private boolean trySystemSettings(boolean enable) {
        try {
            // WRITE_SECURE_SETTINGS izni ile
            Settings.Global.putInt(context.getContentResolver(), 
                Settings.Global.AIRPLANE_MODE_ON, enable ? 1 : 0);
            
            // Broadcast gönder
            Intent intent = new Intent(Intent.ACTION_AIRPLANE_MODE_CHANGED);
            intent.putExtra("state", enable);
            context.sendBroadcast(intent);
            
            return true;
        } catch (SecurityException e) {
            // İzin yok
        }
        return false;
    }
    
    private void requestManualToggle(boolean enable) {
        // Kullanıcıdan manuel müdahale iste
        Intent intent = new Intent("MANUAL_AIRPLANE_REQUEST");
        intent.putExtra("enable", enable);
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
        
        // 15 saniye sonra timeout
        handler.postDelayed(() -> {
            sendResult(false, enable ? "ON" : "OFF");
        }, 15000);
    }
    
    private void sendResult(boolean success, String mode) {
        Intent intent = new Intent("AIRPLANE_MODE_RESULT");
        intent.putExtra("success", success);
        intent.putExtra("mode", mode);
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
    }
    
    // Manuel onay geldiğinde çağrılır
    public void confirmManualToggle(boolean enable) {
        sendResult(true, enable ? "ON" : "OFF");
    }
}