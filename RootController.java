package com.nexabot.trendyolbot;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import java.io.DataOutputStream;

public class RootController {
    
    private Context context;
    private Handler handler;
    
    public RootController(Context context) {
        this.context = context;
        this.handler = new Handler(Looper.getMainLooper());
    }
    
    public void toggleAirplaneMode(boolean enable) {
        new Thread(() -> {
            try {
                Process su = Runtime.getRuntime().exec("su");
                DataOutputStream os = new DataOutputStream(su.getOutputStream());
                
                // Uçak modu ayarını değiştir
                String modeValue = enable ? "1" : "0";
                os.writeBytes("settings put global airplane_mode_on " + modeValue + "\n");
                
                // Broadcast gönder
                os.writeBytes("am broadcast -a android.intent.action.AIRPLANE_MODE --ez state " + enable + "\n");
                
                // Notification panel aç/kapat (yukarı çek/aşağı it)
                if (enable) {
                    os.writeBytes("cmd statusbar expand-notifications\n");
                } else {
                    os.writeBytes("cmd statusbar collapse\n");
                }
                
                os.writeBytes("exit\n");
                os.flush();
                
                int result = su.waitFor();
                
                handler.post(() -> {
                    if (result == 0) {
                        sendResult(true, enable ? "ON" : "OFF");
                    } else {
                        sendResult(false, enable ? "ON" : "OFF");
                    }
                });
                
            } catch (Exception e) {
                handler.post(() -> sendResult(false, enable ? "ON" : "OFF"));
            }
        }).start();
    }
    
    private void sendResult(boolean success, String mode) {
        Intent intent = new Intent("ROOT_RESULT");
        intent.putExtra("success", success);
        intent.putExtra("mode", mode);
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
    }
}