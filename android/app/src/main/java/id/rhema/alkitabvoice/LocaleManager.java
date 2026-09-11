package id.rhema.alkitabvoice;

import java.util.Locale;
import java.util.TimeZone;

/**
 * Deteksi locale/timezone sistem Android — setara LocaleManager Kotlin.
 * Global mode = true → KJV + English AI; false → TB + Indonesian AI.
 */
public final class LocaleManager {

    private LocaleManager() {}

    /** @return true jika mode Global (di luar Indonesia) */
    public static boolean shouldEnableGlobalMode() {
        String deviceLanguage = Locale.getDefault().getLanguage();
        String deviceTimezoneId = TimeZone.getDefault().getID();

        boolean isIndonesianLocale =
                "in".equals(deviceLanguage)
                        || "id".equals(deviceLanguage)
                        || deviceTimezoneId.contains("Jakarta")
                        || deviceTimezoneId.contains("Makassar")
                        || deviceTimezoneId.contains("Jayapura")
                        || deviceTimezoneId.contains("Pontianak");

        return !isIndonesianLocale;
    }

    public static String getDeviceLanguageTag() {
        Locale locale = Locale.getDefault();
        if (locale.getCountry() != null && !locale.getCountry().isEmpty()) {
            return locale.getLanguage() + "-" + locale.getCountry();
        }
        return locale.getLanguage();
    }

    public static String getDeviceTimezoneId() {
        return TimeZone.getDefault().getID();
    }
}
