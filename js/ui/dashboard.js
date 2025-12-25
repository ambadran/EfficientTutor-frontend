import { appState } from '../config.js';
import { fetchFinancialSummary, fetchTimetable, fetchTuitions } from '../api.js';
import { navigateTo } from './navigation.js';

/**
 * ==========================================
 * DASHBOARD CONFIGURATION & WIDGET SYSTEM
 * ==========================================
 * 
 * To add a new widget:
 * 1. Define the widget object in the `WIDGETS` constant.
 *    It must have:
 *      - id: Unique string ID.
 *      - render: Async function returning HTML string.
 *      - fetchData: (Optional) Async function to pre-fetch data.
 * 2. Add the widget's ID to the `DASHBOARD_LAYOUT` for the desired roles.
 */

// --- 1. Layout Configuration ---
const DASHBOARD_LAYOUT = {
    teacher: ['welcome_banner', 'next_lesson', 'financial_snapshot', 'quick_actions'],
    parent: ['welcome_banner', 'next_lesson', 'financial_snapshot', 'quick_actions'],
    student: ['welcome_banner', 'next_lesson', 'quick_actions']
};

// --- 2. Widget Definitions ---
const WIDGETS = {
    welcome_banner: {
        id: 'welcome_banner',
        render: async (data) => {
            const user = appState.currentUser;
            const hour = new Date().getHours();
            let greeting = 'Good Morning';
            if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
            else if (hour >= 17) greeting = 'Good Evening';

            return `
                <div class="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl p-6 text-white shadow-lg mb-6">
                    <h1 class="text-2xl font-bold">${greeting}, ${user.first_name}!</h1>
                    <p class="opacity-90 mt-1">Ready to be efficient today?</p>
                </div>
            `;
        }
    },

    next_lesson: {
        id: 'next_lesson',
        fetchData: async () => {
            // Fetch timetable to find next occurrence
            try {
                const slots = await fetchTimetable(appState.currentUser.role === 'student' ? appState.currentUser.id : null);
                // Filter for future tuition slots
                const now = new Date();
                const upcoming = slots
                    .filter(s => s.slot_type === 'Tuition' && s.next_occurrence_start && new Date(s.next_occurrence_start) > now)
                    .sort((a, b) => new Date(a.next_occurrence_start) - new Date(b.next_occurrence_start));
                
                return upcoming.length > 0 ? upcoming[0] : null;
            } catch (e) {
                console.error("Error fetching next lesson:", e);
                return null;
            }
        },
        render: async (nextSlot) => {
            if (!nextSlot) {
                return `
                    <div class="bg-gray-800 p-5 rounded-lg border border-gray-700 shadow-sm mb-6">
                        <div class="flex items-center text-gray-400">
                            <div class="bg-gray-700 p-3 rounded-full mr-4"><i class="fas fa-calendar-check"></i></div>
                            <div>
                                <h3 class="font-semibold text-gray-200">No Upcoming Lessons</h3>
                                <p class="text-xs">You are free for now!</p>
                            </div>
                        </div>
                    </div>`;
            }

            const date = new Date(nextSlot.next_occurrence_start);
            const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            
            // Resolve subject name if possible
            let subject = nextSlot.name || 'Tuition';

            return `
                <div class="bg-gray-800 p-5 rounded-lg border-l-4 border-indigo-500 shadow-sm mb-6 relative overflow-hidden">
                    <div class="relative z-10">
                        <p class="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-1">Up Next</p>
                        <h3 class="text-xl font-bold text-white mb-1">${subject}</h3>
                        <p class="text-gray-300 text-sm mb-3"><i class="far fa-clock mr-2"></i>${timeStr} &bull; ${dateStr}</p>
                        <button class="view-timetable-link text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md transition-colors">
                            View Schedule
                        </button>
                    </div>
                    <i class="fas fa-hourglass-half absolute -bottom-4 -right-4 text-6xl text-gray-700 opacity-20"></i>
                </div>
            `;
        }
    },

    financial_snapshot: {
        id: 'financial_snapshot',
        fetchData: async () => {
            try {
                // Fetch summary with no filters (global for the user)
                return await fetchFinancialSummary({});
            } catch (e) {
                return null;
            }
        },
        render: async (summary) => {
            if (!summary) return '';
            const currency = appState.currentUser?.currency || 'kwd';
            const role = appState.currentUser.role;

            let mainStatLabel = 'Balance';
            let mainStatValue = '0';
            let mainStatColor = 'text-white';
            let subStats = '';

            if (role === 'teacher') {
                mainStatLabel = 'Owed To You';
                mainStatValue = `${summary.total_owed_to_teacher} ${currency}`;
                mainStatColor = 'text-green-400';
                subStats = `
                    <div class="flex justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                        <span>Unpaid Lessons: <span class="text-white">${summary.unpaid_lessons_count}</span></span>
                        <span>This Month: <span class="text-white">${summary.total_lessons_given_this_month}</span> lessons</span>
                    </div>`;
            } else {
                mainStatLabel = 'Amount Due';
                mainStatValue = `${summary.total_due} ${currency}`;
                mainStatColor = summary.total_due > 0 ? 'text-red-400' : 'text-green-400';
                subStats = `
                    <div class="flex justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                        <span>Unpaid: <span class="text-white">${summary.unpaid_count}</span></span>
                        <span>Credit: <span class="text-white">${summary.credit_balance} ${currency}</span></span>
                    </div>`;
            }

            return `
                <div class="bg-gray-800 p-5 rounded-lg shadow-sm mb-6 border border-gray-700">
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Financial Overview</p>
                    <div class="flex items-baseline">
                        <h3 class="text-2xl font-bold ${mainStatColor}">${mainStatValue}</h3>
                    </div>
                    ${subStats}
                    <button class="view-logs-link w-full mt-3 text-center text-xs text-indigo-400 hover:text-indigo-300 font-medium">View Detailed Logs <i class="fas fa-arrow-right ml-1"></i></button>
                </div>
            `;
        }
    },

    quick_actions: {
        id: 'quick_actions',
        render: async () => {
            const role = appState.currentUser.role;
            let buttons = [];

            if (role === 'teacher') {
                buttons = [
                    { icon: 'fa-plus', label: 'Add Log', action: 'add-log', color: 'bg-green-600' },
                    { icon: 'fa-calendar-alt', label: 'Schedule', action: 'view-timetable', color: 'bg-indigo-600' },
                    { icon: 'fa-users', label: 'Students', action: 'view-students', color: 'bg-purple-600' },
                    { icon: 'fa-money-check-alt', label: 'Payments', action: 'view-payments', color: 'bg-blue-600' },
                ];
            } else if (role === 'parent') {
                buttons = [
                    { icon: 'fa-calendar-alt', label: 'Timetable', action: 'view-timetable', color: 'bg-indigo-600' },
                    { icon: 'fa-file-invoice-dollar', label: 'History', action: 'view-logs', color: 'bg-green-600' },
                    { icon: 'fa-user-graduate', label: 'Students', action: 'view-students', color: 'bg-purple-600' },
                    { icon: 'fa-book-open', label: 'Notes', action: 'view-notes', color: 'bg-yellow-600' },
                ];
            } else {
                buttons = [
                    { icon: 'fa-calendar-alt', label: 'Timetable', action: 'view-timetable', color: 'bg-indigo-600' },
                    { icon: 'fa-book-open', label: 'Notes', action: 'view-notes', color: 'bg-yellow-600' },
                    { icon: 'fa-user-circle', label: 'Profile', action: 'view-profile', color: 'bg-gray-600' },
                ];
            }

            const buttonsHTML = buttons.map(btn => `
                <button class="dashboard-action-btn flex flex-col items-center justify-center p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700" data-action="${btn.action}">
                    <div class="${btn.color} w-10 h-10 rounded-full flex items-center justify-center text-white mb-2 shadow-lg">
                        <i class="fas ${btn.icon}"></i>
                    </div>
                    <span class="text-xs font-medium text-gray-300">${btn.label}</span>
                </button>
            `).join('');

            return `
                <div class="mb-6">
                    <h3 class="text-lg font-bold text-white mb-3">Quick Actions</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        ${buttonsHTML}
                    </div>
                </div>
            `;
        }
    }
};

/**
 * Renders the dashboard based on the current user's role.
 */
export async function renderDashboardPage() {
    const role = appState.currentUser?.role;
    if (!role || !DASHBOARD_LAYOUT[role]) {
        return `<div class="text-center p-8 text-gray-400">Dashboard not available for this role.</div>`;
    }

    const widgetIds = DASHBOARD_LAYOUT[role];
    let dashboardHTML = '<div class="max-w-4xl mx-auto animate-fade-in">';

    // Render widgets sequentially to maintain order
    for (const widgetId of widgetIds) {
        const widget = WIDGETS[widgetId];
        if (widget) {
            try {
                let data = null;
                if (widget.fetchData) {
                    data = await widget.fetchData();
                }
                dashboardHTML += await widget.render(data);
            } catch (error) {
                console.error(`Error rendering widget ${widgetId}:`, error);
                dashboardHTML += `<div class="p-4 mb-4 text-red-400 text-sm bg-gray-800 rounded">Error loading widget.</div>`;
            }
        }
    }

    dashboardHTML += '</div>';
    
    // Attach event delegation (hacky but effective for simple dashboard)
    setTimeout(() => {
        attachDashboardListeners();
    }, 0);

    return dashboardHTML;
}

function attachDashboardListeners() {
    const container = document.getElementById('page-content');
    if (!container) return;

    // Use a named function to avoid duplicates if called multiple times, 
    // but in our SPA architecture, we rely on main.js global listener mostly.
    // However, for specific dashboard actions, we can add a transient listener 
    // OR ideally, add these cases to the GLOBAL listener in main.js. 
    // Per architecture rules, we should use global delegation. 
    // So we will NOT attach listeners here. We will handle 'dashboard-action-btn' in main.js.
}
