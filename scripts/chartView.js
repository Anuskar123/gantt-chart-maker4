import { Utils } from './utils.js';

export class ChartView {
    constructor(containerId, model) {
        this.container = document.getElementById(containerId);
        this.model = model;
        this.header = document.getElementById('gantt-header');
        this.body = document.getElementById('gantt-body');

        // Configuration
        this.dayWidth = 40; // Pixels per day
        this.viewMode = 'week'; // 'day', 'week', 'month'
    }

    render() {
        const tasks = this.model.getTasks();
        const dateRange = this.model.getProjectRange();
        this.startDate = dateRange.start;
        this.endDate = dateRange.end;

        this.totalDays = Utils.getDaysDiff(this.startDate, this.endDate) + 1;

        this.renderHeader();
        this.renderGrid();
        this.renderTasks(tasks);
    }

    renderHeader() {
        this.header.innerHTML = '';
        let currentDate = new Date(this.startDate);

        for (let i = 0; i < this.totalDays; i++) {
            const cell = document.createElement('div');
            cell.className = 'gantt-date-cell';

            // Simple logic: Show Day number
            // In a better version, we'd bundle these by week/month
            cell.textContent = currentDate.getDate();

            // Highlight weekends
            const day = currentDate.getDay();
            if (day === 0 || day === 6) {
                cell.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }

            this.header.appendChild(cell);

            // Next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Ensure body width matches header
        this.body.style.width = `${this.totalDays * this.dayWidth}px`;
    }

    renderGrid() {
        // The grid uses background-image in CSS, 
        // but we need to ensure the container width is correct.
        this.body.innerHTML = ''; // Clear tasks
    }

    renderTasks(tasks) {
        tasks.forEach(task => {
            const row = document.createElement('div');
            row.className = 'gantt-row';

            // Calculate Position
            const daysFromStart = Utils.getDaysDiff(this.startDate, task.start);
            const left = daysFromStart * this.dayWidth;
            const width = task.duration * this.dayWidth;

            // Create Bar
            const bar = document.createElement('div');
            bar.className = 'task-bar';
            bar.dataset.taskId = task.id; // Store ID for drag
            bar.style.left = `${left}px`;
            bar.style.width = `${width}px`;

            // Progress Fill
            const progress = document.createElement('div');
            progress.className = 'task-progress-fill';
            progress.style.width = `${task.progress}%`;

            // Label
            const label = document.createElement('span');
            label.className = 'task-label';
            label.textContent = task.name;

            bar.appendChild(progress);
            bar.appendChild(label);
            row.appendChild(bar);

            // Add Drag Events
            bar.addEventListener('mousedown', (e) => this.handleDragStart(e, task));

            this.body.appendChild(row);
        });
    }

    handleDragStart(e, task) {
        e.preventDefault();
        this.draggingTask = task;
        this.startX = e.clientX;

        // Find the actual task-bar element, in case a child was clicked
        const bar = e.target.closest('.task-bar');
        if (!bar) return;

        this.initialLeft = parseInt(bar.style.left || 0);

        this.boundHandleDrag = this.handleDrag.bind(this);
        this.boundHandleDragEnd = this.handleDragEnd.bind(this);

        document.addEventListener('mousemove', this.boundHandleDrag);
        document.addEventListener('mouseup', this.boundHandleDragEnd);

        bar.style.cursor = 'grabbing';
    }

    handleDrag(e) {
        if (!this.draggingTask) return;

        const dx = e.clientX - this.startX;
        const newLeft = this.initialLeft + dx;

        // Snap to grid (Day Width)
        const snappedLeft = Math.round(newLeft / this.dayWidth) * this.dayWidth;

        // Find the specific DOM element being dragged
        const bar = document.querySelector(`[data-task-id="${this.draggingTask.id}"]`);
        if (bar) {
            bar.style.left = `${snappedLeft}px`;
        }
    }

    handleDragEnd(e) {
        if (!this.draggingTask) return;

        const dx = e.clientX - this.startX;
        const daysMoved = Math.round(dx / this.dayWidth);

        if (daysMoved !== 0) {
            // Update Model
            const currentStart = new Date(this.draggingTask.start);
            const newStart = Utils.addDays(currentStart, daysMoved);

            this.model.updateTask(this.draggingTask.id, {
                start: Utils.formatDate(newStart)
            });

            // Re-render to ensure everything is strict and clean
            this.render();
        } else {
            // Just reset style if no move
            const bar = document.querySelector(`[data-task-id="${this.draggingTask.id}"]`);
            if (bar) bar.style.cursor = 'grab';
        }

        // Cleanup
        document.removeEventListener('mousemove', this.boundHandleDrag);
        document.removeEventListener('mouseup', this.boundHandleDragEnd);
        this.draggingTask = null;
    }
}
