import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { appState } from './config.js';
import { registerDeviceToken, unregisterDeviceToken, softSyncDevice } from './api.js';
import { navigateTo } from './ui/navigation.js';
import { showStatusMessage } from './ui/modals.js';

let isInitialized = false;

/**
 * Initializes the Firebase push notification system.
 * Should be called after user authentication or at app launch.
 */
export async function initializeNotifications() {
    console.log('Notifications: initializeNotifications started.');
    
    if (isInitialized) {
        console.log('Notifications: Skip initialization - already initialized.');
        return;
    }
    
    if (!Capacitor.isNativePlatform()) {
        console.log('Notifications: Web platform detected. Skipping initialization.');
        return;
    }

    try {
        // 1. Check/Request Permissions
        console.log('Notifications: Checking permissions...');
        const permStatus = await FirebaseMessaging.checkPermissions();
        console.log('Notifications: Current Permission status:', permStatus.receive);

        if (permStatus.receive === 'prompt') {
            console.log('Notifications: Requesting permissions...');
            const reqStatus = await FirebaseMessaging.requestPermissions();
            console.log('Notifications: Permission request result:', reqStatus.receive);
        }

        // 3. Register Listeners
        console.log('Notifications: Registering listeners...');
        await registerListeners();

        // 4. Get/Refresh FCM Token
        console.log('Notifications: Calling getToken()...');
        const { token } = await FirebaseMessaging.getToken();
        
        if (token) {
            console.log('Notifications: SUCCESS! Received FCM Token:', token);
            localStorage.setItem('deviceToken', token);
            
            if (appState.currentUser) {
                await syncTokenWithBackend(token);
            }
        } else {
            console.warn('Notifications: getToken() returned null/empty.');
        }

        isInitialized = true;

    } catch (e) {
        console.error('Notifications: CRITICAL Initialization error:', e);
        // This will now catch exactly where the code breaks.
    }
}

async function registerListeners() {
    // Listener for when a token is refreshed (rare but happens)
    await FirebaseMessaging.addListener('tokenReceived', async (result) => {
        console.log('Notifications: Token Refreshed Event:', result.token);
        localStorage.setItem('deviceToken', result.token);
        if (appState.currentUser) {
            await syncTokenWithBackend(result.token);
        }
    });

    // Listener for when a notification arrives while app is in FOREGROUND
    await FirebaseMessaging.addListener('notificationReceived', (result) => {
        console.log('Notifications: Foreground message received:', result.notification);
        const title = result.notification.title || 'New Notification';
        const body = result.notification.body || '';
        showStatusMessage('info', `${title}: ${body}`);
    });

    // Listener for when a notification is TAPPED (App in background or closed)
    await FirebaseMessaging.addListener('notificationActionPerformed', (result) => {
        console.log('Notifications: Tap Action detected:', result.notification);
        const data = result.notification.data;
        handleNotificationAction(data);
    });
    console.log('Notifications: All listeners attached.');
}

/**
 * Sends the FCM token to our FastAPI backend.
 */
async function syncTokenWithBackend(token, isSoftSync = false) {
    if (!appState.currentUser) {
        console.warn('Notifications: syncTokenWithBackend aborted - no currentUser.');
        return;
    }

    try {
        const platform = Capacitor.getPlatform().toUpperCase(); // 'IOS' or 'ANDROID'
        console.log(`Notifications: Syncing with backend (${isSoftSync ? 'soft_sync' : 'register'})...`);
        
        if (isSoftSync) {
            await softSyncDevice(appState.currentUser.id, token);
        } else {
            await registerDeviceToken(appState.currentUser.id, token, platform);
        }
        console.log('Notifications: Backend sync successful.');
    } catch (error) {
        console.error('Notifications: Backend sync FAILED:', error);
    }
}

/**
 * Trigger a refresh of subscriptions.
 */
export async function triggerSoftSync() {
    if (!Capacitor.isNativePlatform() || !appState.currentUser) return;
    
    const token = localStorage.getItem('deviceToken');
    if (token) {
        console.log('Notifications: Manual triggerSoftSync starting...');
        await syncTokenWithBackend(token, true);
    } else {
        console.log('Notifications: Manual triggerSoftSync fallback to initialize...');
        await initializeNotifications();
    }
}

/**
 * Handles navigation logic based on notification payload.
 */
function handleNotificationAction(data) {
    if (!data) return;
    // Support both singular and plural forms for robustness
    if (data.action === 'open_tuition' || data.action === 'open_tuitions') {
        navigateTo('tuitions');
    } else if (data.action === 'open_profile') {
        navigateTo('profile');
    } else if (data.action === 'join_zoom' && data.url) {
        window.open(data.url, '_blank');
    }
}

/**
 * Cleanup on Logout.
 */
export async function handleNotificationLogout() {
    if (!Capacitor.isNativePlatform()) return;

    const token = localStorage.getItem('deviceToken');
    if (token && appState.currentUser) {
        try {
            console.log('Notifications: Cleaning up device on logout...');
            await unregisterDeviceToken(appState.currentUser.id, token);
            await FirebaseMessaging.deleteToken();
            console.log('Notifications: Device clean.');
        } catch (error) {
            console.error('Notifications: Unregister failed:', error);
        }
    }
    
    localStorage.removeItem('deviceToken');
    isInitialized = false; 
}