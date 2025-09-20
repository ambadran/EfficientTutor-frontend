import { appState } from '../config.js';
import { fetchTeacherTuitionLogs, fetchSchedulableTuitions, fetchManualEntryData, postTuitionLog, postTuitionLogCorrection, voidTuitionLog } from '../api.js';
import { showModal, closeModal, showLoadingOverlay, showStatusMessage, hideStatusOverlay } from './modals.js';
import { renderPage } from './navigation.js';

/**
 * Formats an ISO date string into a more readable local format.
 * e.g., "Sep 20, 2025, 5:30 PM"
 */
function formatDateTime(isoString) {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return isoString; // Fallback
    }
}

/**
 * Renders the main table of tuition logs.
 */
function renderTuitionLogsTable(logs) {
    if (logs.length === 0) {
        return `<div class="text-center p-8 text-gray-400">No tuition logs found.</div>`;
    }

    // Sort logs by start time, most recent first
    logs.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

    const logsHTML = logs.map(log => {
        const isVoid = log.status === 'VOID';
        const rowClass = isVoid ? 'opacity-50 bg-gray-800/50' : 'bg-gray-800';
        return `
            <tr class="${rowClass}">
                <td class="p-3">${log.subject}</td>
                <td class="p-3">${log.attendee_names.join(', ')}</td>
                <td class="p-3">${formatDateTime(log.start_time)}</td>
                <td class="p-3">${formatDateTime(log.end_time)}</td>
                <td class="p-3">${log.cost} kwd</td>
                <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${isVoid ? 'bg-red-500/30 text-red-300' : 'bg-green-500/30 text-green-300'}">${log.status}</span></td>
                <td class="p-3">
                    <div class="flex items-center space-x-2">
                        <button title="Correct Log" class="correct-log-btn p-2 text-sm bg-yellow-600 hover:bg-yellow-500 rounded-md ${isVoid ? 'hidden' : ''}" data-log-id='${log.id}'><i class="fas fa-edit"></i></button>
                        <button title="Void Log" class="void-log-btn p-2 text-sm bg-red-600 hover:bg-red-500 rounded-md ${isVoid ? 'hidden' : ''}" data-log-id="${log.id}"><i class="fas fa-ban"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead class="bg-gray-900/80">
                    <tr>
                        <th class="p-3">Subject</th>
                        <th class="p-3">Attendees</th>
                        <th class="p-3">Start Time</th>
                        <th class="p-3">End Time</th>
                        <th class="p-3">Cost</th>
                        <th class="p-3">Status</th>
                        <th class="p-3">Actions</th>
                    </tr>
                </thead>
                <tbody>${logsHTML}</tbody>
            </table>
        </div>
    `;
}

/**
 * Main function to render the entire Teacher Tuition Logs page.
 */
export async function renderTeacherTuitionLogsPage() {
    try {
        const logs = await fetchTeacherTuitionLogs();
        appState.teacherTuitionLogs = logs; // Cache the logs for correction feature
        const tableHTML = renderTuitionLogsTable(logs);
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">Tuition Logs</h2>
                    <button id="add-new-log-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                        <i class="fas fa-plus mr-2"></i> Add New Log
                    </button>
                </div>
                ${tableHTML}
            </div>
        `;
    } catch (error) {
        console.error("Error rendering tuition logs page:", error);
        return `<div class="text-center text-red-400 p-8">Error loading tuition logs: ${error.message}</div>`;
    }
}

/**
 * Handles the logic for voiding a tuition log with confirmation.
 */
export function handleVoidLog(logId) {
    const body = `<p>Are you sure you want to void this log? This action cannot be undone.</p>`;
    const footer = `<div class="flex justify-end space-x-4"><button id="modal-cancel-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Cancel</button><button id="modal-confirm-void-btn" class="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-md">Void Log</button></div>`;
    showModal('Confirm Void', body, footer, (modal) => {
        modal.querySelector('#modal-confirm-void-btn').addEventListener('click', async () => {
            showLoadingOverlay('Voiding log...');
            try {
                await voidTuitionLog(logId);
                closeModal();
                showStatusMessage('success', 'Log voided successfully.');
                renderPage();
            } catch (error) {
                showStatusMessage('error', error.message);
            }
        });
    });
}

/**
 * Orchestrates the multi-step modal for adding or correcting a log.
 */
export async function showAddTuitionLogModal(logToCorrect = null) {
    const isCorrection = logToCorrect !== null;
    let logData = {};

    const _renderFinalStep = () => {
        const now = new Date();
        const startTime = logToCorrect?.start_time || logData.scheduled_start_time || now.toISOString().slice(0, 16);
        const endTime = logToCorrect?.end_time || logData.scheduled_end_time || new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);

        const body = `
            <div class="space-y-4">
                <div><p class="text-sm text-gray-400">Subject: <span class="font-semibold text-gray-200">${logData.subject}</span></p></div>
                <div><p class="text-sm text-gray-400">Attendees: <span class="font-semibold text-gray-200">${logData.student_names.join(', ')}</span></p></div>
                ${logData.log_type === 'custom' ? `<div><label class="text-sm text-gray-400">Cost</label><input type="number" id="log-cost" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" value="${logToCorrect?.cost || logData.cost || ''}" step="0.5"></div>` : ''}
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-sm text-gray-400">Start Time</label><input type="datetime-local" id="log-start-time" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" value="${startTime.slice(0, 16)}"></div>
                    <div><label class="text-sm text-gray-400">End Time</label><input type="datetime-local" id="log-end-time" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" value="${endTime.slice(0, 16)}"></div>
                </div>
            </div>`;
        const footer = `<div class="flex justify-end"><button id="submit-log-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Submit</button></div>`;
        showModal(isCorrection ? 'Correct Tuition Log' : 'Add Tuition Log', body, footer, (modal) => {
            modal.querySelector('#submit-log-btn').addEventListener('click', async () => {
                const finalLogData = {
                    ...logData,
                    start_time: new Date(modal.querySelector('#log-start-time').value).toISOString(),
                    end_time: new Date(modal.querySelector('#log-end-time').value).toISOString(),
                };
                if (finalLogData.log_type === 'custom') {
                    finalLogData.cost = parseFloat(modal.querySelector('#log-cost').value);
                }

                showLoadingOverlay('Saving log...');
                try {
                    if (isCorrection) {
                        await postTuitionLogCorrection(logToCorrect.id, finalLogData);
                    } else {
                        await postTuitionLog(finalLogData);
                    }
                    closeModal();
                    showStatusMessage('success', 'Log saved successfully.');
                    renderPage();
                } catch (error) {
                    showStatusMessage('error', error.message);
                }
            });
        });
    };

    const _renderScheduledPicker = async () => {
        showLoadingOverlay('Fetching tuitions...');
        const tuitions = await fetchSchedulableTuitions();
        hideStatusOverlay();
        const itemsHTML = tuitions.map(t => `<li class="p-3 hover:bg-gray-700 rounded-md cursor-pointer scheduled-item" data-tuition-id="${t.id}">${t.subject} - ${t.student_names.join(', ')}</li>`).join('');
        const body = `<div><h3 class="font-semibold mb-2">Select a Scheduled Tuition</h3><ul class="space-y-1 max-h-60 overflow-y-auto">${itemsHTML}</ul></div>`;
        showModal('Add From Schedule', body, '', (modal) => {
            modal.querySelectorAll('.scheduled-item').forEach(item => {
                item.addEventListener('click', () => {
                    const selectedTuition = tuitions.find(t => t.id === item.dataset.tuitionId);
                    logData = {
                        log_type: 'scheduled',
                        tuition_id: selectedTuition.id,
                        subject: selectedTuition.subject,
                        student_names: selectedTuition.student_names,
                        scheduled_start_time: selectedTuition.scheduled_start_time,
                        scheduled_end_time: selectedTuition.scheduled_end_time
                    };
                    _renderFinalStep();
                });
            });
        });
    };

    const _renderCustomForm = async () => {
        showLoadingOverlay('Fetching data...');
        const data = await fetchManualEntryData();
        hideStatusOverlay();
        const studentsHTML = data.students.map(s => `<label class="flex items-center space-x-2"><input type="checkbox" class="student-checkbox" value="${s.id}"><span>${s.first_name} ${s.last_name}</span></label>`).join('');
        const subjectsHTML = data.subjects.map(sub => `<option value="${sub}">${sub}</option>`).join('');
        const body = `
            <div class="space-y-4">
                <div><label class="text-sm text-gray-400">Select Students</label><div class="max-h-40 overflow-y-auto space-y-1 mt-1 border border-gray-600 p-2 rounded-md">${studentsHTML}</div></div>
                <div><label class="text-sm text-gray-400">Select Subject</label><select id="custom-subject" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${subjectsHTML}</select></div>
            </div>`;
        const footer = `<div class="flex justify-end"><button id="next-custom-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Next</button></div>`;
        showModal('Add Custom Log', body, footer, (modal) => {
            modal.querySelector('#next-custom-btn').addEventListener('click', () => {
                const selectedStudentIds = Array.from(modal.querySelectorAll('.student-checkbox:checked')).map(cb => cb.value);
                if (selectedStudentIds.length === 0) {
                    alert('Please select at least one student.');
                    return;
                }
                const selectedStudentNames = selectedStudentIds.map(id => {
                    const student = data.students.find(s => s.id === id);
                    return student.first_name;
                });
                logData = {
                    log_type: 'custom',
                    student_ids: selectedStudentIds,
                    student_names: selectedStudentNames,
                    subject: modal.querySelector('#custom-subject').value,
                };
                _renderFinalStep();
            });
        });
    };

    if (isCorrection) {
        logData = {
            log_type: logToCorrect.create_type.toLowerCase(),
            subject: logToCorrect.subject,
            student_names: logToCorrect.attendee_names,
            cost: logToCorrect.cost
        };
        _renderFinalStep();
    } else {
        const body = `<div class="flex space-x-4"><button id="from-schedule-btn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md">From Schedule</button><button id="custom-entry-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md">Custom Entry</button></div>`;
        showModal('Add New Tuition Log', body, '', (modal) => {
            modal.querySelector('#from-schedule-btn').addEventListener('click', _renderScheduledPicker);
            modal.querySelector('#custom-entry-btn').addEventListener('click', _renderCustomForm);
        });
    }
}
