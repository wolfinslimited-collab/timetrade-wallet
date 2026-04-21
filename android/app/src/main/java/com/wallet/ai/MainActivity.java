package com.wallet.ai;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.capgo.capacitor.nativebiometric.NativeBiometric;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBiometric.class);
        super.onCreate(savedInstanceState);
    }
}
