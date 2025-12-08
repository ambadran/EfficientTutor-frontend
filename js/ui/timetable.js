import { config, appState } from '../config.js';
import { fetchTimetable } from '../api.js';
import { showDialog, closeDialog } from './modals.js';

function renderStudentSelector() {
    // This selector is only for parents
    if (appState.currentUser?.role !== 'parent' || appState.students.length <= 1) return '';
    
    const options = appState.students.map(s => `<option value="${s.id}" ${appState.currentStudent && appState.currentStudent.id === s.id ? 'selected' : ''}>${s.firstName} ${s.lastName}</option>`).join('');
    return `<div class="mb-4"><label for="student-selector" class="text-sm text-gray-400">Viewing Timetable for:</label><select id="student-selector" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${options}</select></div>`;
}

function showAddEventModal(dataSource, dayKey, pixelY, onUpdate, onSave) {
    const totalMinutes = (pixelY / config.pixelsPerMinute) + (config.timeSlotsStartHour * 60);
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = Math.floor((totalMinutes % 60) / 15) * 15;
    const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    
    const body = `<div class="space-y-4"><div><label class="text-sm text-gray-400">Activity Type</label><select id="add-event-type" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600"><option value="sports">Sports Activity</option><option value="others">Others</option></select></div><div class="grid grid-cols-2 gap-4"><div><label class="text-sm text-gray-400">Start Time</label><input type="time" id="add-event-start" value="${startTime}" step="900" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600"></div><div><label class="text-sm text-gray-400">End Time</label><input type="time" id="add-event-end" value="${startTime}" step="900" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600"></div></div></div>`;
    const footer = `<div class="flex justify-end space-x-4"><button id="modal-cancel-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Cancel</button><button id="modal-confirm-add-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Add</button></div>`;

    showDialog('Add Activity', body, footer, (dialog) => {
        dialog.addEventListener('click', async e => {
            if (e.target.closest('#modal-cancel-btn')) closeDialog(dialog);
            if (e.target.closest('#modal-confirm-add-btn')) {
                const type = dialog.querySelector('#add-event-type').value;
                const start = dialog.querySelector('#add-event-start').value;
                const end = dialog.querySelector('#add-event-end').value;
                if (start && end) {
                    const btn = e.target.closest('#modal-confirm-add-btn');
                    const originalText = btn.textContent;
                    btn.disabled = true;
                    btn.textContent = 'Saving...';

                    try {
                        if (onSave) {
                            await onSave({ type, start, end });
                        } else {
                            dataSource.availability[dayKey].push({ type, start, end });
                        }
                        onUpdate();
                        closeDialog(dialog);
                    } catch (error) {
                        console.error(error);
                        alert('Failed to add event: ' + error.message);
                    } finally {
                        btn.disabled = false;
                        btn.textContent = originalText;
                    }
                } else {
                    alert('Please set start and end times.');
                }
            }
        });
    });
}

function showEditEventModal(dataSource, dayKey, startTime, onUpdate, onSave, onDelete) {
    const eventList = dataSource.availability[dayKey];
    const eventIndex = eventList.findIndex(e => e.start === startTime);
    if (eventIndex === -1) return;
    const event = eventList[eventIndex];
    
    const body = `<div class="grid grid-cols-2 gap-4"><div><label class="text-sm text-gray-400">Start Time</label><input type="time" id="edit-event-start" value="${event.start}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600"></div><div><label class="text-sm text-gray-400">End Time</label><input type="time" id="edit-event-end" value="${event.end}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600"></div></div><button id="delete-event-btn" class="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">Delete Event</button>`;
    const footer = `<div class="flex justify-end space-x-4"><button id="modal-cancel-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Cancel</button><button id="modal-confirm-edit-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Save Changes</button></div>`;

    showDialog(`Edit ${event.type} Activity`, body, footer, (dialog) => {
        dialog.addEventListener('click', async e => {
            const target = e.target.closest('button');
            if (!target) return;
            if (target.id === 'modal-cancel-btn') closeDialog(dialog);
            else if (target.id === 'modal-confirm-edit-btn') {
                const newStart = dialog.querySelector('#edit-event-start').value;
                const newEnd = dialog.querySelector('#edit-event-end').value;
                
                target.disabled = true;
                target.textContent = 'Saving...';
                try {
                    if (onSave) {
                        await onSave({ ...event, start: newStart, end: newEnd });
                    } else {
                        eventList[eventIndex] = { ...event, start: newStart, end: newEnd };
                    }
                    onUpdate();
                    closeDialog(dialog);
                } catch (error) {
                    alert('Failed to update: ' + error.message);
                } finally {
                    target.disabled = false;
                    target.textContent = 'Save Changes';
                }
            } else if (target.id === 'delete-event-btn') {
                target.disabled = true;
                target.textContent = 'Deleting...';
                try {
                    if (onDelete) {
                        await onDelete(event);
                    } else {
                        eventList.splice(eventIndex, 1);
                    }
                    onUpdate();
                    closeDialog(dialog);
                } catch (error) {
                    alert('Failed to delete: ' + error.message);
                } finally {
                    target.disabled = false;
                    target.textContent = 'Delete Event';
                }
            }
        });
    });
}

function showSetAllTimesModal(dataSource, type, onUpdate, onSave) {
    const defaultTimes = type === 'school' ? config.defaultSchoolTimes : config.defaultSleepTimes;
    const body = `<div class="grid grid-cols-2 gap-4"><div><label class="text-sm text-gray-400">Start Time</label><input type="time" id="set-all-start" value="${defaultTimes.start}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600"></div><div><label class="text-sm text-gray-400">End Time</label><input type="time" id="set-all-end" value="${defaultTimes.end}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600"></div></div>`;
    const footer = `<div class="flex justify-end space-x-4"><button id="modal-cancel-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Cancel</button><button id="modal-confirm-set-all-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Apply to All Days</button></div>`;

    showDialog(`Set All ${type.charAt(0).toUpperCase() + type.slice(1)} Times`, body, footer, (dialog) => {
        dialog.addEventListener('click', async e => {
            if (e.target.closest('#modal-cancel-btn')) closeDialog(dialog);
            if (e.target.closest('#modal-confirm-set-all-btn')) {
                const newStart = dialog.querySelector('#set-all-start').value;
                const newEnd = dialog.querySelector('#set-all-end').value;
                const btn = e.target.closest('#modal-confirm-set-all-btn');
                
                btn.disabled = true;
                btn.textContent = 'Applying...';

                try {
                    if (onSave) {
                        await onSave(type, newStart, newEnd);
                    } else {
                        // Local logic for Wizard
                        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
                        const daysToUpdate = type === 'school' ? weekdays : config.daysOfWeek;
                        
                        daysToUpdate.forEach(day => {
                            const dayKey = day.toLowerCase();
                            const eventIndex = dataSource.availability[dayKey].findIndex(event => event.type === type);
                            if (eventIndex > -1) {
                                dataSource.availability[dayKey][eventIndex].start = newStart;
                                dataSource.availability[dayKey][eventIndex].end = newEnd;
                            } else {
                                dataSource.availability[dayKey].push({ type, start: newStart, end: newEnd });
                            }
                        });
                    }
                    onUpdate();
                    closeDialog(dialog);
                } catch (error) {
                    console.error(error);
                    alert('Failed to apply changes: ' + error.message);
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Apply to All Days';
                }
            }
        });
    });
}


export function renderTimetableComponent(isWizard, dataSource, tuitions = []) {
    const dayKey = config.daysOfWeek[appState.currentTimetableDay].toLowerCase();
    const availability = dataSource.availability ? (dataSource.availability[dayKey] || []) : [];
    const tuitionsForDay = isWizard ? [] : tuitions.filter(t => t.day === dayKey);

    let timeLabelsHTML = '';
    for (let hour = config.timeSlotsStartHour; hour < 24 + config.timeSlotsStartHour; hour++) {
        const displayHour = hour % 24;
        let formattedHour = displayHour % 12;
        if (formattedHour === 0) formattedHour = 12;
        timeLabelsHTML += `<div class="time-label text-right pr-2 text-xs text-gray-500 border-t border-gray-700 flex items-center justify-end">${formattedHour} ${displayHour >= 12 ? 'PM' : 'AM'}</div>`;
    }

    const timeToPixels = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        let totalMinutes = h * 60 + m;
        if (h < config.timeSlotsStartHour) {
            totalMinutes += 24 * 60;
        }
        return (totalMinutes - (config.timeSlotsStartHour * 60)) * config.pixelsPerMinute;
    };
    
    const createBubble = (event, top, height) => {
        if (height <= 0) return '';
        const isTuition = !!event.subject;
        const type = isTuition ? 'tuition' : event.type;
        const color = config.colors[type] || config.colors.others;
        const text = isTuition ? event.subject : event.type;
        const cursorClass = type !== 'tuition' && isWizard ? 'cursor-pointer' : '';

        return `<div class="event-bubble ${cursorClass} hover:opacity-80" style="background-color: ${color}; top: ${top}px; height: ${height}px;" data-type="${type}" data-start="${event.start}" data-end="${event.end}" data-id="${event.id || ''}">
                    <p class="font-bold capitalize">${text}</p>
                    <p>${event.start} - ${event.end}</p>
                </div>`;
    };

    const eventBubblesHTML = [...availability, ...tuitionsForDay].map(event => {
        if (!event.start || !event.end) return '';
        const top = timeToPixels(event.start);
        const bottom = timeToPixels(event.end);
        if (bottom < top) { // Overnight event
            const endOfGridPixels = 24 * 60 * config.pixelsPerMinute;
            const part1Height = endOfGridPixels - top;
            const part2Height = bottom;
            return createBubble(event, top, part1Height) + createBubble(event, 0, part2Height);
        }
        return createBubble(event, top, bottom - top);
    }).join('');

    const wizardButtons = isWizard ? `
        <div class="flex space-x-2 mb-4">
            <button class="set-all-times-btn flex-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-md py-2" data-type="school"><i class="fas fa-school mr-2"></i> Set All School Times</button>
            <button class="set-all-times-btn flex-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-md py-2" data-type="sleep"><i class="fas fa-bed mr-2"></i> Set All Sleep Times</button>
        </div>` : '';

    return `
        <div class="timetable-component">
            ${wizardButtons}
            ${!isWizard ? renderStudentSelector() : ''}
            <div class="flex justify-between items-center p-4 bg-gray-800 rounded-lg mb-4">
                <button class="day-nav-btn p-2 rounded-md hover:bg-gray-700" data-direction="-1"><i class="fas fa-chevron-left"></i></button>
                <h3 class="text-xl font-semibold">${config.daysOfWeek[appState.currentTimetableDay]}</h3>
                <button class="day-nav-btn p-2 rounded-md hover:bg-gray-700" data-direction="1"><i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="flex">
                <div class="w-16 flex-shrink-0">${timeLabelsHTML}</div>
                <div class="timetable-grid flex-grow bg-gray-800/50 rounded-lg" id="timetable-grid-main" data-day-key="${dayKey}">
                    ${eventBubblesHTML}
                </div>
            </div>
        </div>`;
}

// THIS FUNCTION IS UPDATED to accept a studentId
export async function renderTimetablePage() {
    // ADDED: A guard for the teacher role, as this page is not intended for them.
    if (appState.currentUser?.role === 'teacher') {
        return `<div class="text-center p-8 text-gray-400">Timetable view is not applicable for teachers. Please use the "Tuition Logs" and "Payment Logs" pages.</div>`;
    }

    // For students, their ID is the currentUser ID. For parents, it's the currentStudent ID.
    const studentIdForCheck = appState.currentUser.role === 'student'
        ? appState.currentUser.id
        : appState.currentStudent?.id;

    if (!studentIdForCheck) {
        if (appState.currentUser?.role === 'parent') {
            return `<div class="text-center p-8 text-gray-400">No student selected. Please add or select a student from the 'Student Info' page.</div>`;
        }
        return `<div class="text-center p-8 text-gray-400">Loading timetable...</div>`;
    }
    
    try {
        const allTuitions = await fetchTimetable();
        // The data source for the timetable component depends on the user's role
        const dataSource = appState.currentUser.role === 'parent' ? appState.currentStudent : appState.currentUser;
        
        // For parents, the backend returns all children's tuitions, so we filter for the selected student.
        const tuitions = appState.currentUser.role === 'parent'
            ? allTuitions.filter(t => t.student_id === appState.currentStudent.id)
            : allTuitions;

        return renderTimetableComponent(false, dataSource, tuitions);
    } catch (error) {
        console.error("Error fetching timetable:", error);
        return `<div class="text-center text-red-400 p-8">Error loading timetable: ${error.message}</div>`;
    }
}

export const wizardTimetableHandlers = {
    showAddEventModal,
    showEditEventModal,
    showSetAllTimesModal
};
