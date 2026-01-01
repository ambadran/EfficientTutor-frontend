import { appState, config } from '../config.js';
import { pingUser, pingTuition } from '../api.js';
import { showModal, closeModal, showLoadingOverlay, hideStatusOverlay, showStatusMessage } from './modals.js';

/**
 * Shows the enhanced Ping Modal with relationship awareness.
 */
export function showPingModal(tuition, timeContext = {}) {
    const role = appState.currentUser.role;
    let body = '';
    let isTimeValid = true;

    if (role === 'teacher') {
        body = renderTeacherPingUI(tuition);
    } else if (role === 'parent') {
        body = renderParentPingUI(tuition);
    } else if (role === 'student') {
        const { html, valid } = renderStudentPingUI(tuition, timeContext);
        body = html;
        isTimeValid = valid;
    }

    const footer = isTimeValid 
        ? `<div class="flex justify-end space-x-3">
             <button id="modal-close-btn" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white">Cancel</button>
             <button id="send-ping-btn" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-bold"><i class="fas fa-paper-plane mr-2"></i> Send Ping</button>
           </div>`
        : `<div class="flex justify-end"><button id="modal-close-btn" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white">Close</button></div>`;

    showModal(`Ping - ${tuition.subject}`, body, footer, (modal) => {
        if (!isTimeValid) return;
        attachPingListeners(modal, tuition);
    });
}

// --- Teacher UI ---

function renderTeacherPingUI(tuition) {
    // Grouping relationship data
    const familiesHTML = (tuition.charges || []).map(charge => {
        const student = charge.student;
        const parent = charge.parent;
        
        return `
            <div class="bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-2">
                <p class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Family</p>
                
                <!-- Student -->
                <label class="flex items-center justify-between p-2 hover:bg-gray-700 rounded cursor-pointer transition-colors">
                    <div class="flex items-center">
                        <i class="fas fa-user-graduate text-gray-400 mr-3"></i>
                        <span class="text-sm font-medium">${student.first_name} ${student.last_name}</span>
                    </div>
                    <input type="radio" name="ping-target" value="user_${student.id}" class="w-4 h-4 text-indigo-600">
                </label>

                <!-- Parent (Indented) -->
                <div class="ml-6 border-l-2 border-gray-700 pl-3">
                    <label class="flex items-center justify-between p-2 hover:bg-gray-700 rounded cursor-pointer transition-colors">
                        <div class="flex items-center">
                            <i class="fas fa-user-friends text-gray-500 mr-3"></i>
                            <span class="text-sm text-gray-300">${parent.first_name} ${parent.last_name} (Parent)</span>
                        </div>
                        <input type="radio" name="ping-target" value="user_${parent.id}" class="w-4 h-4 text-indigo-600">
                    </label>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="space-y-6">
            <!-- Mode Selector -->
            <div class="flex p-1 bg-gray-900 rounded-lg">
                <button id="mode-group" class="flex-1 py-2 text-sm font-semibold rounded-md bg-gray-800 text-white shadow-sm border border-gray-700">Group Ping</button>
                <button id="mode-individual" class="flex-1 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Individual</button>
            </div>

            <!-- Group Options -->
            <div id="section-group" class="grid grid-cols-1 gap-3">
                <label class="group-card relative bg-gray-800 p-4 rounded-lg border-2 border-indigo-600 cursor-pointer hover:bg-gray-750 transition-all">
                    <div class="flex items-center">
                        <div class="p-3 bg-indigo-900/50 rounded-full mr-4 text-indigo-400"><i class="fas fa-users-cog text-xl"></i></div>
                        <div>
                            <p class="font-bold">Students Only</p>
                            <p class="text-xs text-gray-400">Pings all enrolled students.</p>
                        </div>
                    </div>
                    <input type="radio" name="ping-target" value="topic_students" checked class="hidden">
                </label>

                <label class="group-card relative bg-gray-800 p-4 rounded-lg border-2 border-transparent cursor-pointer hover:bg-gray-750 transition-all">
                    <div class="flex items-center">
                        <div class="p-3 bg-blue-900/50 rounded-full mr-4 text-blue-400"><i class="fas fa-user-shield text-xl"></i></div>
                        <div>
                            <p class="font-bold">Students & Parents</p>
                            <p class="text-xs text-gray-400">Pings everyone related to this tuition.</p>
                        </div>
                    </div>
                    <input type="radio" name="ping-target" value="topic_all" class="hidden">
                </label>
            </div>

            <!-- Individual Options (Hidden by default) -->
            <div id="section-individual" class="hidden space-y-3 max-h-60 overflow-y-auto pr-1">
                ${familiesHTML}
            </div>

            ${renderMessageInputs()}
        </div>
    `;
}

// --- Parent UI ---

function renderParentPingUI(tuition) {
    const studentOptions = appState.students.map(s => `
        <label class="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
            <div class="flex items-center">
                <i class="fas fa-child text-indigo-400 mr-3"></i>
                <span class="font-medium">${s.first_name} ${s.last_name}</span>
            </div>
            <input type="radio" name="ping-target" value="user_${s.id}" class="w-4 h-4 text-indigo-600">
        </label>
    `).join('');

    return `
        <div class="space-y-4">
            <p class="text-sm text-gray-400 font-medium uppercase tracking-wider">Select Recipient</p>
            
            <label class="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                <div class="flex items-center">
                    <div class="p-2 bg-green-900/30 rounded-full mr-3 text-green-400"><i class="fas fa-chalkboard-teacher"></i></div>
                    <span class="font-bold">Tuition Teacher</span>
                </div>
                <input type="radio" name="ping-target" value="user_${tuition.teacher_id}" checked class="w-4 h-4 text-indigo-600">
            </label>

            <div class="space-y-2 mt-4">
                <p class="text-xs text-gray-500 font-bold uppercase">Your Children</p>
                ${studentOptions}
            </div>

            ${renderMessageInputs()}
        </div>
    `;
}

// --- Student UI ---

function renderStudentPingUI(tuition, timeContext) {
    const now = new Date();
    const start = timeContext.start_time ? new Date(timeContext.start_time) : null;
    const end = timeContext.end_time ? new Date(timeContext.end_time) : null;

    if (!start || !end || now < start || now > end) {
        const errorMsg = (!start || !end) 
            ? "You can only ping the teacher during a scheduled class."
            : `Class is not active.<br>Schedule: ${start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
        
        return { html: renderErrorState(errorMsg), valid: false };
    }

    return {
        html: `
            <div class="space-y-4">
                <div class="bg-green-900/20 border border-green-500/30 p-4 rounded-lg flex items-center">
                    <i class="fas fa-clock text-green-400 mr-4 text-2xl animate-pulse"></i>
                    <div>
                        <p class="font-bold text-white text-base">Session is Active</p>
                        <p class="text-xs text-green-300/80">The teacher will be notified immediately.</p>
                    </div>
                </div>
                <input type="hidden" id="ping-recipient-id" value="${tuition.teacher_id}">
                ${renderMessageInputs(true)}
            </div>
        `,
        valid: true
    };
}

// --- Helpers ---

function attachPingListeners(modal, tuition) {
    // Mode Toggling (Teacher Only)
    const modeGroup = modal.querySelector('#mode-group');
    const modeIndiv = modal.querySelector('#mode-individual');
    const secGroup = modal.querySelector('#section-group');
    const secIndiv = modal.querySelector('#section-individual');

    if (modeGroup && modeIndiv) {
        modeGroup.addEventListener('click', () => {
            modeGroup.className = 'flex-1 py-2 text-sm font-semibold rounded-md bg-gray-800 text-white shadow-sm border border-gray-700';
            modeIndiv.className = 'flex-1 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors';
            secGroup.classList.remove('hidden');
            secIndiv.classList.add('hidden');
            // Select first group option
            modal.querySelector('input[value="topic_students"]').checked = true;
        });

        modeIndiv.addEventListener('click', () => {
            modeIndiv.className = 'flex-1 py-2 text-sm font-semibold rounded-md bg-gray-800 text-white shadow-sm border border-gray-700';
            modeGroup.className = 'flex-1 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors';
            secIndiv.classList.remove('hidden');
            secGroup.classList.add('hidden');
            // Uncheck group options to force user to pick individual
            modal.querySelectorAll('#section-group input').forEach(i => i.checked = false);
        });
    }

    // Group Card Styling (Teacher Only)
    modal.querySelectorAll('.group-card').forEach(card => {
        card.addEventListener('click', () => {
            modal.querySelectorAll('.group-card').forEach(c => c.classList.replace('border-indigo-600', 'border-transparent'));
            card.classList.replace('border-transparent', 'border-indigo-600');
        });
    });

    // Send Logic
    modal.querySelector('#send-ping-btn').addEventListener('click', async () => {
        const selectedRadio = modal.querySelector('input[name="ping-target"]:checked');
        const studentRecipientId = modal.querySelector('#ping-recipient-id')?.value; // For students
        
        const targetValue = selectedRadio ? selectedRadio.value : (studentRecipientId ? `user_${studentRecipientId}` : null);
        const title = modal.querySelector('#ping-title').value.trim();
        const message = modal.querySelector('#ping-message').value.trim();

        if (!targetValue) {
            showStatusMessage('error', 'Please select a recipient.');
            return;
        }
        if (!title || !message) {
            showStatusMessage('error', 'Message cannot be empty.');
            return;
        }

        showLoadingOverlay('Sending Ping...');
        try {
            if (targetValue.startsWith('topic_')) {
                const includeParents = targetValue === 'topic_all';
                await pingTuition(tuition.id, includeParents, { custom_title: title, custom_body: message });
            } else {
                const userId = targetValue.replace('user_', '');
                await pingUser({ target_user_id: userId, tuition_id: tuition.id, custom_title: title, custom_body: message });
            }
            closeModal();
            showStatusMessage('success', 'Ping delivered.');
        } catch (error) {
            showStatusMessage('error', error.message);
        } finally {
            hideStatusOverlay();
        }
    });
}

function renderMessageInputs(isStudent = false) {
    const defaultTitle = isStudent ? "I have a question" : config.notificationDefaults.title;
    const defaultBody = isStudent ? "" : config.notificationDefaults.body;
    const placeholderMsg = isStudent ? "e.g., I'm waiting in the Zoom room." : "e.g., Running 5 mins late, please wait!";
    
    return `
        <div class="mt-4 pt-4 border-t border-gray-700 space-y-4">
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Ping Title</label>
                <input type="text" id="ping-title" value="${defaultTitle}" class="w-full p-2 bg-gray-900 rounded border border-gray-700 text-sm focus:border-indigo-500 outline-none">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Your Message</label>
                <textarea id="ping-message" rows="3" placeholder="${placeholderMsg}" class="w-full p-2 bg-gray-900 rounded border border-gray-700 text-sm focus:border-indigo-500 outline-none resize-none">${defaultBody}</textarea>
            </div>
        </div>
    `;
}

function renderErrorState(message) {
    return `
        <div class="flex flex-col items-center justify-center p-8 text-center bg-gray-900/50 rounded-xl border border-dashed border-gray-700">
            <div class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <i class="fas fa-lock text-2xl text-yellow-600"></i>
            </div>
            <p class="text-white font-bold text-lg mb-1">Ping Restricted</p>
            <p class="text-sm text-gray-400">${message}</p>
        </div>
    `;
}