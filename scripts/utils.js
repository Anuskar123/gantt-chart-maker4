export class Utils {
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

    static getDayName(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    static getMonthName(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
}
