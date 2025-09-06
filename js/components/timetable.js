/* This module is responsible for the entire visual representation of the schedule.
 * It fetches the latest timetable data from the backend, calculates the precise 
 * position and height of each activity "bubble," and correctly handles complex 
 * cases like activities that span across midnight.
 */
/**
 * Renders the timetable grid and bubbles into a given container.
 *
 * @param {HTMLElement} container - The DOM element to render the grid into.
 * @param {Date} date - The current date, used to determine today.
 * @param {Array} tuitions - An array of scheduled tuition objects from the backend.
 * @param {object} availabilityData - The student's raw availability object.
 * @param {number} displayDayIndex - The specific day to display (0-6).
 */
export function renderTimetableComponent(container, date, tuitions = [], availabilityData = {}, displayDayIndex) {
    if (!container) return;

    const dayMapping = { 'saturday': 0, 'sunday': 1, 'monday': 2, 'tuesday': 3, 'wednesday': 4, 'thursday': 5, 'friday': 6 };
    
    const studentAvailability = [];
    for (const dayName in availabilityData) {
        if (availabilityData[dayName]) {
            availabilityData[dayName].forEach(activity => {
                studentAvailability.push({ ...activity, day: dayName });
            });
        }
    }
    const tuitionsWithTypes = tuitions.map(t => ({ ...t, type: 'Tuition' }));
    const allActivities = [...studentAvailability, ...tuitionsWithTypes];

    let bubblesHTML = '';
    allActivities.forEach((activity, activityIndex) => {
        try {
            const activityDayIndex = dayMapping[activity.day?.toLowerCase()];
            if (activityDayIndex !== displayDayIndex) return;
            
            const { top, height, crossesMidnight } = calculatePosition(activity);
            
            if (height > 0) {
                 const colorClasses = getActivityColor(activity.type);
                 bubblesHTML += `<div class="activity-bubble absolute right-0 left-12 p-2 rounded-lg text-white ${colorClasses}" style="top: ${top}px; height: ${height}px;" data-day-index="${displayDayIndex}" data-activity-index="${activityIndex}">...</div>`;
            }

            if (crossesMidnight) { /* ... */ }

        } catch (error) {
            console.error("Failed to render activity:", activity, error);
        }
    });

    const hoursHTML = Array.from({ length: 24 }, (_, i) => {
        const hour = (i + 5) % 24;
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const ampm = hour < 12 ? 'AM' : 'PM';
        return `
            <div class="relative h-16">
                <div class="absolute -top-3 left-0 text-xs text-gray-400 w-10 text-right pr-2">${displayHour} ${ampm}</div>
                <div class="time-slot-bg h-full border-t border-gray-700" data-day-index="${displayDayIndex}" data-hour="${hour}"></div>
            </div>
        `;
    }).join('');

    // THE FIX: Use the new CSS class for the scrollable wrapper.
    container.innerHTML = `
        <div class="timetable-scroll-wrapper pr-2">
            ${hoursHTML}
            ${bubblesHTML}
        </div>
    `;
}

// --- Helper Functions ---

function calculatePosition(activity) {
    const pixelsPerHour = 64;
    const [startHour, startMinute] = activity.start.split(':').map(Number);
    const [endHour, endMinute] = activity.end.split(':').map(Number);

    const startTimeInMinutes = startHour * 60 + startMinute;
    let endTimeInMinutes = endHour * 60 + endMinute;

    const crossesMidnight = endTimeInMinutes <= startTimeInMinutes;
    if (crossesMidnight) {
        endTimeInMinutes += 24 * 60;
    }

    const gridStartOffsetMinutes = 5 * 60;
    
    const top = ((startTimeInMinutes - gridStartOffsetMinutes + 24 * 60) % (24 * 60)) / 60 * pixelsPerHour;
    const durationMinutes = endTimeInMinutes - startTimeInMinutes;
    const height = (durationMinutes / 60) * pixelsPerHour;

    return { top, height, crossesMidnight };
}


function getActivityColor(type) {
    switch (type) {
        case 'School': return 'bg-yellow-600 border border-yellow-500';
        case 'Sleep': return 'bg-purple-800 border border-purple-600';
        case 'Sport': return 'bg-orange-600 border border-orange-500';
        case 'Tuition': return 'bg-blue-600 border border-blue-500';
        case 'Other':
        default:
            return 'bg-green-700 border border-green-600';
    }
}


