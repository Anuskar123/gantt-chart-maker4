/**
 * GANTT CHART MAKER - BUNDLED SCRIPT
 * Split View Edition with Hierarchical Headers & Export
 */

// ==========================================
// UTILS
// ==========================================
class Utils {
    static formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    static addDays(dateStr, days) {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + parseInt(days));
        return date;
    }

    static getDaysDiff(start, end) {
        const date1 = new Date(start);
        const date2 = new Date(end);
        const diffTime = Math.abs(date2 - date1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
}

// ==========================================
// ALGORITHMS
// ==========================================
class Algorithms {
    static autoSchedule(tasks) {
        let changed = false;
        const taskMap = new Map(tasks.map(t => [t.id, t]));

        tasks.forEach(task => {
            if (task.dependencyId && taskMap.has(task.dependencyId)) {
                const parent = taskMap.get(task.dependencyId);
                const gap = parseInt(task.gap) || 0;

                const newStart = Utils.addDays(parent.end, gap + 1);
                const currentStart = new Date(task.start);

                if (currentStart < newStart) {
                    task.start = Utils.formatDate(newStart);
                    const newEnd = Utils.addDays(task.start, task.duration);
                    task.end = Utils.formatDate(newEnd);
                    changed = true;
                }
            }
        });
        return changed;
    }
}

// ==========================================
// TASK MODEL
// ==========================================
class TaskModel {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('gantt_tasks')) || [];
    }

    addTask(taskData) {
        let start = taskData.start;
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
            status: 'todo'
        };

        this.tasks.push(newTask);
        Algorithms.autoSchedule(this.tasks);
        this.save();
        return newTask;
    }

    updateTask(id, updates) {
        const task = this.getTaskById(id);
        if (!task) return;

        if (updates.start || updates.duration) {
            const start = updates.start || task.start;
            const duration = updates.duration || task.duration;
            const endDate = Utils.addDays(start, duration);
            updates.end = Utils.formatDate(endDate);
        }

        Object.assign(task, updates);
        Algorithms.autoSchedule(this.tasks);
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

    getProjectRange() {
        if (this.tasks.length === 0) {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = Utils.addDays(start, 30);
            return { start, end };
        }

        const startDates = this.tasks.map(t => new Date(t.start));
        const endDates = this.tasks.map(t => new Date(t.end));

        const minDate = new Date(Math.min(...startDates));
        const maxDate = new Date(Math.max(...endDates));

        minDate.setHours(0, 0, 0, 0);
        maxDate.setHours(0, 0, 0, 0);

        // Default buffering
        minDate.setDate(minDate.getDate() - 5);
        maxDate.setDate(maxDate.getDate() + 20);

        return { start: minDate, end: maxDate };
    }
}

// ==========================================
// CHART VIEW
// ==========================================
class ChartView {
    constructor(model) {
        this.gridBody = document.getElementById('grid-body');
        this.chartScrollContainer = document.getElementById('gantt-body-scroll');
        this.chartBody = document.getElementById('gantt-body');
        this.chartHeader = document.getElementById('gantt-header');

        this.model = model;
        this.dayWidth = 40;

        // Sync Scrolling
        if (this.chartScrollContainer && this.gridBody) {
            this.chartScrollContainer.addEventListener('scroll', () => {
                this.gridBody.scrollTop = this.chartScrollContainer.scrollTop;
                this.chartHeader.style.transform = `translateX(-${this.chartScrollContainer.scrollLeft}px)`;
            });
        }
    }

    render() {
        // Set dayWidth based on active view mode
        if (window.currentViewMode === 'months') {
            this.dayWidth = 4;
        } else if (window.currentViewMode === 'weeks') {
            this.dayWidth = 12;
        } else {
            this.dayWidth = 40; // days
        }

        // Update CSS variable so the background grid pattern scales correctly
        document.documentElement.style.setProperty('--day-width', `${this.dayWidth}px`);

        const tasks = this.model.getTasks();

        // Check for Manual Overrides from Inputs
        const startInput = document.getElementById('view-start');
        const endInput = document.getElementById('view-end');

        let dateRange = this.model.getProjectRange();

        // If inputs exist and have values, override auto-range
        if (startInput && startInput.value) {
            dateRange.start = new Date(startInput.value);
            // reset hours to 0
            dateRange.start.setHours(0, 0, 0, 0);
        } else if (startInput) {
            // Populate input with auto value so user sees it
            startInput.value = Utils.formatDate(dateRange.start);
        }

        if (endInput && endInput.value) {
            dateRange.end = new Date(endInput.value);
            dateRange.end.setHours(0, 0, 0, 0);
        } else if (endInput) {
            endInput.value = Utils.formatDate(dateRange.end);
        }

        this.startDate = dateRange.start;
        this.endDate = dateRange.end;

        // Safety check to ensure start < end
        if (this.startDate > this.endDate) {
            const temp = this.startDate;
            this.startDate = this.endDate;
            this.endDate = temp;
        }

        this.totalDays = Math.max(1, Utils.getDaysDiff(this.startDate, this.endDate) + 1);

        this.renderHeader();
        this.renderGrid(tasks);
        this.renderTimeline(tasks);
    }

    renderHeader() {
        if (!this.chartHeader) return;
        this.chartHeader.innerHTML = '';

        let currentDate = new Date(this.startDate);
        const totalWidth = this.totalDays * this.dayWidth;
        this.chartHeader.style.width = `max(100%, ${totalWidth}px)`;

        // Create Rows
        const monthRow = document.createElement('div'); monthRow.className = 'header-row';
        const weekRow = document.createElement('div'); weekRow.className = 'header-row';
        const dayRow = document.createElement('div'); dayRow.className = 'header-row';

        // Arrays to hold groups
        let months = []; // { name, width }
        let weeks = []; // { name, width }

        let currentMonth = null;
        let currentWeekKey = null; // Key like "Nov-Week 1"
        let monthWidth = 0;
        let weekWidth = 0;

        for (let i = 0; i < this.totalDays; i++) {
            // Day Logic
            if (window.currentViewMode === 'days') {
                const dayCell = document.createElement('div');
                dayCell.className = 'header-cell';
                dayCell.style.width = `${this.dayWidth}px`;
                dayCell.textContent = currentDate.getDate();

                const dayOfWeek = currentDate.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    dayCell.style.backgroundColor = '#ebecf0';
                }
                dayRow.appendChild(dayCell);
            }

            // Month Logic
            const monthName = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            if (monthName !== currentMonth) {
                if (currentMonth !== null) {
                    months.push({ name: currentMonth, width: monthWidth });
                }
                currentMonth = monthName;
                monthWidth = 0;
            }
            monthWidth += this.dayWidth;

            // Week Logic (Week 1, Week 2...) relative to month
            const dateNum = currentDate.getDate();
            const weekNum = Math.ceil(dateNum / 7);
            const weekLabel = `Week ${weekNum}`;
            const uniqueWeekKey = `${monthName}-${weekLabel}`;

            if (uniqueWeekKey !== currentWeekKey) {
                if (currentWeekKey !== null) {
                    const labelToShow = currentWeekKey.split('-')[1];
                    weeks.push({ name: labelToShow, width: weekWidth });
                }
                currentWeekKey = uniqueWeekKey;
                weekWidth = 0;
            }
            weekWidth += this.dayWidth;

            // Increment
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Push remainders
        if (monthWidth > 0) months.push({ name: currentMonth, width: monthWidth });
        if (weekWidth > 0 && currentWeekKey) weeks.push({ name: currentWeekKey.split('-')[1], width: weekWidth });

        // Render Month Row
        months.forEach(m => {
            const cell = document.createElement('div');
            cell.className = 'header-cell';
            cell.style.width = `${m.width}px`;
            cell.textContent = m.name;
            cell.style.fontWeight = 'bold';
            monthRow.appendChild(cell);
        });

        // Render Week Row
        if (window.currentViewMode === 'days' || window.currentViewMode === 'weeks' || window.currentViewMode === 'months') {
            weeks.forEach(w => {
                const cell = document.createElement('div');
                cell.className = 'header-cell';
                cell.style.width = `${w.width}px`;
                cell.textContent = w.name;
                // distinct style for week
                cell.style.fontSize = '0.70rem'; // slightly smaller
                // Hide week text if it's too cramped in month view
                if (window.currentViewMode === 'months' && w.width < 30) {
                    cell.textContent = ''; // Just show lines, not text
                }
                weekRow.appendChild(cell);
            });
        }


        this.chartHeader.appendChild(monthRow);

        // Append rows conditionally based on mode
        if (window.currentViewMode === 'months') {
            this.chartHeader.appendChild(weekRow);
            // Hide day row entirely
        } else if (window.currentViewMode === 'weeks') {
            this.chartHeader.appendChild(weekRow);
            // Hide day row entirely
        } else {
            // Days view
            this.chartHeader.appendChild(weekRow);
            this.chartHeader.appendChild(dayRow);
        }
    }

    renderGrid(tasks) {
        if (!this.gridBody) return;
        this.gridBody.innerHTML = '';

        tasks.forEach((task, index) => {
            const row = document.createElement('div');
            row.className = 'grid-row';

            // ID
            row.appendChild(this.createCell(index + 1, 'c-id'));

            // Name (Editable)
            const nameCell = this.createCell(task.name, 'c-name', true);
            nameCell.onblur = (e) => {
                const txt = e.target.innerText;
                if (txt !== task.name) this.updateTask(task.id, { name: txt });
            };
            row.appendChild(nameCell);

            // Start (Editable)
            const startCell = this.createCell(task.start, 'c-start', true);
            startCell.onblur = (e) => this.handleDateEdit(task, e.target.innerText);
            row.appendChild(startCell);

            // Duration (Editable)
            const durCell = this.createCell(task.duration, 'c-dur', true);
            durCell.onblur = (e) => {
                const val = parseInt(e.target.innerText);
                if (val && val > 0 && val !== task.duration)
                    this.updateTask(task.id, { duration: val });
            };
            row.appendChild(durCell);

            // Dep
            row.appendChild(this.createCell(task.dependencyId || '-', 'c-dep'));

            this.gridBody.appendChild(row);
        });
    }

    createCell(content, className, editable = false) {
        const div = document.createElement('div');
        div.className = `grid-cell ${className}`;
        div.textContent = content;
        if (editable) div.contentEditable = true;
        return div;
    }

    updateTask(id, changes) {
        this.model.updateTask(id, changes);
        this.render();
    }

    handleDateEdit(task, newDateStr) {
        const newDate = new Date(newDateStr);
        if (!isNaN(newDate.getTime())) {
            this.updateTask(task.id, { start: Utils.formatDate(newDate) });
        } else {
            this.render(); // Revert
        }
    }

    renderTimeline(tasks) {
        if (!this.chartBody) return;
        this.chartBody.innerHTML = '';
        this.chartBody.style.width = `max(100%, ${this.totalDays * this.dayWidth}px)`;

        tasks.forEach(task => {
            const row = document.createElement('div');
            row.className = 'gantt-row';

            const daysFromStart = Utils.getDaysDiff(this.startDate, task.start);
            const left = daysFromStart * this.dayWidth;
            const width = task.duration * this.dayWidth;

            const bar = document.createElement('div');
            bar.className = 'task-bar';
            bar.dataset.taskId = task.id;
            bar.style.left = `${left}px`;
            bar.style.width = `${width}px`;

            const progress = document.createElement('div');
            progress.className = 'task-progress-fill';
            progress.style.width = `${task.progress}%`;

            const label = document.createElement('span');
            label.className = 'task-label';
            label.textContent = task.name;

            bar.appendChild(progress);
            bar.appendChild(label);
            row.appendChild(bar);

            bar.addEventListener('mousedown', (e) => this.handleDragStart(e, task));

            this.chartBody.appendChild(row);
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
        const snappedLeft = Math.round(newLeft / this.dayWidth) * this.dayWidth;
        const bar = document.querySelector(`[data-task-id="${this.draggingTask.id}"]`);
        if (bar) bar.style.left = `${snappedLeft}px`;
    }

    handleDragEnd(e) {
        if (!this.draggingTask) return;
        const dx = e.clientX - this.startX;
        const daysMoved = Math.round(dx / this.dayWidth);

        if (daysMoved !== 0) {
            const currentStart = new Date(this.draggingTask.start);
            const newStart = Utils.addDays(currentStart, daysMoved);
            this.model.updateTask(this.draggingTask.id, { start: Utils.formatDate(newStart) });
            this.render();
        } else {
            const bar = document.querySelector(`[data-task-id="${this.draggingTask.id}"]`);
            if (bar) bar.style.cursor = 'grab';
        }

        document.removeEventListener('mousemove', this.boundHandleDrag);
        document.removeEventListener('mouseup', this.boundHandleDragEnd);
        this.draggingTask = null;
    }
}

// ==========================================
// APP INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Gantt Chart Maker (Split View) Initialized');

    // Toggle Rotation
    window.toggleRotation = function () {
        document.body.classList.toggle('rotated');
    };

    const taskModel = new TaskModel();
    const chartView = new ChartView(taskModel);

    // View Mode Management
    window.currentViewMode = 'days';
    window.setViewMode = function (mode) {
        window.currentViewMode = mode;

        // Update button active states
        const btnDays = document.getElementById('btn-view-days');
        const btnWeeks = document.getElementById('btn-view-weeks');
        const btnMonths = document.getElementById('btn-view-months');

        if (btnDays) {
            btnDays.style.backgroundColor = mode === 'days' ? 'var(--primary-color)' : '';
            btnDays.style.color = mode === 'days' ? 'white' : '';
            btnDays.style.borderColor = mode === 'days' ? 'var(--primary-color)' : '';
        }
        if (btnWeeks) {
            btnWeeks.style.backgroundColor = mode === 'weeks' ? 'var(--primary-color)' : '';
            btnWeeks.style.color = mode === 'weeks' ? 'white' : '';
            btnWeeks.style.borderColor = mode === 'weeks' ? 'var(--primary-color)' : '';
        }
        if (btnMonths) {
            btnMonths.style.backgroundColor = mode === 'months' ? 'var(--primary-color)' : '';
            btnMonths.style.color = mode === 'months' ? 'white' : '';
            btnMonths.style.borderColor = mode === 'months' ? 'var(--primary-color)' : '';
        }

        chartView.render();
    };

    chartView.render();

    window.addNewTask = function () {
        taskModel.addTask({ name: "New Task", start: Utils.formatDate(new Date()), duration: 1 });
        chartView.render();
    };

    window.loadDemoData = function () {
        if (confirm("Load demo data? (Clears current)")) {
            localStorage.clear();
            taskModel.tasks = [];
            const t1 = taskModel.addTask({ name: "Phase 1: Research", start: Utils.formatDate(new Date()), duration: 5, progress: 100 });
            const t2 = taskModel.addTask({ name: "Phase 2: Design", start: "", duration: 7, dependencyId: t1.id, gap: 0, progress: 40 });
            taskModel.addTask({ name: "Phase 3: Implementation", start: "", duration: 10, dependencyId: t2.id, gap: 2, progress: 0 });
            chartView.render();
        }
    }

    // View Range Listeners
    const startIn = document.getElementById('view-start');
    const endIn = document.getElementById('view-end');
    if (startIn) startIn.addEventListener('change', () => chartView.render());
    if (endIn) endIn.addEventListener('change', () => chartView.render());

    // Task Color Picker
    const colorPicker = document.getElementById('task-color-picker');
    const colorPreviewDot = document.getElementById('color-preview-dot');

    if (colorPicker) {
        // Load saved color if any
        const savedColor = localStorage.getItem('gantt_task_color');
        if (savedColor) {
            colorPicker.value = savedColor;
            document.documentElement.style.setProperty('--task-blue', savedColor);
            if (colorPreviewDot) colorPreviewDot.style.backgroundColor = savedColor;
        }

        colorPicker.addEventListener('input', (e) => {
            const newColor = e.target.value;
            document.documentElement.style.setProperty('--task-blue', newColor);
            if (colorPreviewDot) colorPreviewDot.style.backgroundColor = newColor;
            localStorage.setItem('gantt_task_color', newColor);
        });
    }

    // Export Logic (Robust Full Gantt)
    window.exportChart = function () {
        // Check for library
        if (typeof html2canvas === 'undefined') {
            alert('Export library not loaded. Please wait or reload.');
            return;
        }

        const btn = document.querySelector('button[onclick="exportChart()"]');
        const oldText = btn.innerText;
        btn.innerText = "Processing...";

        // 1. Elements
        const appContainer = document.querySelector('.app-container');
        const appToolbar = document.querySelector('.app-toolbar');
        const splitPane = document.querySelector('.split-pane');
        const paneRight = document.getElementById('pane-right');
        const ganttBodyScroll = document.getElementById('gantt-body-scroll');
        const headerScroll = document.querySelector('.gantt-header-wrapper');

        // Hide toolbar to clean up exported image
        const originalToolbarDisplay = appToolbar ? appToolbar.style.display : '';
        if (appToolbar) appToolbar.style.display = 'none';

        // 2. Save State
        const originalAppWidth = appContainer.style.width || '';
        const originalAppHeight = appContainer.style.height || '';
        const originalSplitPaneWidth = splitPane.style.width || '';
        const originalPaneRightWidth = paneRight.style.width || '';
        const originalOverflows = [
            appContainer.style.overflow,
            splitPane.style.overflow,
            paneRight.style.overflow,
            ganttBodyScroll.style.overflow,
            headerScroll ? headerScroll.style.overflow : ''
        ];
        const originalScroll = ganttBodyScroll.scrollLeft;

        // 3. Expand Constraints
        // Calculate needed width: Left Pane (450) + Timeline Content
        const totalWidth = 450 + ganttBodyScroll.scrollWidth;
        const totalHeight = Math.max(appContainer.scrollHeight, splitPane.scrollHeight + (headerScroll ? headerScroll.scrollHeight : 0) + 50);

        appContainer.style.width = `${totalWidth}px`;
        appContainer.style.height = `${totalHeight}px`; // ensure full height if needed
        appContainer.style.overflow = 'visible';

        splitPane.style.overflow = 'visible';
        paneRight.style.overflow = 'visible';
        ganttBodyScroll.style.overflow = 'visible';
        if (headerScroll) headerScroll.style.overflow = 'visible';

        splitPane.style.width = `${totalWidth}px`;
        paneRight.style.width = `${ganttBodyScroll.scrollWidth}px`;

        // 4. Capture
        setTimeout(() => {
            html2canvas(appContainer, {
                width: totalWidth,
                height: totalHeight,
                scale: 2.5, // Crisp, high quality
                windowWidth: totalWidth, // Mock window size
                windowHeight: totalHeight,
                scrollX: 0,
                scrollY: 0,
                backgroundColor: '#ffffff' // Ensure white background, not transparent
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'gantt-chart-full.png';
                link.href = canvas.toDataURL();
                link.click();

                // 5. Restore
                appContainer.style.width = originalAppWidth;
                appContainer.style.height = originalAppHeight;
                splitPane.style.width = originalSplitPaneWidth;
                paneRight.style.width = originalPaneRightWidth;
                appContainer.style.overflow = originalOverflows[0];
                splitPane.style.overflow = originalOverflows[1];
                paneRight.style.overflow = originalOverflows[2];
                ganttBodyScroll.style.overflow = originalOverflows[3];
                if (headerScroll) headerScroll.style.overflow = originalOverflows[4];
                if (appToolbar) appToolbar.style.display = originalToolbarDisplay;

                ganttBodyScroll.scrollLeft = originalScroll; // Restore scroll pos

                btn.innerText = oldText;

            }).catch(err => {
                console.error(err);
                alert("Export failed: " + err.message);

                // Restore failure state
                appContainer.style.width = originalAppWidth;
                appContainer.style.height = originalAppHeight;
                splitPane.style.width = originalSplitPaneWidth;
                paneRight.style.width = originalPaneRightWidth;
                appContainer.style.overflow = originalOverflows[0];
                splitPane.style.overflow = originalOverflows[1];
                paneRight.style.overflow = originalOverflows[2];
                ganttBodyScroll.style.overflow = originalOverflows[3];
                if (headerScroll) headerScroll.style.overflow = originalOverflows[4];
                if (appToolbar) appToolbar.style.display = originalToolbarDisplay;

                btn.innerText = oldText;
            });
        }, 300); // Small delay to allow browser to reflow layout
    }
});
