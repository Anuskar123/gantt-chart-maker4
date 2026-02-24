import { Algorithms } from './algorithms.js';
import { Utils } from './utils.js';

export class TaskModel {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('gantt_tasks')) || [];
    }

    addTask(taskData) {
        // Smart Input Logic: Calculate End Date
        let start = taskData.start;
        // If dependency exists, we might need to adjust start immediately?
        // Let's rely on autoSchedule to fix it after adding.

        const endDate = Utils.addDays(start, taskData.duration);

        const newTask = {
            id: Date.now().toString(),
            name: taskData.name,
            start: start,
            end: Utils.formatDate(endDate),
            duration: parseInt(taskData.duration),
            gap: parseInt(taskData.gap) || 0,
            progress: parseInt(taskData.progress) || 0,
            dependencyId: taskData.dependencyId || null,
            status: 'todo',
            sprintId: null
        };

        this.tasks.push(newTask);

        // Run Auto-Schedule
        Algorithms.autoSchedule(this.tasks);

        this.save();
        return newTask;
    }

    updateTask(id, updates) {
        const task = this.getTaskById(id);
        if (!task) return;

        // If Start or Duration changes, recalculate End
        if (updates.start || updates.duration) {
            const start = updates.start || task.start;
            const duration = updates.duration || task.duration;
            const endDate = Utils.addDays(start, duration);
            updates.end = Utils.formatDate(endDate);
        }

        Object.assign(task, updates);
        this.save();
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.save();
    }

    getTasks() {
        return this.tasks;
    }

    getTaskById(id) {
        return this.tasks.find(t => t.id === id);
    }

    save() {
        localStorage.setItem('gantt_tasks', JSON.stringify(this.tasks));
    }

    // Helper to get total project range
    getProjectRange() {
        if (this.tasks.length === 0) {
            const start = new Date();
            start.setHours(0, 0, 0, 0); // normalize
            const end = Utils.addDays(start, 30);
            return { start, end };
        }

        const startDates = this.tasks.map(t => new Date(t.start));
        const endDates = this.tasks.map(t => new Date(t.end));

        const minDate = new Date(Math.min(...startDates));
        const maxDate = new Date(Math.max(...endDates));

        // Normalize time
        minDate.setHours(0, 0, 0, 0);
        maxDate.setHours(0, 0, 0, 0);

        // Add some padding
        minDate.setDate(minDate.getDate() - 2);
        maxDate.setDate(maxDate.getDate() + 10); // More padding at end

        return { start: minDate, end: maxDate };
    }
}
