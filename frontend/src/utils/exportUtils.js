import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Use explicit import if possible, though side-effect import usually works
import { LOGO_BASE64 } from './logoBase64';

/**
 * Export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions { header: string, accessor: string | function }
 * @param {string} filename - Output filename
 */
export const exportToCSV = (data, columns, filename = 'export.csv') => {
    const headers = columns.map(c => c.header);
    const csvContent = [
        headers.join(','),
        ...data.map(row => columns.map(c => {
            let val;
            if (typeof c.accessor === 'function') {
                val = c.accessor(row);
            } else {
                val = row[c.accessor];
            }
            // Escape commas and quotes
            const str = String(val === null || val === undefined ? '' : val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/**
 * Export data to PDF
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions { header: string, accessor: string | function }
 * @param {string} title - Document title
 * @param {string} filename - Output filename
 */
export const exportToPDF = (data, columns, title = 'Export', filename = 'export.pdf') => {
    console.log("Starting PDF Export...", { dataLength: data.length, title });
    try {
        const doc = new jsPDF('landscape');
        console.log("jsPDF instance created");

        // Add Logo to the right
        const pdfWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 60; 
        const logoHeight = 41;
        doc.addImage(LOGO_BASE64, 'PNG', pdfWidth - 14 - logoWidth, 14, logoWidth, logoHeight);

        // Add Title
        doc.setFontSize(18);
        doc.text(title, 14, 20);

        // Add Date
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

        // Prepare Data
        const head = [columns.map(c => c.header)];
        const body = data.map(row => columns.map(c => {
            if (typeof c.accessor === 'function') return c.accessor(row);
            return row[c.accessor] || '';
        }));

        console.log("Data prepared for AutoTable");

        // Function to check if autoTable is available on doc
        if (doc.autoTable) {
            console.log("Using doc.autoTable");
            doc.autoTable({
                startY: 60,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], textColor: 255 }, // Standard "Project Lead" blue-ish
                styles: { fontSize: 8, cellPadding: 2 },
            });
        } else {
            console.log("Using imported autoTable function");
            try {
                autoTable(doc, {
                    startY: 60,
                    head: head,
                    body: body,
                    theme: 'grid',
                    headStyles: { fillColor: [41, 128, 185], textColor: 255 }, // Standard "Project Lead" blue-ish
                    styles: { fontSize: 8, cellPadding: 2 },
                });
            } catch (e) {
                console.error("autoTable plugin not found", e);
                alert("PDF Generation failed: Plugin not loaded. Check console for details.");
                return;
            }
        }

        console.log("Saving PDF...");
        doc.save(filename);
        console.log("PDF Saved.");
    } catch (err) {
        console.error("PDF Export Critical Error:", err);
        alert(`PDF Export Failed: ${err.message}`);
    }
};

/**
 * Export specific Timesheet data to PDF with custom header blocks
 */
export const exportTimesheetPDF = (data, columns, meta, filename = 'timesheet.pdf') => {
    console.log("Starting custom Timesheet PDF Export...");
    try {
        const doc = new jsPDF('landscape');

        // Add Logo strictly on the right
        const pdfWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 60; 
        const logoHeight = 41;
        doc.addImage(LOGO_BASE64, 'PNG', pdfWidth - 14 - logoWidth, 14, logoWidth, logoHeight);

        // Core Document Title
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text("TimeSheet Report", 14, 20);

        // Reset text configurations for multi-line details rendering
        doc.setFontSize(10);
        const startY = 28;
        const lh = 6;
        let curY = startY;

        // Dynamic helper to construct bold + unbold chained inline text!
        const drawField = (label, value, y, valueColor = null) => {
            doc.setFont("helvetica", "bold");
            doc.text(label, 14, y);
            const labelWidth = doc.getTextWidth(label);
            doc.setFont("helvetica", "normal");
            if (valueColor) {
                doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
            }
            doc.text(value, 14 + labelWidth + 2, y);
            if (valueColor) {
                doc.setTextColor(0, 0, 0); // reset color
            }
        };

        drawField("Employee:", `${meta.empId} - ${meta.empName}`, curY);
        curY += lh;
        
        drawField("Week Range:", meta.weekRange, curY);
        curY += lh;

        const isUniqueAnomaly = Number(meta.uniqueDays) !== 5;
        drawField("Unique Days:", String(meta.uniqueDays), curY, isUniqueAnomaly ? [239, 68, 68] : null);
        curY += lh;

        const isHoursAnomaly = parseFloat(meta.totalHours) !== 40;
        drawField("Total Hours:", String(meta.totalHours), curY, isHoursAnomaly ? [239, 68, 68] : null);
        curY += lh;

        drawField("Generated:", new Date().toLocaleString(), curY);
        curY += (lh * 1.5);

        // Extract tabular array grids
        const head = [columns.map(c => c.header)];
        const body = data.map(row => columns.map(c => {
            if (typeof c.accessor === 'function') return c.accessor(row);
            return row[c.accessor] || '';
        }));

        // Identify Description column to enforce width constraint so large text wraps nicely
        const descIndex = columns.findIndex(c => c.header === 'Description');
        const columnStyles = {};
        if (descIndex !== -1) {
            columnStyles[descIndex] = { cellWidth: 80 }; // Force wrapping for large descriptions
        }

        autoTable(doc, {
            startY: curY,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
            columnStyles: columnStyles
        });

        console.log("Injecting auto-save execution frame");
        doc.save(filename);
    } catch (err) {
        console.error("Timesheet PDF Export Critical Error:", err);
        alert(`Timesheet PDF Export Failed: ${err.message}`);
    }
};

/**
 * Export specific Expense Sheet data to PDF with custom header blocks
 */
export const exportExpenseSheetPDF = (data, columns, meta, filename = 'expenses.pdf') => {
    console.log("Starting custom Expense Sheet PDF Export...");
    try {
        const doc = new jsPDF();

        // Add Logo strictly on the right
        const pdfWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 60; 
        const logoHeight = 41;
        doc.addImage(LOGO_BASE64, 'PNG', pdfWidth - 14 - logoWidth, 14, logoWidth, logoHeight);

        // Core Document Title
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text("Expense Report", 14, 20);

        // Reset text configurations for multi-line details rendering
        doc.setFontSize(10);
        const startY = 28;
        const lh = 6;
        let curY = startY;

        // Dynamic helper to construct bold + unbold chained inline text!
        const drawField = (label, value, y) => {
            doc.setFont("helvetica", "bold");
            doc.text(label, 14, y);
            const labelWidth = doc.getTextWidth(label);
            doc.setFont("helvetica", "normal");
            doc.text(value, 14 + labelWidth + 2, y);
        };

        // Standard sequence printing
        drawField("Employee:", `${meta.empId} - ${meta.empName}`, curY);
        curY += lh;
        
        drawField("Period:", meta.weekRange, curY);
        curY += lh;

        drawField("Total Entries:", String(meta.totalEntries), curY);
        curY += lh;

        drawField("Total Amount:", `$${meta.totalAmount}`, curY);
        curY += lh;

        drawField("Generated:", new Date().toLocaleString(), curY);
        curY += (lh * 1.5);

        // Extract tabular array grids
        const head = [columns.map(c => c.header)];
        const body = data.map(row => columns.map(c => {
            if (typeof c.accessor === 'function') return c.accessor(row);
            return row[c.accessor] || '';
        }));

        autoTable(doc, {
            startY: curY,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 8, cellPadding: 2 },
        });

        doc.save(filename);
    } catch (err) {
        console.error("Expense Sheet PDF Export Critical Error:", err);
        alert(`Expense Sheet PDF Export Failed: ${err.message}`);
    }
};
