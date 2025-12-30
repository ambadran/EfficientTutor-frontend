import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { appState } from './config.js';
import { registerDeviceToken, unregisterDeviceToken, softSyncDevice } from './api.js';
import { navigateTo } from './ui/navigation.js';
import { showStatusMessage } from './ui/modals.js';

let isInitialized = false;

/**
 * Initializes the push notification listeners.
 * Should be called after the user is authenticated.
 */
export async function initializeNotifications() {
    console.log('Notifications: initializeNotifications called. Role:', appState.currentUser?.role);
    
    if (isInitialized) {
        console.log('Notifications: Already initialized.');
        return;
    }
    
    if (!Capacitor.isNativePlatform()) {
        console.log('Notifications: Web platform detected. Skipping initialization.');
        return;
    }

    try {
        let permStatus = await PushNotifications.checkPermissions();
        console.log('Notifications: Permission status:', permStatus.receive);

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
            console.log('Notifications: Requested permission. Result:', permStatus.receive);
        }

        if (permStatus.receive !== 'granted') {
            console.warn('Notifications: Permission denied.');
            return;
        }

        await registerListeners();
        console.log('Notifications: Listeners registered. Calling PushNotifications.register()...');
        await PushNotifications.register();
        
        isInitialized = true;

        // Check for an existing token in storage to sync immediately
        const savedToken = localStorage.getItem('deviceToken');
        if (savedToken && appState.currentUser) {
            console.log('Notifications: Found saved token in localStorage. Syncing...');
            await syncTokenWithBackend(savedToken, true);
        }
    } catch (e) {
        console.error('Notifications: Initialization error:', e);
    }
}

async function registerListeners() {
    // 1. Registration (Getting the Token)
    PushNotifications.addListener('registration', async (token) => {
        console.log('Notifications: SUCCESS! Received Token:', token.value);
        localStorage.setItem('deviceToken', token.value);
        
        if (appState.currentUser) {
            await syncTokenWithBackend(token.value);
        } else {
            console.log('Notifications: Token received but no user logged in yet. Saved to storage.');
        }
    });

    PushNotifications.addListener('registrationError', (error) => {
        console.error('Notifications: NATIVE REGISTRATION ERROR:', error);
        // This often happens if "Push Notifications" capability is missing in Xcode
    });

    // 2. Received (Foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Notifications: Received in foreground:', notification);
        const title = notification.title || 'New Notification';
        const body = notification.body || '';
        showStatusMessage('info', `${title}: ${body}`);
    });

    // 3. Action Performed (Tapped)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Notifications: Action Performed (Tapped):', notification);
        const data = notification.notification.data;
        handleNotificationAction(data);
    });
}

/**
 * Sends the token to the backend.
 * @param {string} token - The FCM token.
 * @param {boolean} isSoftSync - If true, calls soft_sync instead of register.
 */
async function syncTokenWithBackend(token, isSoftSync = false) {
    if (!appState.currentUser) {
        console.warn('Notifications: syncTokenWithBackend aborted - no currentUser.');
        return;
    }

    try {
        const platform = Capacitor.getPlatform().toUpperCase(); // 'ios' -> 'IOS'
        console.log(`Notifications: Calling backend ${isSoftSync ? 'soft_sync' : 'register'} for user ${appState.currentUser.id}...`);
        
        if (isSoftSync) {
            await softSyncDevice(appState.currentUser.id, token);
            console.log('Notifications: Backend soft_sync successful.');
        } else {
            await registerDeviceToken(appState.currentUser.id, token, platform);
            console.log('Notifications: Backend registration successful.');
        }
    } catch (error) {
        console.error('Notifications: Backend sync FAILED:', error);
    }
}

/**
 * Force a soft sync of the current device token.
 */
export async function triggerSoftSync() {
    if (!Capacitor.isNativePlatform() || !appState.currentUser) return;
    
    const token = localStorage.getItem('deviceToken');
    if (token) {
        console.log('Notifications: Manual triggerSoftSync starting...');
        await syncTokenWithBackend(token, true);
    } else {
        console.log('Notifications: Manual triggerSoftSync skipped - no token in storage.');
    }
}

/**
 * Handles logic when a user taps a notification.
 */
function handleNotificationAction(data) {
    if (!data) return;
    if (data.action === 'open_tuition') {
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
            console.log('Notifications: Unregistering device on logout...');
            await unregisterDeviceToken(appState.currentUser.id, token);
            console.log('Notifications: Device unregistered.');
        } catch (error) {
            console.error('Notifications: Unregister failed:', error);
        }
    }
    
    localStorage.removeItem('deviceToken');
    isInitialized = false; 
}