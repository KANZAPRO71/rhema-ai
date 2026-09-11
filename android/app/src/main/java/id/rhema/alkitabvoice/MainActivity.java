package id.rhema.alkitabvoice;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MicPermissionPlugin.class);
        registerPlugin(GeminiLivePlugin.class);
        registerPlugin(SecureKeyPlugin.class);
        registerPlugin(LocalePlugin.class);
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
    }
}
