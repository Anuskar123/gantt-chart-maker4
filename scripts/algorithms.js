import { Utils } from './utils.js';

export class Algorithms {
    static autoSchedule(tasks) {
        // Simple Top-Down scheduling
        // We need to sort by dependency order to be correct, 
        // but for now, we'll just iterate and check parents.

        let changed = false;

        // Map for quick lookup
        const taskMap = new Map(tasks.map(t => [t.id, t]));

        tasks.forEach(task => {
            if (task.dependencyId && taskMap.has(task.dependencyId)) {
                const parent = taskMap.get(task.dependencyId);

                // Calculate expected start: Parent End + Gap + 1 Day (next day)
                const parentEnd = new Date(parent.end);
                const gap = parseInt(task.gap) || 0;

                // New Start = ParentEnd + Gap + 1 day
                const newStart = Utils.addDays(parent.end, gap + 1);
                const currentStart = new Date(task.start);

                // If current start is BEFORE the allowed start, push it
                if (currentStart < newStart) {
                    // Update Start
                    task.start = Utils.formatDate(newStart);

                    // Update End (Start + Duration)
                    const newEnd = Utils.addDays(task.start, task.duration);
                    task.end = Utils.formatDate(newEnd);

                    changed = true;
                }
            }
        });

        return changed; // return true if updates were made
    }

    static calculateCriticalPath(tasks) {
        // Implement CPM here
    }

    static generateSprints(tasks, sprintDuration) {
        // Implement Scrum Logic here
    }
}
