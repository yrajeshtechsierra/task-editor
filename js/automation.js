/**
 * Task Automation System - Automation Features
 * Implements the roll-forward, auto-fill, and email report features
 */

// DOM Elements for Automation
const automationElements = {
  rollForwardBtn: document.getElementById("rollForwardBtn"),
  autoFillBtn: document.getElementById("autoFillBtn"),
  emailReportBtn: document.getElementById("emailReportBtn"),
  automationModal: document.getElementById("automationModal"),
  automationType: document.getElementById("automationType"),
  taskCheckboxes: document.getElementById("taskCheckboxes"),
  rollForwardOptions: document.getElementById("rollForwardOptions"),
  emailOptions: document.getElementById("emailOptions"),
  rollForwardDays: document.getElementById("rollForwardDays"),
  emailRecipient: document.getElementById("emailRecipient"),
  emailSubject: document.getElementById("emailSubject"),
  cancelAutomationBtn: document.getElementById("cancelAutomationBtn"),
  runAutomationBtn: document.getElementById("runAutomationBtn"),
  automationCloseBtn: document.querySelector("#automationModal .close"),
  emailStatus: document.getElementById("emailStatus"), // Add this for email status feedback
};

// Initialize automation features
function initAutomation() {
  // Add event listeners for automation buttons
  automationElements.rollForwardBtn.addEventListener("click", () => {
    openAutomationModal("rollForward");
  });

  automationElements.autoFillBtn.addEventListener("click", () => {
    openAutomationModal("fillDays");
  });

  automationElements.emailReportBtn.addEventListener("click", () => {
    openAutomationModal("emailReport");
  });

  // Modal control events
  automationElements.automationType.addEventListener(
    "change",
    updateAutomationOptions
  );
  automationElements.cancelAutomationBtn.addEventListener(
    "click",
    closeAutomationModal
  );
  automationElements.automationCloseBtn.addEventListener(
    "click",
    closeAutomationModal
  );
  automationElements.runAutomationBtn.addEventListener(
    "click",
    runSelectedAutomation
  );

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === automationElements.automationModal) {
      closeAutomationModal();
    }
  });
}

// Open automation modal with specific type
function openAutomationModal(type) {
  if (!workbook || !activeData || activeData.length === 0) {
    alert("Please load or create a template first!");
    return;
  }

  automationElements.automationType.value = type;
  updateAutomationOptions();

  // If opening roll forward, populate task checkboxes
  if (type === "rollForward") {
    populateTaskCheckboxes();
  } else if (type === "emailReport") {
    // Set default email subject with month/year
    const month = months[parseInt(elements.monthSelect.value)];
    const year = elements.yearInput.value;
    automationElements.emailSubject.value = `Task Report - ${month} ${year}`;
  }

  automationElements.automationModal.style.display = "block";
}

// Close automation modal
function closeAutomationModal() {
  automationElements.automationModal.style.display = "none";
}

// Update which options are shown based on automation type
function updateAutomationOptions() {
  const type = automationElements.automationType.value;

  // Hide all option divs first
  automationElements.rollForwardOptions.style.display = "none";
  automationElements.emailOptions.style.display = "none";

  // Show relevant options
  if (type === "rollForward") {
    automationElements.rollForwardOptions.style.display = "block";
  } else if (type === "emailReport") {
    automationElements.emailOptions.style.display = "block";
  }
}

// Populate task checkboxes from current data
function populateTaskCheckboxes() {
  automationElements.taskCheckboxes.innerHTML = "";

  if (!activeData || taskColumnIndex === -1) return;

  // Get unique tasks from the task column
  const uniqueTasks = new Set();

  for (let i = 1; i < activeData.length; i++) {
    const row = activeData[i];
    if (!row || taskColumnIndex >= row.length) continue;

    const task = row[taskColumnIndex];
    if (task && task.trim() && task !== "OFF/Weekend") {
      uniqueTasks.add(task);
    }
  }

  // Create checkboxes for each unique task
  uniqueTasks.forEach((task) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = task;
    checkbox.checked = true;

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(task));
    automationElements.taskCheckboxes.appendChild(label);
  });
}

// Run the selected automation
function runSelectedAutomation() {
  const type = automationElements.automationType.value;

  try {
    switch (type) {
      case "rollForward":
        rollForwardTasks();
        break;
      case "fillDays":
        autoFillWeekdays();
        break;
      case "emailReport":
        sendEmailReport();
        break;
    }

    closeAutomationModal();
  } catch (error) {
    console.error("Automation error:", error);
    elements.status.textContent = `Error during automation: ${error.message}`;
  }
}

// AUTOMATION IMPLEMENTATIONS

// Roll forward selected tasks to future days
function rollForwardTasks() {
  const daysToRoll = parseInt(automationElements.rollForwardDays.value);
  if (isNaN(daysToRoll) || daysToRoll < 1) {
    alert("Please enter a valid number of days to roll forward");
    return;
  }

  // Get selected tasks
  const selectedTasks = [];
  automationElements.taskCheckboxes
    .querySelectorAll("input:checked")
    .forEach((checkbox) => {
      selectedTasks.push(checkbox.value);
    });

  if (selectedTasks.length === 0) {
    alert("Please select at least one task to roll forward");
    return;
  }

  // Find the date column
  const dateColumnIndex = activeData[0].findIndex(
    (header) =>
      header === "Date" ||
      (header && String(header).toLowerCase().includes("date"))
  );

  if (dateColumnIndex === -1) {
    alert("Could not find a Date column in the data");
    return;
  }

  // Find the last date in the sheet
  let lastDateRow = null;
  let lastDate = null;

  for (let i = activeData.length - 1; i >= 1; i--) {
    const row = activeData[i];
    if (!row || dateColumnIndex >= row.length) continue;

    const dateStr = row[dateColumnIndex];
    if (dateStr) {
      try {
        // Try to parse the date
        const parsedDate = parseDate(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          lastDateRow = i;
          lastDate = parsedDate;
          break;
        }
      } catch (e) {
        console.warn("Could not parse date:", dateStr);
      }
    }
  }

  if (!lastDate) {
    alert("Could not find a valid date in the data");
    return;
  }

  // Create new rows with rolled forward tasks
  const hoursColumnIndex = taskColumnIndex + 1;
  const dayColumnIndex = activeData[0].findIndex(
    (header) =>
      header === "Day" ||
      (header && String(header).toLowerCase().includes("day"))
  );

  // Clone the header row structure for new rows
  const headerStructure = [...activeData[0]];

  // Add rows for each day to roll forward
  for (let i = 1; i <= daysToRoll; i++) {
    const newDate = new Date(lastDate);
    newDate.setDate(lastDate.getDate() + i);

    // Format date as MM/DD/YYYY
    const dateStr = newDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Get day name
    const dayName = newDate.toLocaleDateString("en-US", { weekday: "long" });
    const isWeekend = dayName === "Saturday" || dayName === "Sunday";

    // Create new row with defaults
    const newRow = Array(headerStructure.length).fill("");
    newRow[dateColumnIndex] = dateStr;

    if (dayColumnIndex !== -1) {
      newRow[dayColumnIndex] = dayName;
    }

    // If weekend, add weekend designation
    if (isWeekend) {
      newRow[taskColumnIndex] = "OFF/Weekend";
      if (hoursColumnIndex < headerStructure.length) {
        newRow[hoursColumnIndex] = "0";
      }
    } else {
      // Add selected tasks
      newRow[taskColumnIndex] = selectedTasks.join(", ");

      // Default to 8 hours for weekdays
      if (hoursColumnIndex < headerStructure.length) {
        newRow[hoursColumnIndex] = "8";
      }
    }

    // Add the new row
    activeData.push(newRow);
  }

  // Update the worksheet
  if (workbook && activeSheet) {
    const worksheet = XLSX.utils.aoa_to_sheet(activeData);
    workbook.Sheets[activeSheet] = worksheet;
  }

  // Refresh display
  renderTable();
  elements.status.textContent = `Tasks rolled forward ${daysToRoll} days. Don't forget to save!`;
}

// Auto-fill weekday tasks based on patterns
function autoFillWeekdays() {
  if (!activeData || activeData.length <= 1) {
    alert("No data to auto-fill");
    return;
  }

  // Find the day column
  const dayColumnIndex = activeData[0].findIndex(
    (header) =>
      header === "Day" ||
      (header && String(header).toLowerCase().includes("day"))
  );

  if (dayColumnIndex === -1) {
    alert("Could not find a Day column in the data");
    return;
  }

  // Find patterns of tasks for each weekday
  const weekdayPatterns = {
    Monday: { tasks: [], hours: "" },
    Tuesday: { tasks: [], hours: "" },
    Wednesday: { tasks: [], hours: "" },
    Thursday: { tasks: [], hours: "" },
    Friday: { tasks: [], hours: "" },
  };

  const hoursColumnIndex = taskColumnIndex + 1;

  // Analyze existing data to find patterns
  for (let i = 1; i < activeData.length; i++) {
    const row = activeData[i];
    if (!row || dayColumnIndex >= row.length || taskColumnIndex >= row.length)
      continue;

    const day = row[dayColumnIndex];
    if (!day || !weekdayPatterns[day]) continue;

    const task = row[taskColumnIndex];
    if (task && task !== "OFF/Weekend") {
      weekdayPatterns[day].tasks.push(task);

      // Get typical hours
      if (hoursColumnIndex < row.length) {
        const hours = row[hoursColumnIndex];
        if (hours && !isNaN(parseFloat(hours))) {
          weekdayPatterns[day].hours = hours;
        }
      }
    }
  }

  // Default hours if not found
  Object.keys(weekdayPatterns).forEach((day) => {
    if (!weekdayPatterns[day].hours) {
      weekdayPatterns[day].hours = "8";
    }
  });

  // Fill empty weekday cells
  let filledCount = 0;

  for (let i = 1; i < activeData.length; i++) {
    const row = activeData[i];
    if (!row || dayColumnIndex >= row.length || taskColumnIndex >= row.length)
      continue;

    const day = row[dayColumnIndex];
    if (!day || !weekdayPatterns[day]) continue;

    // Skip if already has tasks
    const currentTask = row[taskColumnIndex];
    if (currentTask && currentTask !== "") continue;

    // Skip weekends
    if (day === "Saturday" || day === "Sunday") continue;

    // Get common tasks for this day
    const pattern = weekdayPatterns[day];
    if (pattern.tasks.length > 0) {
      // Use most common task for this day
      const taskCounts = {};
      pattern.tasks.forEach((task) => {
        taskCounts[task] = (taskCounts[task] || 0) + 1;
      });

      // Find most common task
      let mostCommonTask = pattern.tasks[0];
      let maxCount = 0;

      Object.keys(taskCounts).forEach((task) => {
        if (taskCounts[task] > maxCount) {
          mostCommonTask = task;
          maxCount = taskCounts[task];
        }
      });

      // Fill in the task
      row[taskColumnIndex] = mostCommonTask;

      // Fill hours if empty
      if (
        hoursColumnIndex < row.length &&
        (!row[hoursColumnIndex] || row[hoursColumnIndex] === "")
      ) {
        row[hoursColumnIndex] = pattern.hours;
      }

      filledCount++;
    }
  }

  // Update the worksheet
  if (workbook && activeSheet) {
    const worksheet = XLSX.utils.aoa_to_sheet(activeData);
    workbook.Sheets[activeSheet] = worksheet;
  }

  // Refresh display
  renderTable();
  elements.status.textContent = `Auto-filled ${filledCount} empty weekday entries. Don't forget to save!`;
}

// Send email report - LOCAL VERSION for development
function sendEmailReport() {
  const recipient = automationElements.emailRecipient.value.trim();
  const subject = automationElements.emailSubject.value.trim();

  if (!recipient) {
    alert("Please enter a recipient email address");
    return;
  }

  if (!validateEmail(recipient)) {
    alert("Please enter a valid email address");
    return;
  }

  try {
    // Generate report data
    const reportData = generateReportData();

    // Show processing status
    elements.status.textContent = "Preparing report...";

    // Create report workbook
    const reportWorkbook = XLSX.utils.book_new();
    const reportSheet = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(reportWorkbook, reportSheet, "TaskReport");

    // Generate Excel file
    const wbout = XLSX.write(reportWorkbook, {
      bookType: "xlsx",
      type: "array",
    });

    // Create blob from the array
    const blob = new Blob([wbout], { type: "application/octet-stream" });

    // Get month and year for filename
    const month = months[parseInt(elements.monthSelect.value)];
    const year = elements.yearInput.value;
    const fileName = `Task_Report_${month}_${year}.xlsx`;

    // Create email body text
    const emailBody = generateEmailBodyFromReport(reportData);

    // For local development - show email information in a modal or alert
    showEmailPreview(recipient, subject, emailBody, fileName);

    // Create download link for the file
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = fileName;

    // Append and trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);

    elements.status.textContent = `Report prepared for ${recipient}. Since this is running locally without a server, the file has been downloaded instead.`;
  } catch (error) {
    console.error("Error generating report:", error);
    elements.status.textContent = "Error generating report: " + error.message;
  }
}

// Generate email body text from report data
function generateEmailBodyFromReport(reportData) {
  const month = months[parseInt(elements.monthSelect.value)];
  const year = elements.yearInput.value;

  let body = `Task Report Summary for ${month} ${year}\n\n`;

  // Skip header row and total row
  for (let i = 1; i < reportData.length - 1; i++) {
    const row = reportData[i];
    body += `${row[0]}: ${row[1]} occurrences, ${row[2]} hours (${row[3]})\n`;
  }

  // Add total row
  const totalRow = reportData[reportData.length - 1];
  body += `\nTotal Hours: ${totalRow[2]}`;

  return body;
}

// Show email preview for local development
function showEmailPreview(recipient, subject, body, fileName) {
  // Create and show a modal to display the email information
  const previewModal = document.createElement("div");
  previewModal.className = "email-preview-modal";
  previewModal.style.position = "fixed";
  previewModal.style.top = "50%";
  previewModal.style.left = "50%";
  previewModal.style.transform = "translate(-50%, -50%)";
  previewModal.style.backgroundColor = "white";
  previewModal.style.padding = "20px";
  previewModal.style.border = "1px solid #ccc";
  previewModal.style.borderRadius = "5px";
  previewModal.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
  previewModal.style.zIndex = "1000";
  previewModal.style.maxWidth = "80%";
  previewModal.style.maxHeight = "80%";
  previewModal.style.overflow = "auto";

  // Create header
  const header = document.createElement("div");
  header.innerHTML = `<h3>Email Preview (Local Development)</h3>`;
  header.style.marginBottom = "15px";
  header.style.borderBottom = "1px solid #eee";
  header.style.paddingBottom = "10px";

  // Create email details
  const details = document.createElement("div");
  details.innerHTML = `
      <p><strong>To:</strong> ${recipient}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Attachment:</strong> ${fileName}</p>
      <p><strong>Body:</strong></p>
      <pre style="white-space: pre-wrap; background-color: #f9f9f9; padding: 10px; border: 1px solid #eee;">${body}</pre>
    `;

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.padding = "8px 16px";
  closeButton.style.marginTop = "15px";
  closeButton.style.backgroundColor = "#4CAF50";
  closeButton.style.color = "white";
  closeButton.style.border = "none";
  closeButton.style.borderRadius = "4px";
  closeButton.style.cursor = "pointer";

  closeButton.addEventListener("click", function () {
    document.body.removeChild(previewModal);
  });

  // Assemble modal
  previewModal.appendChild(header);
  previewModal.appendChild(details);
  previewModal.appendChild(closeButton);

  // Add modal to page
  document.body.appendChild(previewModal);
}

// Generate report data
function generateReportData() {
  // Calculate task statistics
  const taskStats = {};
  let totalHours = 0;

  const hoursColumnIndex = taskColumnIndex + 1;

  // Process data
  for (let i = 1; i < activeData.length; i++) {
    const row = activeData[i];
    if (!row || taskColumnIndex >= row.length) continue;

    const task = row[taskColumnIndex];
    if (!task || task === "OFF/Weekend") continue;

    // Count task occurrences
    taskStats[task] = taskStats[task] || { count: 0, hours: 0 };
    taskStats[task].count++;

    // Sum hours
    if (hoursColumnIndex < row.length) {
      const hours = parseFloat(row[hoursColumnIndex]);
      if (!isNaN(hours)) {
        taskStats[task].hours += hours;
        totalHours += hours;
      }
    }
  }

  // Create report data
  const reportData = [
    ["Task", "Occurrences", "Total Hours", "Percentage of Time"],
  ];

  Object.keys(taskStats).forEach((task) => {
    const stats = taskStats[task];
    const percentage =
      totalHours > 0
        ? ((stats.hours / totalHours) * 100).toFixed(1) + "%"
        : "0%";

    reportData.push([task, stats.count, stats.hours, percentage]);
  });

  // Add summary row
  reportData.push(["TOTAL", "", totalHours, "100%"]);

  return reportData;
}

// UTILITY FUNCTIONS

// Parse a date string, handling various formats
function parseDate(dateStr) {
  if (!dateStr) return new Date(NaN);

  if (dateStr instanceof Date) {
    return dateStr;
  }

  // Try direct parsing first
  let date = new Date(dateStr);

  // If that fails, try some common formats
  if (isNaN(date.getTime())) {
    // Try MM/DD/YYYY
    const mmddyyyy = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/;
    const match = dateStr.match(mmddyyyy);

    if (match) {
      // Check which format it is (MM/DD/YYYY or DD/MM/YYYY)
      const first = parseInt(match[1]);
      const second = parseInt(match[2]);

      if (first <= 12) {
        // Assume MM/DD/YYYY
        date = new Date(parseInt(match[3]), first - 1, second);
      } else {
        // Assume DD/MM/YYYY
        date = new Date(parseInt(match[3]), second - 1, first);
      }
    }
  }

  return date;
}

// Email validation
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Initialize automation when the page loads
document.addEventListener("DOMContentLoaded", initAutomation);
