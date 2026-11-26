package com.sami.tradingchallengetracker.util

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.sami.tradingchallengetracker.MainActivity

class SamiFirebaseMessagingService : FirebaseMessagingService() {
    override fun onCreate() {
        super.onCreate()
        SamiPushStandbyHelper.ensureNotificationChannel(this)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        getSharedPreferences(SamiPushStandbyHelper.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString("fcm_token", token)
            .apply()
        SamiPushStandbyHelper.syncTokenToServerInBackground(applicationContext, token)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        try {
            val title = remoteMessage.notification?.title
                ?: remoteMessage.data["title"]
                ?: "Salim"
            val body = remoteMessage.notification?.body
                ?: remoteMessage.data["body"]
                ?: "لديك إشعار جديد"

            SamiPushStandbyHelper.ensureNotificationChannel(this)
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val chatType = remoteMessage.data["chatType"] ?: "channel"
            val channelId = remoteMessage.data["channelId"] ?: ""
            val partnerId = remoteMessage.data["partnerId"] ?: ""
            val senderId = remoteMessage.data["senderId"] ?: ""
            val messageId = remoteMessage.data["messageId"] ?: ""
            val senderName = remoteMessage.data["senderName"] ?: ""

            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("chatType", chatType)
                putExtra("channelId", channelId)
                putExtra("partnerId", partnerId)
                putExtra("senderId", senderId)
                putExtra("messageId", messageId)
                putExtra("senderName", senderName)
            }
            val reqCode = (messageId.ifBlank { System.currentTimeMillis().toString() }).hashCode()
            val pendingIntent = PendingIntent.getActivity(
                this,
                reqCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(this, SamiPushStandbyHelper.CHANNEL_ID)
                .setSmallIcon(applicationInfo.icon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent)
                .build()

            manager.notify(reqCode, notification)
        } catch (_: Throwable) {}
    }
}
