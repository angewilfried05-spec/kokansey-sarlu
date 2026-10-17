// ============================================================ 
//  Service : WhatsApp Web (Local Client) 
//  Fichier : backend/services/notifications.js 
// ============================================================ 

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const prisma = new PrismaClient();

// Tentative d'importation de whatsapp-web.js - avec fallback
let Client = null;
let LocalAuth = null;
let MessageMedia = null;
let QRCode = null;
let isWhatsAppAvailable = false;

try {
    const wwebjs = require('whatsapp-web.js');
    Client = wwebjs.Client;
    LocalAuth = wwebjs.LocalAuth;
    MessageMedia = wwebjs.MessageMedia;
    const qrcodeLib = require('qrcode');
    QRCode = qrcodeLib;
    isWhatsAppAvailable = true;
    console.log('✅ whatsapp-web.js et qrcode chargés avec succès');
} catch (err) {
    console.log('⚠️ whatsapp-web.js ou qrcode non installé - Mode simulation activé');
    console.error('Erreur de chargement:', err.message);
    isWhatsAppAvailable = false;
}

let client = null;
let readyPromise = null;
let isInitializing = false;
let isReady = false;
let latestQr = null;
let latestQrDataUrl = null;
let lastError = null;

const authDataPath = path.resolve(
    process.env.WHATSAPP_AUTH_DIR || path.join(__dirname, '../../.wwebjs_auth')
);
const cacheDataPath = path.resolve(
    process.env.WHATSAPP_CACHE_DIR || path.join(__dirname, '../../.wwebjs_cache')
);

let sendQueue = Promise.resolve();

// En-tête ajouté au-dessus de tous les messages sortants
const MESSAGE_HEADER = '🏢 *KOKANSEY SARLU*\n───────────────\n\n';

function withHeader(message) {
    if (!message) return message;
    if (message.startsWith(MESSAGE_HEADER)) return message;
    return MESSAGE_HEADER + message;
}

function createClient() {
    if (!isWhatsAppAvailable || !Client) {
        throw new Error('whatsapp-web.js non disponible');
    }

    const newClient = new Client({
        authStrategy: new LocalAuth({
            dataPath: authDataPath
        }),
        webVersionCache: {
            type: 'local',
            path: cacheDataPath
        },
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote'
            ]
        }
    });

    newClient.on('qr', async (qr) => {
        latestQr = qr;
        try {
            latestQrDataUrl = await QRCode.toDataURL(qr);
        } catch (err) {
            console.error('[QR] Erreur génération QR:', err);
        }
        isReady = false;
        lastError = null;
        console.log('');
        console.log('╔══════════════════════════════════════════════╗');
        console.log('║    📱 SCANNEZ LE QR CODE POUR WHATSAPP       ║');
        console.log('╚══════════════════════════════════════════════╝');
    });

    newClient.on('ready', () => {
        console.log('');
        console.log('╔══════════════════════════════════════════════╗');
        console.log('║    ✅ WHATSAPP WEB EST PRÊT (V2)             ║');
        console.log('╚══════════════════════════════════════════════╝');
        isReady = true;
        latestQr = null;
        latestQrDataUrl = null;
        lastError = null;
    });

    newClient.on('auth_failure', (msg) => {
        console.error('[WhatsApp] auth_failure:', msg);
        lastError = String(msg || 'auth_failure');
        resetClient().catch(() => {});
    });

    newClient.on('disconnected', (reason) => {
        console.error('[WhatsApp] disconnected:', reason);
        lastError = String(reason || 'disconnected');
        resetClient().catch(() => {});
    });

    return newClient;
}

async function initClientIfNeeded() {
    if (!isWhatsAppAvailable) {
        return { client: null, readyPromise: Promise.resolve(false) };
    }

    if (client && readyPromise) return { client, readyPromise };
    if (isInitializing) return { client, readyPromise };
    isInitializing = true;

    client = createClient();
    readyPromise = new Promise((resolve, reject) => {
        client.once('ready', () => {
            resolve(true);
        });
        client.once('auth_failure', () => {
            reject(new Error('WhatsApp auth_failure'));
        });
        client.once('disconnected', () => {
            reject(new Error('WhatsApp disconnected'));
        });
    });
    readyPromise.catch((err) => {
        lastError = err.message;
        return false;
    });

    try {
        await client.initialize();
    } finally {
        isInitializing = false;
    }

    return { client, readyPromise };
}

async function resetClient() {
    if (!client) return;
    const old = client;
    client = null;
    readyPromise = null;
    isInitializing = false;
    isReady = false;

    try {
        await old.destroy();
    } catch {}
}

async function clearAuthData() {
    try {
        await fs.rm(authDataPath, { recursive: true, force: true });
    } catch {}
}

function getWhatsAppStatus() {
    const info = client?.info || null;
    const clientReady = client?.info !== undefined;
    return {
        isReady: clientReady,
        hasClient: !!client,
        initializing: !!isInitializing,
        connected: clientReady,
        qrAvailable: !!latestQrDataUrl,
        status: clientReady ? 'CONNECTED' : latestQrDataUrl ? 'QRCODE' : 'INITIALIZING',
        qrCodeData: latestQrDataUrl,
        lastError,
        account: info ? {
            pushname: info.pushname || '',
            wid: info.wid?._serialized || '',
            platform: info.platform || ''
        } : null
    };
}

function getFallbackStatus() {
    return {
        isReady: false,
        hasClient: false,
        initializing: false,
        connected: false,
        qrAvailable: false,
        status: 'UNAVAILABLE',
        qrCodeData: null,
        lastError: 'whatsapp-web.js ou qrcode non installé',
        account: null
    };
}

async function logoutWhatsApp() {
    const current = client;
    client = null;
    readyPromise = null;
    isInitializing = false;
    isReady = false;
    latestQr = null;
    latestQrDataUrl = null;

    if (current) {
        try {
            await current.logout();
        } catch {}
        try {
            await current.destroy();
        } catch {}
    }

    await clearAuthData();
    lastError = null;

    return isWhatsAppAvailable ? getWhatsAppStatus() : getFallbackStatus();
}

async function relinkWhatsAppSession() {
    await logoutWhatsApp();

    try {
        await initClientIfNeeded();
    } catch (err) {
        lastError = err.message;
    }

    return isWhatsAppAvailable ? getWhatsAppStatus() : getFallbackStatus();
}

async function ensureWhatsAppQr() {
    try {
        await initClientIfNeeded();
    } catch (err) {
        lastError = err.message;
    }
    return isWhatsAppAvailable ? getWhatsAppStatus() : getFallbackStatus();
}

async function startWhatsApp() {
    try {
        const { readyPromise: waReady } = await initClientIfNeeded();
        await waReady;
        return true;
    } catch (err) {
        console.error('[WhatsApp] startWhatsApp failed:', err.message);
        return false;
    }
}

/**
 * Envoie un message WhatsApp via le client local
 */
async function sendWhatsAppMedia(to, filePath, caption = '') {
    caption = withHeader(caption || '');
    if (!isWhatsAppAvailable) {
        console.log(`[WhatsApp] Fichier simulé vers ${to}: ${filePath}`);
        return { success: true };
    }

    const run = async () => {
        const { client: waClient, readyPromise: waReady } = await initClientIfNeeded();
        await waReady;

        const defaultTo = process.env.TWILIO_TO_NUMBER || '';
        let recipient = to || defaultTo;
        if (!recipient) return { success: false, message: 'Aucun destinataire' };

        let cleanNumber = recipient.replace(/[^\d]/g, '');
        if (cleanNumber.length === 10 && cleanNumber.startsWith('0')) {
            cleanNumber = '225' + cleanNumber;
        }

        try {
            const numberId = await waClient.getNumberId(cleanNumber);
            if (!numberId) {
                console.error(`[WhatsApp] Le numéro ${cleanNumber} n'est pas reconnu par WhatsApp.`);
                return { success: false, error: 'Numéro non WhatsApp' };
            }
            const chatId = numberId._serialized;
            const media = MessageMedia.fromFilePath(filePath);
            await waClient.sendMessage(chatId, media, { caption });
            console.log('[WhatsApp] Fichier envoyé avec succès !');
            return { success: true };
        } catch (err) {
            console.error('[WhatsApp] Erreur envoi fichier:', err);
            return { success: false, error: err.message };
        }
    };

    sendQueue = sendQueue.then(run, run);
    try {
        return await sendQueue;
    } catch (err) {
        console.error('[WhatsApp] Erreur fatale envoi fichier:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Envoie un message WhatsApp via le client local
 */
async function sendWhatsAppMessage(to, message) {
    message = withHeader(message);
    if (!isWhatsAppAvailable) {
        console.log(`[WhatsApp] Message simulé vers ${to}: ${message}`);
        return { success: true };
    }

    const run = async () => {
        const { client: waClient, readyPromise: waReady } = await initClientIfNeeded();
        await waReady;

        const defaultTo = process.env.TWILIO_TO_NUMBER || '';
        let recipient = to || defaultTo;

        if (!recipient) return { success: false, message: 'Aucun destinataire' };

        // Nettoyage : ne garder que les chiffres 
        let cleanNumber = recipient.replace(/[^\d]/g, ''); 
        
        // AUTO-CORRECTION : Si 10 chiffres commençant par 0 (ex: 0708...), ajouter 225 
        if (cleanNumber.length === 10 && cleanNumber.startsWith('0')) { 
            cleanNumber = '225' + cleanNumber; 
        }

        console.log(`[WhatsApp] Vérification du numéro : ${cleanNumber}...`);
        
        try {
            // On demande à WhatsApp de nous donner l'ID correct
            const numberId = await waClient.getNumberId(cleanNumber);

            if (numberId) {
                const chatId = numberId._serialized;
                console.log(`[WhatsApp] Identifiant résolu : ${chatId}`);
                
                await waClient.sendMessage(chatId, message);
                
                console.log(`[WhatsApp] Message envoyé avec succès !`);
                return { success: true };
            } else {
                console.error(`[WhatsApp] Le numéro ${cleanNumber} n'est pas reconnu par WhatsApp.`);
                return { success: false, error: 'Numéro non WhatsApp' };
            }
        } catch (err) {
            console.error('[WhatsApp] Erreur:', err);
            return { success: false, error: err.message };
        }
    };

    sendQueue = sendQueue.then(run, run);
    try {
        return await sendQueue;
    } catch (err) {
        console.error('[WhatsApp] Erreur fatale :', err.message);
        if (String(err.message || '').toLowerCase().includes('detached frame')) {
            await resetClient();
        }
        return { success: false, error: err.message };
    }
}

// Initialiser le client au démarrage si disponible et activé
const enableWhatsApp = process.env.ENABLE_WHATSAPP === 'true';
if (isWhatsAppAvailable && enableWhatsApp) {
    initClientIfNeeded().catch(err => console.error('[WhatsApp] Erreur initialisation:', err));
} else if (!enableWhatsApp) {
    console.log('[WhatsApp] Service désactivé via ENABLE_WHATSAPP=false');
}

export default {
    sendWhatsAppMessage,
    sendWhatsAppMedia,
    startWhatsApp,
    getWhatsAppStatus,
    relinkWhatsAppSession,
    logoutWhatsApp,
    ensureWhatsAppQr,
    getStatus: () => isWhatsAppAvailable ? getWhatsAppStatus() : getFallbackStatus(),
    sendNotification: async (recipient, message) => sendWhatsAppMessage(recipient, message),
    sendWhatsApp: sendWhatsAppMessage,
    sendMaintenanceAlert: async (truck, recipient) => {
        const msg = `⚠️ ALERTE MAINTENANCE\n\nCamion: ${truck.internalCode || truck.registration}\n${truck.brand} ${truck.model} (${truck.year})\nImmatriculation: ${truck.registration}\nKilométrage: ${truck.mileage.toLocaleString()} km\nProchaine maintenance: ${truck.nextMaintenance ? new Date(truck.nextMaintenance).toLocaleDateString('fr-FR') : 'Non définie'}`;
        console.log(`🔔 [MAINTENANCE]`, msg);
        return sendWhatsAppMessage(recipient, msg);
    },
    sendLowStockAlert: async (stock, recipient) => {
        const msg = `⚠️ ALERTE STOCK BAS\n\nProduit: ${stock.name}\nCatégorie: ${stock.category}\nQuantité actuelle: ${stock.quantity} ${stock.unit}\nSeuil minimum: ${stock.minThreshold} ${stock.unit}\n${stock.speculation ? `Spéculation: ${stock.speculation}` : ''}`;
        console.log(`🔔 [LOW STOCK]`, msg);
        return sendWhatsAppMessage(recipient, msg);
    },
    sendNewSaleNotification: async (sale, recipient) => {
        const msg = `💰 NOUVELLE VENTE\n\nProduit: ${sale.product}\nQuantité: ${sale.quantity} ${sale.unit}\nPrix unitaire: ${sale.unitPrice.toLocaleString()} FCFA\nTotal: ${sale.totalPrice.toLocaleString()} FCFA\nClient: ${sale.client || 'Non spécifié'}\nDate: ${new Date(sale.date).toLocaleDateString('fr-FR')}\n${sale.observation ? `Note: ${sale.observation}` : ''}`;
        console.log(`🔔 [NEW SALE]`, msg);
        return sendWhatsAppMessage(recipient, msg);
    },
    sendEmployeeAlert: async (employee, type, recipient) => {
        let msg = '';
        switch(type) {
            case 'ABSENCE':
                msg = `📋 ALERTE ABSENCE\n\nEmployé: ${employee.firstName} ${employee.lastName}\nMatricule: ${employee.matricule || 'N/A'}\nContact: ${employee.contact}\nPoste: ${employee.position}`;
                break;
            case 'SALAIRE':
                msg = `💵 PAIEMENT SALAIRE\n\nEmployé: ${employee.firstName} ${employee.lastName}\nMatricule: ${employee.matricule || 'N/A'}\nSalaire: ${employee.salary.toLocaleString()} FCFA`;
                break;
            default:
                msg = `📌 ALERTE EMPLOYÉ\n\n${employee.firstName} ${employee.lastName}`;
        }
        console.log(`🔔 [EMPLOYEE ${type}]`, msg);
        return sendWhatsAppMessage(recipient, msg);
    },
    sendTripAssigned: async (trip, employee, recipient) => {
        const msg = `🚛 NOUVELLE MISSION\n\nBonjour ${employee.firstName} ${employee.lastName},\n\nUne nouvelle mission vous a été assignée.\n\nCamion: ${trip.truck?.internalCode || 'N/A'} (${trip.truck?.registration || ''})\nDestination: ${trip.destination || 'Non définie'}\nCargaison: ${trip.cargo || 'Non définie'}\nDate: ${new Date(trip.date).toLocaleDateString('fr-FR')}\n${trip.observation ? `Note: ${trip.observation}` : ''}`;
        console.log(`🔔 [TRIP ASSIGNED]`, msg);
        return sendWhatsAppMessage(recipient, msg);
    },
    sendTaskAssigned: async (task, employee, recipient) => {
        const statusLabels = {
            PENDING: 'En attente',
            IN_PROGRESS: 'En cours',
            COMPLETED: 'Terminée',
            CANCELLED: 'Annulée'
        };
        const priorityLabels = {
            LOW: 'Basse',
            NORMAL: 'Normale',
            HIGH: 'Haute'
        };

        const status = statusLabels[task.status] || (task.status || 'En attente');
        const priority = priorityLabels[task.priority] || (task.priority || 'Normale');
        const truck = task.truck;
        const truckInfo = truck
            ? `Véhicule assigné :\n- Code : ${truck.internalCode}\n- Immatriculation : ${truck.registration}\n- Marque : ${truck.brand}\n- Modèle : ${truck.model}\n- Année : ${truck.year}\n- Énergie : ${truck.energyType}\n- Kilométrage : ${truck.mileage?.toLocaleString('fr-FR')} km`
            : 'Véhicule : Aucun véhicule assigné';

        const msg = `📌 NOUVELLE TÂCHE\n\nBonjour ${employee.firstName} ${employee.lastName},\n\nUne nouvelle tâche vous a été assignée.\n\nTitre : ${task.title}\nDescription : ${task.description || 'Aucune'}\nPriorité : ${priority}\nÉchéance : ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : 'Non définie'}\nStatut : ${status}\n\n${truckInfo}`;
        console.log(`🔔 [TASK ASSIGNED]`, msg);
        return sendWhatsAppMessage(recipient, msg);
    },
    sendTaskStatusUpdate: async (task, employee, recipient) => {
        const statusLabels = {
            PENDING: 'En attente',
            IN_PROGRESS: 'En cours',
            COMPLETED: 'Terminée',
            CANCELLED: 'Annulée'
        };
        const status = statusLabels[task.status] || (task.status || 'En attente');
        const icon = task.status === 'COMPLETED' ? '✅' : '❌';
        const title = task.status === 'COMPLETED' ? 'TÂCHE TERMINÉE' : 'TÂCHE ANNULÉE';
        const truck = task.truck;
        const truckInfo = truck
            ? `Véhicule : ${truck.internalCode} (${truck.registration}) - ${truck.brand} ${truck.model}`
            : 'Véhicule : Aucun véhicule assigné';

        const msg = `${icon} ${title}\n\nBonjour ${employee.firstName} ${employee.lastName},\n\nLe statut de votre tâche a été mis à jour.\n\nTitre : ${task.title}\nStatut : ${status}\n${truckInfo}`;
        console.log(`🔔 [TASK STATUS UPDATE]`, msg);
        return sendWhatsAppMessage(recipient, msg);
    }
};
