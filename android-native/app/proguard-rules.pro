# Kotlinx serialization
-keepattributes Signature, InnerClasses, EnclosingMethod, RuntimeVisibleAnnotations, AnnotationDefault
-keepclassmembers,allowshrinking,allowobfuscation interface * { @retrofit2.http.* <methods>; }
-keep,includedescriptorclasses class com.kokansey.app.data.** { *; }
-keepclassmembers class com.kokansey.app.data.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn kotlinx.serialization.**
