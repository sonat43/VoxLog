/**
 * Utility formating data and triggering a CSV download in the browser.
 * 
 * @param {Array<Object>} data - Array of objects containing the row data.
 * @param {Array<string>} headers - Array of strings representing the column headers.
 * @param {string} filename - The name of the file to be downloaded (without .csv).
 */
export const downloadCSV = (data, headers, filename) => {
    if (!data || data.length === 0) {
        console.warn("No data provided for CSV export.");
        return;
    }

    // Convert data to CSV format
    const csvRows = [];

    // Add headers row
    csvRows.push(headers.join(','));

    // Map each data row to string and handle commas inside data
    data.forEach(row => {
        const rowString = Object.values(row).map(value => {
            // Escape quotes and wrap in quotes if the string contains a comma or newline
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('\\n') || stringValue.includes('"')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(',');

        csvRows.push(rowString);
    });

    const csvContent = csvRows.join('\n');

    // Create a Blob containing the CSV data
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
};
