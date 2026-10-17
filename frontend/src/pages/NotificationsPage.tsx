import React, { useState, useEffect } from "react";
import { Bell, Smartphone, CheckCircle, XCircle, Loader2, QrCode, Send, RefreshCw, MessageSquare, LogOut } from "lucide-react";
import { fetchWithAuth } from "../lib/api";

export default function NotificationsPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testMessage, setTestMessage] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [relinking, setRelinking] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || 'GERANT';
    // Même logique de secours que les autres pages : KOKANSEY GROUP = ADMIN
    setUserRole(role === 'ADMIN' || user.username === 'KOKANSEY GROUP' ? 'ADMIN' : role);
    fetchStatus();
    // Actualiser le statut toutes les 5 secondes
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/whatsapp/status");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRelink = async () => {
    setRelinking(true);
    try {
      const res = await fetchWithAuth("/api/whatsapp/relink", { method: 'POST' });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRelinking(false);
    }
  };

  const handleEnsureQr = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/whatsapp/ensure-qr", { method: 'POST' });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone || !testMessage) return;
    setSendingTest(true);
    try {
      const res = await fetchWithAuth("/api/whatsapp/send", {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: testPhone, message: testMessage })
      });
      const data = await res.json();
      if (data.success) {
        alert("Message envoyé avec succès !");
        setTestMessage("");
      } else {
        alert("Erreur: " + (data.error || "Échec de l'envoi"));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi");
    } finally {
      setSendingTest(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Êtes-vous sûr de vouloir déconnecter WhatsApp ? Vous devrez rescanner le QR code pour vous reconnecter.")) return;
    setLoggingOut(true);
    try {
      const res = await fetchWithAuth("/api/whatsapp/logout", { method: 'POST' });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la déconnexion");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Notifications WhatsApp</h2>
          <p className="text-gray-500 font-medium">Connectez votre téléphone pour recevoir les alertes</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleEnsureQr}
            disabled={loading}
            className="bg-white text-primary border border-gray-200 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-primary/5 transition-all font-bold shadow-sm disabled:opacity-50"
          >
            <QrCode className="w-5 h-5" />
            Générer QR
          </button>
          {status?.isReady && (userRole === 'ADMIN' || userRole === 'GERANT') && (
            <button 
              onClick={handleLogout}
              disabled={loggingOut}
              className="bg-white text-red-600 border border-gray-200 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-red-50 transition-all font-bold shadow-sm disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              {loggingOut ? 'Déconnexion...' : 'Déconnecter'}
            </button>
          )}
          {userRole === 'ADMIN' && (
            <button 
              onClick={handleRelink}
              disabled={relinking}
              className="bg-white text-orange-600 border border-gray-200 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-orange-50 transition-all font-bold shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${relinking ? 'animate-spin' : ''}`} />
              Reconnecter
            </button>
          )}
          <button 
            onClick={fetchStatus}
            disabled={loading}
            className="bg-white text-primary border border-gray-200 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-primary/5 transition-all font-bold shadow-sm disabled:opacity-50"
          >
            <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Code Section */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
          <div className="mb-6 text-center">
            <Smartphone className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Scannez le QR Code</h3>
            <p className="text-gray-500">Ouvrez WhatsApp sur votre téléphone</p>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="w-12 h-12 text-gray-400 animate-spin mb-4" />
              <p className="text-gray-400 font-bold">Chargement...</p>
            </div>
          ) : status?.status === 'QRCODE' || status?.qrCodeData ? (
            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex flex-col items-center gap-4">
              <img 
                src={status.qrCodeData} 
                alt="QR Code WhatsApp" 
                className="rounded-lg"
                style={{ width: 256, height: 256 }}
              />
              <p className="text-sm text-gray-600 text-center font-medium">QR Code WhatsApp<br/>(scannez avec votre téléphone)</p>
            </div>
          ) : status?.isReady ? (
            <div className="flex flex-col items-center text-center p-8 bg-green-50 rounded-xl border border-green-100">
              <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
              <h4 className="text-xl font-bold text-green-700">WhatsApp Connecté !</h4>
              {status?.account && (
                <p className="text-green-600 mt-2">
                  {status.account.pushname} ({status.account.wid})
                </p>
              )}
              <p className="text-green-600 mt-1">Votre application est prête à envoyer des notifications</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center p-8 bg-gray-50 rounded-xl border border-gray-100">
              <XCircle className="w-20 h-20 text-gray-400 mb-4" />
              <h4 className="text-xl font-bold text-gray-700">État indéterminé</h4>
              <p className="text-gray-500 mt-2">Cliquez sur Générer QR pour obtenir un nouveau code</p>
            </div>
          )}
        </div>

        {/* Status Info */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Statut de la connexion
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="font-bold text-gray-700">État</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${status?.status === 'CONNECTED' ? 'bg-green-100 text-green-700' : status?.status === 'QRCODE' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                  {status?.status || 'INCONNU'}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="font-bold text-gray-700">Prêt</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${status?.isReady ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {status?.isReady ? 'OUI' : 'NON'}
                </span>
              </div>
              {status?.lastError && (
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl">
                  <span className="font-bold text-gray-700">Erreur</span>
                  <span className="text-xs font-bold text-red-700">{status.lastError}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <QrCode className="w-6 h-6 text-primary" />
              Comment connecter ?
            </h3>
            <ol className="list-decimal list-inside space-y-3 text-gray-600">
              <li className="font-medium">Ouvrez WhatsApp sur votre téléphone</li>
              <li className="font-medium">Allez dans Paramètres &gt; Appareils liés</li>
              <li className="font-medium">Cliquez sur "Lier un appareil"</li>
              <li className="font-medium">Scannez le QR code affiché sur cette page</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Test Message Section */}
      {status?.isReady && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Envoyer un message de test
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Numéro de téléphone</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="0708123456 ou 2250708123456"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Votre message de test..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              />
            </div>
          </div>
          <button
            onClick={handleSendTest}
            disabled={sendingTest || !testPhone || !testMessage}
            className="mt-4 bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            {sendingTest ? 'Envoi en cours...' : 'Envoyer le message'}
          </button>
        </div>
      )}
    </div>
  );
}