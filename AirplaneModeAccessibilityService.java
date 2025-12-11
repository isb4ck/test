package com.nexabot.trendyolbot;

import android.accessibilityservice.AccessibilityService;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Handler;
import android.os.Looper;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import java.util.List;

public class AirplaneModeAccessibilityService extends AccessibilityService {
    
    private Handler handler;
    private boolean isProcessing = false;
    
    private BroadcastReceiver commandReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if ("AIRPLANE_MODE_COMMAND".equals(action)) {
                String mode = intent.getStringExtra("mode");
                toggleAirplaneMode("ON".equals(mode));
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        
        LocalBroadcastManager.getInstance(this)
            .registerReceiver(commandReceiver, new IntentFilter("AIRPLANE_MODE_COMMAND"));
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Event'leri dinle
    }

    @Override
    public void onInterrupt() {
        // Servis kesintiye uğradığında
    }
    
    private void toggleAirplaneMode(boolean enable) {
        if (isProcessing) return;
        isProcessing = true;
        
        // Quick Settings'i aç
        boolean opened = performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS);
        if (!opened) {
            sendResult(false, enable ? "ON" : "OFF");
            isProcessing = false;
            return;
        }
        
        // Tile'ı ara ve tıkla
        handler.postDelayed(() -> findAndClickAirplaneTile(enable), 1000);
    }
    
    private void findAndClickAirplaneTile(boolean enable) {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) {
            sendResult(false, enable ? "ON" : "OFF");
            isProcessing = false;
            return;
        }
        
        // Uçak modu tile'ını ara
        String[] searchTerms = {"Uçak modu", "Airplane mode", "Flight mode"};
        AccessibilityNodeInfo tileNode = null;
        
        for (String term : searchTerms) {
            List<AccessibilityNodeInfo> nodes = rootNode.findAccessibilityNodeInfosByText(term);
            if (!nodes.isEmpty()) {
                tileNode = nodes.get(0);
                break;
            }
        }
        
        if (tileNode != null && tileNode.isClickable()) {
            tileNode.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            handler.postDelayed(() -> {
                performGlobalAction(GLOBAL_ACTION_HOME);
                sendResult(true, enable ? "ON" : "OFF");
                isProcessing = false;
            }, 1000);
        } else {
            sendResult(false, enable ? "ON" : "OFF");
            isProcessing = false;
        }
        
        rootNode.recycle();
    }
    
    private void sendResult(boolean success, String mode) {
        Intent intent = new Intent("AIRPLANE_MODE_RESULT");
        intent.putExtra("success", success);
        intent.putExtra("mode", mode);
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        LocalBroadcastManager.getInstance(this).unregisterReceiver(commandReceiver);
    }
}