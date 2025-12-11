package com.nexabot.trendyolbot;

import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.wifi.WifiManager;
import android.os.Handler;
import android.os.Looper;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

public class NetworkController {
    
    private Context context;
    private Handler handler;
    private ConnectivityManager connectivityManager;
    private WifiManager wifiManager;
    private NetworkCallback networkCallback;
    private boolean isWaitingForDisconnect = false;
    private boolean isWaitingForConnect = false;
    
    public NetworkController(Context context) {
        this.context = context;
        this.handler = new Handler(Looper.getMainLooper());
        this.connectivityManager = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        this.wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        setupNetworkCallback();
    }
    
    private void setupNetworkCallback() {
        networkCallback = new NetworkCallback();
        NetworkRequest.Builder builder = new NetworkRequest.Builder();
        connectivityManager.registerNetworkCallback(builder.build(), networkCallback);
    }
    
    public void disconnectNetwork() {
        isWaitingForDisconnect = true;
        isWaitingForConnect = false;
        
        // WiFi'yi kapat
        boolean success = wifiManager.setWifiEnabled(false);
        
        if (!success) {
            // Manuel müdahale iste
            requestManualAction(false);
            return;
        }
        
        // 10 saniye timeout
        handler.postDelayed(() -> {
            if (isWaitingForDisconnect) {
                isWaitingForDisconnect = false;
                sendResult(false, "DISCONNECT_TIMEOUT");
            }
        }, 10000);
    }
    
    public void reconnectNetwork() {
        isWaitingForConnect = true;
        isWaitingForDisconnect = false;
        
        // WiFi'yi aç
        boolean success = wifiManager.setWifiEnabled(true);
        
        if (!success) {
            // Manuel müdahale iste
            requestManualAction(true);
            return;
        }
        
        // 15 saniye timeout (bağlanma daha uzun sürebilir)
        handler.postDelayed(() -> {
            if (isWaitingForConnect) {
                isWaitingForConnect = false;
                sendResult(false, "CONNECT_TIMEOUT");
            }
        }, 15000);
    }
    
    private void requestManualAction(boolean enable) {
        Intent intent = new Intent("MANUAL_NETWORK_REQUEST");
        intent.putExtra("enable", enable);
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
    }
    
    private void sendResult(boolean success, String mode) {
        Intent intent = new Intent("NETWORK_RESULT");
        intent.putExtra("success", success);
        intent.putExtra("mode", mode);
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
    }
    
    public boolean hasInternetConnection() {
        Network activeNetwork = connectivityManager.getActiveNetwork();
        if (activeNetwork == null) return false;
        
        NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(activeNetwork);
        return capabilities != null && 
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }
    
    public void cleanup() {
        if (networkCallback != null) {
            connectivityManager.unregisterNetworkCallback(networkCallback);
        }
    }
    
    private class NetworkCallback extends ConnectivityManager.NetworkCallback {
        
        @Override
        public void onAvailable(Network network) {
            handler.post(() -> {
                if (isWaitingForConnect) {
                    // Ağ bağlandı, internet erişimi var mı kontrol et
                    handler.postDelayed(() -> {
                        if (hasInternetConnection()) {
                            isWaitingForConnect = false;
                            sendResult(true, "CONNECTED");
                        }
                    }, 2000); // 2 saniye bekle internet erişimi için
                }
            });
        }
        
        @Override
        public void onLost(Network network) {
            handler.post(() -> {
                if (isWaitingForDisconnect) {
                    // Ağ kesildi, gerçekten internet yok mu kontrol et
                    handler.postDelayed(() -> {
                        if (!hasInternetConnection()) {
                            isWaitingForDisconnect = false;
                            sendResult(true, "DISCONNECTED");
                        }
                    }, 1000); // 1 saniye bekle tam kesinti için
                }
            });
        }
        
        @Override
        public void onCapabilitiesChanged(Network network, NetworkCapabilities networkCapabilities) {
            handler.post(() -> {
                boolean hasInternet = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                                    networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
                
                if (isWaitingForConnect && hasInternet) {
                    isWaitingForConnect = false;
                    sendResult(true, "CONNECTED");
                } else if (isWaitingForDisconnect && !hasInternet) {
                    isWaitingForDisconnect = false;
                    sendResult(true, "DISCONNECTED");
                }
            });
        }
    }
}