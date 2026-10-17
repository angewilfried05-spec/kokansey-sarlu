package com.kokansey.app.vm

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kokansey.app.data.Repository
import com.kokansey.app.data.UserDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class AuthState(
    val loading: Boolean = false,
    val error: String? = null,
    val user: UserDto? = null
)

class AuthViewModel(private val repo: Repository) : ViewModel() {

    private val _state = MutableStateFlow(AuthState(user = repo.session.user))
    val state: StateFlow<AuthState> = _state

    init {
        if (repo.session.isLoggedIn) {
            _state.value = _state.value.copy(user = repo.session.user)
        }
    }

    fun login(username: String, password: String) {
        if (username.isBlank() || password.isBlank()) {
            _state.value = _state.value.copy(error = "Nom d'utilisateur et mot de passe requis")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            repo.login(username.trim(), password)
                .onSuccess { user ->
                    _state.value = AuthState(user = user)
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(
                        loading = false,
                        error = e.message ?: "Impossible de joindre le serveur"
                    )
                }
        }
    }

    fun logout() {
        repo.session.clear()
        _state.value = AuthState()
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
}
