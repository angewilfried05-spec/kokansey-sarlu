package com.kokansey.app.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.serialization.json.Json

class SessionManager(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("kokansey_session", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }

    var token: String?
        get() = prefs.getString("token", null)
        private set(value) = prefs.edit().putString("token", value).apply()

    var user: UserDto? = null
        private set

    val isLoggedIn: Boolean get() = token != null

    init {
        prefs.getString("user", null)?.let {
            user = runCatching { json.decodeFromString<UserDto>(it) }.getOrNull()
        }
    }

    fun saveSession(token: String, user: UserDto) {
        this.token = token
        this.user = user
        prefs.edit()
            .putString("token", token)
            .putString("user", json.encodeToString(UserDto.serializer(), user))
            .apply()
    }

    fun clear() {
        token = null
        user = null
        prefs.edit().clear().apply()
    }
}
