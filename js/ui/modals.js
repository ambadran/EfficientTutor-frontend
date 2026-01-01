// ... existing functions (showModal, showDialog, etc.) ...
export function showModal(title, bodyHTML, footerHTML, onAfterRender) {
    closeModal();
    const modalContainer = document.getElementById('modal-container');
    const modal = document.createElement('div');
    modal.id = 'modal-backdrop';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold">${title}</h3>
                <button id="modal-close-btn" class="p-2 rounded-full hover:bg-gray-700 -mr-2 -mt-2"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">${bodyHTML}</div>
            <div class="modal-footer mt-4">${footerHTML}</div>
        </div>`;
    modalContainer.appendChild(modal);
    if (onAfterRender) onAfterRender(modal);
}

export function showDialog(title, bodyHTML, footerHTML, onAfterRender) {
    const modalContainer = document.getElementById('modal-container');
    const dialog = document.createElement('div');
    dialog.className = 'modal-backdrop';
    dialog.style.zIndex = '110';
    dialog.innerHTML = `
        <div class="modal-content">
            <div class="modal-header flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold">${title}</h3>
                <button class="dialog-close-btn p-2 rounded-full hover:bg-gray-700 -mr-2 -mt-2"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">${bodyHTML}</div>
            <div class="modal-footer mt-4">${footerHTML}</div>
        </div>`;
    dialog.querySelector('.dialog-close-btn').addEventListener('click', () => closeDialog(dialog));
    modalContainer.appendChild(dialog);
    if (onAfterRender) onAfterRender(dialog);
}

export function showInfoModal(title, bodyHTML) {
    showModal(title, bodyHTML, `<div class="flex justify-end"><button id="modal-close-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">OK</button></div>`);
}

export function showConfirmDialog(title, message, onConfirm) {
    const body = `<p>${message}</p>`;
    const footer = `
        <div class="flex justify-end space-x-4">
            <button id="modal-cancel-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Cancel</button>
            <button id="modal-confirm-btn" class="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-md">Confirm</button>
        </div>`;
    
    showModal(title, body, footer, (modal) => {
        modal.querySelector('#modal-confirm-btn').addEventListener('click', () => {
            closeModal();
            onConfirm();
        });
        // The generic modal close button ('#modal-close-btn') will handle the cancel case.
        modal.querySelector('#modal-cancel-btn').addEventListener('click', () => closeModal());
    });
}

export function closeModal() {
    document.getElementById('modal-backdrop')?.remove();
}

export function closeDialog(dialog) {
    if (dialog) dialog.remove();
}

const statusContainer = document.getElementById('status-overlay-container');

// NEW: Allow dismissing status messages by clicking them
statusContainer.addEventListener('click', () => hideStatusOverlay());

export function showLoadingOverlay(message) {
    statusContainer.innerHTML = `<div id="status-overlay"><div class="loader"></div><p>${message}</p></div>`;
}

export function showStatusMessage(type, message) {
    let icon = '';
    let duration = 2000;

    if (type === 'success') {
        icon = '<i class="fas fa-check-circle text-5xl text-green-500"></i>';
    } else if (type === 'info') {
        icon = '<i class="fas fa-bell text-5xl text-blue-500 animate-bounce"></i>';
        duration = 4000; // Notifications stay a bit longer
    } else {
        icon = '<i class="fas fa-times-circle text-5xl text-red-500"></i>';
    }

    statusContainer.innerHTML = `<div id="status-overlay" class="p-6 text-center">${icon}<p class="mt-4 text-lg font-medium">${message}</p></div>`;
    setTimeout(hideStatusOverlay, duration);
}

export function hideStatusOverlay() {
    statusContainer.innerHTML = '';
}

/**
 * NEW: Shows a feedback message on the login/signup form.
 * @param {string} message The message to display.
 * @param {'error' | 'success'} type The type of message.
 */
export function showAuthFeedback(message, type = 'error') {
    const feedbackContainer = document.getElementById('auth-feedback');
    if (!feedbackContainer) return;
    
    const colorClass = type === 'success' ? 'text-green-400' : 'text-red-400';
    feedbackContainer.innerHTML = `<p class="${colorClass} text-sm font-medium">${message}</p>`;
}

/**
 * NEW: Clears the feedback message on the login/signup form.
 */
export function clearAuthFeedback() {
    const feedbackContainer = document.getElementById('auth-feedback');
    if (feedbackContainer) {
        feedbackContainer.innerHTML = '';
    }
}
