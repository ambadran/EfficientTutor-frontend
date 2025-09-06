/* This component handles all pop-up windows 
 * and full-screen overlays. By keeping this logic 
 * separate, you can easily show a loading spinner, 
 * a confirmation dialog, or an information pop-up 
 * from anywhere in your application with a single 
 * function call.
 */
const app = document.getElementById('app');

/**
 * Creates and shows a modal dialog.
 * @param {object} options - Configuration for the modal.
 * @param {string} options.title - The title of the modal.
 * @param {string} options.content - HTML content for the modal body.
 * @param {Array<object>} options.buttons - Array of button objects.
 */
export function showModal({ title, content, buttons = [] }) {
    hideModal(); // Ensure no other modal is open
    const modalHtml = `
        <div id="modal-backdrop" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40">
            <div id="modal-content" class="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg m-4 transform scale-95 transition-transform duration-300">
                <h3 class="text-2xl font-bold text-white mb-4">${title}</h3>
                <div class="modal-body text-gray-300 mb-6">${content}</div>
                <div class="modal-actions flex justify-end space-x-4">
                    ${buttons.map(btn => `<button class="btn ${btn.class || 'secondary'}" data-action-id="${btn.text}">${btn.text}</button>`).join('')}
                </div>
            </div>
        </div>
    `;
    app.insertAdjacentHTML('beforeend', modalHtml);

    // Add event listeners to buttons
    buttons.forEach(btn => {
        const btnElement = document.querySelector(`[data-action-id="${btn.text}"]`);
        if (btnElement) {
            btnElement.addEventListener('click', btn.action);
        }
    });
    
    // Animate modal into view
    setTimeout(() => {
        document.getElementById('modal-content')?.classList.remove('scale-95');
    }, 10);
}

/**
 * Hides the currently visible modal.
 */
export function hideModal() {
    const modal = document.getElementById('modal-backdrop');
    if (modal) {
        const modalContent = document.getElementById('modal-content');
        if (modalContent) {
            modalContent.classList.add('scale-95');
        }
        setTimeout(() => modal.remove(), 200);
    }
}

/**
 * Displays a full-screen status overlay (e.g., for loading or success/error messages).
 * @param {string} message - The message to display.
 * @param {'loading'|'success'|'error'} type - The type of message.
 */
export function showStatusMessage(message, type) {
    let iconHtml = '';
    switch (type) {
        case 'loading':
            iconHtml = '<div class="loader"></div>'; // A CSS spinner
            break;
        case 'success':
            iconHtml = '<i class="fas fa-check-circle text-5xl text-green-500"></i>';
            break;
        case 'error':
            iconHtml = '<i class="fas fa-times-circle text-5xl text-red-500"></i>';
            break;
    }

    const overlayHtml = `
        <div id="status-overlay" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div class="bg-gray-800 rounded-lg shadow-2xl p-8 flex flex-col items-center space-y-4">
                ${iconHtml}
                <p class="text-white text-lg">${message}</p>
            </div>
        </div>
    `;
    // Ensure no other overlay is open
    document.getElementById('status-overlay')?.remove();
    app.insertAdjacentHTML('beforeend', overlayHtml);
}

/**
 * Hides the status overlay.
 */
export function hideStatusOverlay() {
    const overlay = document.getElementById('status-overlay');
    if (overlay) {
        overlay.remove();
    }
}

