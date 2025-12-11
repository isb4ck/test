package com.nexabot.trendyolbot;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.ServerSocket;
import java.net.Socket;

public class ADBController {
    
    private Context context;
    private Handler handler;
    private ServerSocket serverSocket;
    private boolean isListening = false;
    
    public ADBController(Context context) {
        this.context = context;
        this.handler = new Handler(Looper.getMainLooper());
        startADBListener();
    }
    
    private void startADBListener() {
        new Thread(() -> {
            try {
                serverSocket = new ServerSocket(8888);
                isListening = true;
                
                while (isListening) {
                    Socket client = serverSocket.accept();
                    handleADBCommand(client);
                }
            } catch (Exception e) {
                // Server hatası
            }
        }).start();
    }
    
    private void handleADBCommand(Socket client) {
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(client.getInputStream()));
            String command = reader.readLine();
            
            if ("AIRPLANE_ON".equals(command)) {
                handler.post(() -> sendResult(true, "ON"));
            } else if ("AIRPLANE_OFF".equals(command)) {
                handler.post(() -> sendResult(true, "OFF"));
            }
            
            client.close();
        } catch (Exception e) {
            // Komut hatası
        }
    }
    
    public void requestAirplaneMode(boolean enable) {
        // Bilgisayara komut gönderilmesini iste
        Intent intent = new Intent("ADB_COMMAND_REQUEST");
        intent.putExtra("command", enable ? "AIRPLANE_ON" : "AIRPLANE_OFF");
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
        
        // 15 saniye timeout
        handler.postDelayed(() -> {
            sendResult(false, enable ? "ON_TIMEOUT" : "OFF_TIMEOUT");
        }, 15000);
    }
    
    private void sendResult(boolean success, String mode) {
        Intent intent = new Intent("ADB_RESULT");
        intent.putExtra("success", success);
        intent.putExtra("mode", mode);
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
    }
    
    public void cleanup() {
        isListening = false;
        try {
            if (serverSocket != null) {
                serverSocket.close();
            }
        } catch (Exception e) {
            // Cleanup hatası
        }
    }
}