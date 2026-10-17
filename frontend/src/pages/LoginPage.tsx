import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, User, Sprout, TrendingUp, Package, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        navigate("/dashboard");
      } else {
        setError(data.message || "Identifiants incorrects");
      }
    } catch (err) {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0f172a]">
      {/* Panneau de marque — desktop uniquement */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        {/* Décor : dégradés + halos */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#123620] via-primary to-[#1e5a37]" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-[28rem] h-[28rem] rounded-full bg-white/5 blur-3xl" />
        {/* Grille discrète */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-black/20">
              <Sprout className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight leading-none">KOKANSEY</h1>
              <p className="text-[10px] text-secondary font-bold uppercase tracking-[0.25em] mt-1">SARLU · Management</p>
            </div>
          </div>

          {/* Pitch */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Pilotez votre exploitation<br />
                <span className="text-secondary">en toute confiance.</span>
              </h2>
              <p className="mt-4 text-white/60 text-lg font-medium max-w-md leading-relaxed">
                Cultures, stocks, ventes, finances et équipes — tout votre pilotage agricole et commercial au même endroit.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md">
              {[
                { icon: Sprout, label: "Cultures & Récoltes" },
                { icon: Package, label: "Stocks & Ventes" },
                { icon: TrendingUp, label: "Finance & Rapports" },
              ].map((f) => (
                <div
                  key={f.label}
                  className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center"
                >
                  <f.icon className="w-6 h-6 text-secondary mx-auto mb-2" />
                  <p className="text-[11px] font-bold text-white/80 leading-tight">{f.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/40 text-xs font-medium">
            © {new Date().getFullYear()} KOKANSEY SARLU — Plateforme de gestion interne
          </p>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md animate-in fade-in duration-500">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Sprout className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-primary dark:text-white tracking-tight leading-none">KOKANSEY</h1>
              <p className="text-[9px] text-secondary-dark font-bold uppercase tracking-[0.25em] mt-0.5">SARLU · Management</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-pop border border-gray-100 dark:border-slate-700 p-8 sm:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Connexion</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 font-medium">
                Accédez à votre espace de gestion
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-300 px-4 py-3 rounded-xl text-sm font-semibold animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="label">
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    id="username"
                    type="text"
                    required
                    autoComplete="username"
                    autoFocus
                    className="input pl-11"
                    placeholder="Votre identifiant"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="label">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="input pl-11 pr-12"
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base shadow-lg shadow-primary/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connexion en cours…
                  </>
                ) : (
                  "Se connecter"
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400 dark:text-slate-500 font-medium">
            Accès réservé au personnel autorisé de KOKANSEY SARLU
          </p>
        </div>
      </div>
    </div>
  );
}
