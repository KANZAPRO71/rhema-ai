package id.rhema.alkitabvoice;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SecureKey")
public class SecureKeyPlugin extends Plugin {
    private static final String PREFS_FILE = "rhema_secure_keys";

    private SharedPreferences securePrefs() throws Exception {
        Context ctx = getContext();
        MasterKey masterKey = new MasterKey.Builder(ctx)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build();
        return EncryptedSharedPreferences.create(
                ctx,
                PREFS_FILE,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        );
    }

    @PluginMethod
    public void setItem(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value", "");
        if (key == null || key.isEmpty()) {
            call.reject("key wajib");
            return;
        }
        try {
            securePrefs().edit().putString(key, value).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Gagal menyimpan key terenkripsi: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getItem(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("key wajib");
            return;
        }
        try {
            String value = securePrefs().getString(key, "");
            JSObject ret = new JSObject();
            ret.put("value", value != null ? value : "");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal membaca key terenkripsi: " + e.getMessage());
        }
    }

    @PluginMethod
    public void removeItem(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("key wajib");
            return;
        }
        try {
            securePrefs().edit().remove(key).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Gagal menghapus key terenkripsi: " + e.getMessage());
        }
    }
}
