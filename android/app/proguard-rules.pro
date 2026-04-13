# Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.wallet.ai.** { *; }
-dontwarn com.getcapacitor.**

# WebView JS interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep source file and line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
