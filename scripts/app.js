import { TaskModel } from './taskModel.js';
import { ChartView } from './chartView.js';
import { Utils } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Gantt Chart Maker Initialized');

    // Initialize Core Components
    const taskModel = new TaskModel();
    const chartView = new ChartView('gantt-wrapper', taskModel);

    // Initial Render
    chartView.render();

    // Set default date to today for the input
    document.getElementById('task-start').valueAsDate = new Date();

    // Event Listeners
    document.getElementById('add-task-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('task-name').value;
        const start = document.getElementById('task-start').value;
        const duration = parseInt(document.getElementById('task-duration').value);
        const dependencyId = document.getElementById('task-dependency').value;
        const gap = parseInt(document.getElementById('task-gap').value) || 0;
        const progress = parseInt(document.getElementById('task-progress').value) || 0;

        // Add Task
        taskModel.addTask({
            name,
            start,
            duration,
            dependencyId,
            gap,
            progress
        });

        updateUI();

        // Reset form partially
        document.getElementById('task-name').value = '';
    });

    function updateUI() {
        // Update Chart
        chartView.render();

        // Update Dependency Dropdown
        const select = document.getElementById('task-dependency');
        const tasks = taskModel.getTasks();
        const currentVal = select.value;

        select.innerHTML = '<option value="">-- None --</option>';
        tasks.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = t.name;
            select.appendChild(option);
        });
        select.value = currentVal; // Restore if possible
    }

    // Initial UI Update
    updateUI();

});
