export const formatTime12Hour = (timeRange) => {
    if (!timeRange || typeof timeRange !== 'string') return '';

    const to12Hour = (time) => {
        if (!time || typeof time !== 'string' || !time.includes(':')) return time || '';
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours, 10);
        if (isNaN(h)) return time;
        const m = minutes || '00';
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    };

    // Split by hyphen with any amount of surrounding whitespace
    const parts = timeRange.split(/\s*-\s*/);
    if (parts.length < 2) return to12Hour(timeRange);

    const [start, end] = parts;
    return `${to12Hour(start)} - ${to12Hour(end)}`;
};

/**
 * Checks if the current time is before, during, or after a given time range.
 * @param {string} timeRange - The time range in 24h format (e.g., "09:00 - 10:00")
 * @param {number} graceHours - Optional number of hours to extend the end time by (e.g., 4)
 * @returns {Object} { isBefore: boolean, isInRange: boolean, isAfter: boolean }
 */
export const isCurrentTimeInRange = (timeRange, graceHours = 0) => {
    if (!timeRange || typeof timeRange !== 'string') return { isBefore: false, isInRange: true, isAfter: false };
    
    const parts = timeRange.split(/\s*-\s*/);
    if (parts.length < 2) return { isBefore: false, isInRange: true, isAfter: false };

    const parseTime = (timeStr) => {
        const [hStr, mStr] = timeStr.split(':');
        const d = new Date();
        d.setHours(parseInt(hStr, 10), parseInt(mStr || '0', 10), 0, 0);
        return d;
    };

    try {
        const startTime = parseTime(parts[0]);
        const endTime = parseTime(parts[1]);
        
        // Apply grace period to end time
        if (graceHours > 0) {
            endTime.setHours(endTime.getHours() + graceHours);
        }

        const now = new Date();

        if (now < startTime) return { isBefore: true, isInRange: false, isAfter: false };
        if (now > endTime) return { isBefore: false, isInRange: false, isAfter: true };
        return { isBefore: false, isInRange: true, isAfter: false };
    } catch (error) {
        console.error("Error parsing time range:", error);
        return { isBefore: false, isInRange: true, isAfter: false }; // Defaults to true if error
    }
};
