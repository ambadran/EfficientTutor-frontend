import { appState } from '../config.js';

export function toggleSidebar() {
    appState.isSidebarOpen = !appState.isSidebarOpen;
    document.getElementById('sidebar').classList.toggle('open');
}

export function initializeLayout() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth >= 768) { // md breakpoint
        sidebar.classList.add('open');
        appState.isSidebarOpen = true;
    } else {
        sidebar.classList.remove('open');
        appState.isSidebarOpen = false;
    }
}

export function displayGlobalError(message) {
    document.getElementById('page-title').textContent = "Error";
    document.getElementById('page-content').innerHTML = `
        <div class="text-center p-8 bg-gray-800 rounded-lg">
            <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
            <h3 class="text-xl font-semibold text-red-400">Application Error</h3>
            <p class="text-gray-400 mt-2">${message}</p>
            <p class="text-xs text-gray-500 mt-4">This could be a temporary issue with the backend server or your network connection. Please try refreshing the page.</p>
            <button id="retry-connection-btn" class="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Retry Connection</button>
        </div>`;
}