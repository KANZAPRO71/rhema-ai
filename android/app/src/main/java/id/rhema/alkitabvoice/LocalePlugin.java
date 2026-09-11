package id.rhema.alkitabvoice;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DeviceLocale")
public class LocalePlugin extends Plugin {

    @PluginMethod
    public void getBootHints(PluginCall call) {
        boolean global = LocaleManager.shouldEnableGlobalMode();
        JSObject ret = new JSObject();
        ret.put("language", LocaleManager.getDeviceLanguageTag());
        ret.put("timezone", LocaleManager.getDeviceTimezoneId());
        ret.put("suggestGlobal", global);
        ret.put("suggestRegion", global ? "global" : "indonesia");
        call.resolve(ret);
    }
}
