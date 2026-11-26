package com.sami.tradingchallengetracker.util

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.UUID
import kotlin.concurrent.thread

object SamiPushStandbyHelper {
    const val PREFS_NAME = "salim_native_prefs"
    const val CHANNEL_ID = "sami_channel_messages_v2"
    const val DEFAULT_SERVER_URL = "https://ais-pre-puwra2x2ecorh5lpokb4yk-10636202368.europe-west3.run.app"

    fun ensureNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttrs = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                    .build()
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "رسائل وتنبيهات سالم",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "إشعارات الدردشة والتوصيات وتحديثات منصة Salim"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 200, 100, 200)
                    enableLights(true)
                    setShowBadge(true)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    setSound(soundUri, audioAttrs)
                }
                manager.createNotificationChannel(channel)
            } catch (_: Throwable) {}
        }
    }

    fun getOrCreateDeviceId(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = prefs.getString("device_id", null)
        if (!existing.isNullOrBlank()) return existing
        val generated = "and_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        prefs.edit().putString("device_id", generated).apply()
        return generated
    }

    fun getServerBase(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val saved = prefs.getString("remote_server_url", "")?.trim() ?: ""
        return if (saved.startsWith("https://")) saved.trimEnd('/') else DEFAULT_SERVER_URL
    }

    fun ensureFirebaseStandby(context: Context, onTokenReady: ((String) -> Unit)? = null) {
        ensureNotificationChannel(context)
        try {
            FirebaseMessaging.getInstance().isAutoInitEnabled = true
            FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                if (!token.isNullOrBlank()) {
                    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                        .edit()
                        .putString("fcm_token", token)
                        .apply()
                    syncTokenToServerInBackground(context.applicationContext, token)
                    onTokenReady?.invoke(token)
                }
            }
        } catch (_: Throwable) {}
    }

    fun syncTokenToServerInBackground(context: Context, rawToken: String?) {
        val token = rawToken?.trim().orEmpty()
        if (token.isEmpty()) return

        thread(isDaemon = true) {
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val userIdStr = prefs.getString("active_user_id", "")?.trim() ?: ""
                val userId = userIdStr.toLongOrNull() ?: 0L
                if (userId <= 0L) return@thread

                val username = prefs.getString("active_username", "")?.trim() ?: ""
                val authToken = prefs.getString("active_auth_token", "")?.trim() ?: ""
                val deviceId = getOrCreateDeviceId(context)
                val serverBase = getServerBase(context)
                val endpoint = "$serverBase/api/fcm/register"

                val sessionJson = JSONObject().apply {
                    put("id", userId)
                    put("username", username)
                    put("displayName", username)
                    put("role", if (userId == 1L) "owner" else "user")
                    put("isGuest", false)
                }.toString()

                val bodyJson = JSONObject().apply {
                    put("token", token)
                    put("deviceId", deviceId)
                    put("platform", "android")
                    put("deviceModel", "${Build.MANUFACTURER} ${Build.MODEL}".trim().take(100))
                }.toString()

                val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 12000
                    readTimeout = 12000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    setRequestProperty("x-sami-session", URLEncoder.encode(sessionJson, "UTF-8"))
                    if (authToken.isNotBlank()) {
                        setRequestProperty("Authorization", "Bearer $authToken")
                    }
                }

                OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
                    writer.write(bodyJson)
                    writer.flush()
                }
                conn.responseCode
                conn.disconnect()
            } catch (_: Throwable) {}
        }
    }
}
