let workbook = null,
  activeData = null,
  activeSheet = "",
  taskColumnIndex = -1;
const elements = {
  fileInput: document.getElementById("fileInput"),
  processBtn: document.getElementById("processBtn"),
  createDefaultBtn: document.getElementById("createDefaultBtn"),
  saveBtn: document.getElementById("saveBtn"),
  sheetSelect: document.getElementById("sheetSelect"),
  sheetSelector: document.querySelector(".sheet-selector"),
  status: document.getElementById("status"),
  dataDisplay: document.getElementById("data-display"),
  searchBox: document.getElementById("searchBox"),
  filterBtn: document.getElementById("filterBtn"),
  clearFilterBtn: document.getElementById("clearFilterBtn"),
  monthSelect: document.getElementById("monthSelect"),
  yearInput: document.getElementById("yearInput"),
  addRowBtn: document.getElementById("addRowBtn"),
  addColumnBtn: document.getElementById("addColumnBtn"),
  columnModal: document.getElementById("columnModal"),
  columnName: document.getElementById("columnName"),
  confirmColumnBtn: document.getElementById("confirmColumnBtn"),
  cancelColumnBtn: document.getElementById("cancelColumnBtn"),
  closeModalBtn: document.querySelector(".close"),
};

// Initialize month selector
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
months.forEach((month, i) => {
  const option = document.createElement("option");
  option.value = i;
  option.textContent = month;
  elements.monthSelect.appendChild(option);
});

// Set defaults
const now = new Date();
elements.monthSelect.value = now.getMonth();
elements.yearInput.value = now.getFullYear();

// Event listeners
elements.fileInput.addEventListener("change", () => {
  const file = elements.fileInput.files[0];
  elements.status.textContent = file
    ? `File selected: ${file.name}`
    : "No file selected";
});

elements.processBtn.addEventListener("click", () => {
  const file = elements.fileInput.files[0];
  if (!file) return alert("Please select a file first!");

  elements.status.textContent = "Reading file...";
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      workbook = XLSX.read(new Uint8Array(e.target.result), {
        type: "array",
      });
      const sheetNames = workbook.SheetNames;

      // Populate sheet selector
      elements.sheetSelect.innerHTML = "";
      sheetNames.forEach((name) => {
        const option = document.createElement("option");
        option.value = option.textContent = name;
        elements.sheetSelect.appendChild(option);
      });

      elements.sheetSelector.style.display = "block";
      elements.sheetSelect.value = sheetNames[0];
      displaySheetData();
      elements.status.textContent = "File loaded successfully!";
    } catch (error) {
      console.error("Error reading Excel file:", error);
      elements.status.textContent = "Error reading file!";
      elements.dataDisplay.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    }
  };

  reader.onerror = () => (elements.status.textContent = "Error reading file!");
  reader.readAsArrayBuffer(file);
});

elements.createDefaultBtn.addEventListener("click", () => {
  workbook = XLSX.utils.book_new();
  activeSheet = "DefaultTemplate";

  // Create headers
  activeData = [["Date", "Day", "Tasks", "Hours"]];
  updateDefaultTemplate();

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(activeData);
  XLSX.utils.book_append_sheet(workbook, worksheet, activeSheet);

  // Setup UI
  elements.sheetSelect.innerHTML = "";
  const option = document.createElement("option");
  option.value = option.textContent = activeSheet;
  elements.sheetSelect.appendChild(option);
  elements.sheetSelector.style.display = "block";

  renderTable();
  elements.status.textContent = "Default template created!";
});

elements.sheetSelect.addEventListener("change", displaySheetData);
elements.filterBtn.addEventListener("click", filterTasks);
elements.clearFilterBtn.addEventListener("click", () => {
  elements.searchBox.value = "";
  renderTable();
  elements.status.textContent = "Filter cleared";
});

elements.saveBtn.addEventListener("click", () => {
  if (!workbook)
    return alert(
      "No data to save! Please create a template or load a file first."
    );

  try {
    const wbout = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;

    let filename;
    if (elements.fileInput.files[0]) {
      const originalName = elements.fileInput.files[0].name;
      filename = originalName.replace(/\.[^/.]+$/, "") + "_updated.xlsx";
    } else {
      const month =
        elements.monthSelect.options[elements.monthSelect.selectedIndex].text;
      const year = elements.yearInput.value;
      filename = `Task_Tracker_${month}_${year}.xlsx`;
    }

    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    elements.status.textContent = "File saved successfully!";
  } catch (error) {
    console.error("Error saving file:", error);
    elements.status.textContent = "Error saving file!";
  }
});

elements.monthSelect.addEventListener("change", () => {
  if (activeData && activeSheet === "DefaultTemplate") updateDefaultTemplate();
});

elements.yearInput.addEventListener("change", () => {
  if (activeData && activeSheet === "DefaultTemplate") updateDefaultTemplate();
});

// Add Row Button
elements.addRowBtn.addEventListener("click", () => {
  if (!activeData || activeData.length === 0)
    return alert("Please load or create a template first!");

  const numCols = activeData[0].length;
  const newRow = Array(numCols).fill("");

  if (activeData[0][0] === "Date" && activeData[0][1] === "Day") {
    const lastRow = activeData[activeData.length - 1];
    if (lastRow && lastRow[0]) {
      try {
        const lastDate = new Date(lastRow[0]);
        const newDate = new Date(lastDate);
        newDate.setDate(lastDate.getDate() + 1);

        const dateStr = newDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });

        const dayName = newDate.toLocaleDateString("en-US", {
          weekday: "long",
        });
        const isWeekend = dayName === "Saturday" || dayName === "Sunday";

        newRow[0] = dateStr;
        newRow[1] = dayName;
        newRow[2] = isWeekend ? "OFF/Weekend" : "";
        newRow[3] = isWeekend ? "0" : "8";
      } catch (e) {
        console.error("Error setting date for new row:", e);
      }
    }
  }

  activeData.push(newRow);
  const worksheet = XLSX.utils.aoa_to_sheet(activeData);
  workbook.Sheets[activeSheet] = worksheet;

  renderTable();
  elements.status.textContent = "New row added. Don't forget to save!";
});

// Column Modal
elements.addColumnBtn.addEventListener("click", () => {
  elements.columnName.value = "";
  elements.columnModal.style.display = "block";
});

elements.cancelColumnBtn.addEventListener("click", () => {
  elements.columnModal.style.display = "none";
});

elements.closeModalBtn.addEventListener("click", () => {
  elements.columnModal.style.display = "none";
});

window.onclick = (event) => {
  if (event.target === elements.columnModal) {
    elements.columnModal.style.display = "none";
  }
};

elements.confirmColumnBtn.addEventListener("click", () => {
  if (!activeData || activeData.length === 0) {
    alert("Please load or create a template first!");
    elements.columnModal.style.display = "none";
    return;
  }

  const newColumnName = elements.columnName.value.trim();
  if (!newColumnName) return alert("Please enter a column name!");

  activeData[0].push(newColumnName);
  for (let i = 1; i < activeData.length; i++) {
    activeData[i].push("");
  }

  const worksheet = XLSX.utils.aoa_to_sheet(activeData);
  workbook.Sheets[activeSheet] = worksheet;

  elements.columnModal.style.display = "none";
  renderTable();
  elements.status.textContent = "New column added. Don't forget to save!";
});

// Functions
function updateDefaultTemplate() {
  const selectedMonth = parseInt(elements.monthSelect.value);
  const selectedYear = parseInt(elements.yearInput.value) || now.getFullYear();

  const headers = activeData[0];
  activeData = [headers];

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(selectedYear, selectedMonth, day);
    const dateStr = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const isWeekend = dayName === "Saturday" || dayName === "Sunday";

    const row = Array(headers.length).fill("");
    row[0] = dateStr;
    row[1] = dayName;
    row[2] = isWeekend ? "OFF/Weekend" : "";
    row[3] = isWeekend ? "0" : "8";

    activeData.push(row);
  }

  if (workbook && activeSheet) {
    const worksheet = XLSX.utils.aoa_to_sheet(activeData);
    workbook.Sheets[activeSheet] = worksheet;
  }

  taskColumnIndex = 2;
  renderTable();
}

function displaySheetData() {
  if (!workbook) return;

  activeSheet = elements.sheetSelect.value;
  const worksheet = workbook.Sheets[activeSheet];

  activeData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (activeData.length === 0) {
    elements.dataDisplay.innerHTML = "<p>No data in this sheet</p>";
    return;
  }

  taskColumnIndex = activeData[0].findIndex(
    (header) =>
      header === "Tasks" ||
      header === "Task" ||
      (header && String(header).toLowerCase().includes("task"))
  );

  if (taskColumnIndex === -1) taskColumnIndex = 2;

  renderTable();
}

function renderTable(filteredData = null) {
  const dataToRender = filteredData || activeData;
  if (!dataToRender || dataToRender.length === 0) return;

  let tableHTML = '<table id="taskTable"><tr>';

  // Headers
  dataToRender[0].forEach((header, index) => {
    tableHTML += `<th data-col="${index}">${header || ""}</th>`;
  });
  tableHTML += "</tr>";

  // Data rows
  for (let i = 1; i < dataToRender.length; i++) {
    const row = dataToRender[i] || [];
    const dayCol = dataToRender[0].findIndex((header) => header === "Day");
    const isWeekend =
      dayCol !== -1 &&
      row[dayCol] &&
      (String(row[dayCol]).toLowerCase().includes("saturday") ||
        String(row[dayCol]).toLowerCase().includes("sunday"));

    tableHTML += `<tr data-row="${i}" class="${
      isWeekend ? "weekend-row" : ""
    }">`;

    for (let j = 0; j < dataToRender[0].length; j++) {
      const cellValue = row[j] !== undefined ? row[j] : "";
      const cellContent = String(cellValue).trim();

      if (j === taskColumnIndex || j === taskColumnIndex + 1 || j > 3) {
        tableHTML += `<td class="editable" data-row="${i}" data-col="${j}">
                  <div class="edit-container">${cellContent}</div></td>`;
      } else {
        tableHTML += `<td class="non-editable">${cellContent}</td>`;
      }
    }
    tableHTML += "</tr>";
  }

  tableHTML += "</table>";
  elements.dataDisplay.innerHTML = tableHTML;

  // Add editing functionality
  document.querySelectorAll("#taskTable td.editable").forEach((cell) => {
    cell.addEventListener("click", editCell);
  });
}

function editCell(e) {
  const cell = e.currentTarget;
  if (cell.classList.contains("editing")) return;

  const row = parseInt(cell.getAttribute("data-row"));
  const col = parseInt(cell.getAttribute("data-col"));
  const value = (activeData[row] && activeData[row][col]) || "";

  cell.classList.add("editing");
  const originalContent = cell.innerHTML;

  cell.innerHTML = `<textarea>${value}</textarea>`;
  const textarea = cell.querySelector("textarea");
  textarea.focus();

  textarea.style.height = "auto";
  textarea.style.height = Math.max(50, textarea.scrollHeight) + "px";

  const finishEditing = () => {
    const newValue = textarea.value.trim();
    cell.classList.remove("editing");
    cell.innerHTML = `<div class="edit-container">${newValue}</div>`;

    if (!activeData[row]) activeData[row] = [];
    activeData[row][col] = newValue;

    const worksheet = workbook.Sheets[activeSheet];
    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
    worksheet[cellRef] = { v: newValue };

    elements.status.textContent = "Cell updated. Don't forget to save!";
  };

  textarea.addEventListener("blur", finishEditing);
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) finishEditing();
    else if (e.key === "Escape") {
      cell.classList.remove("editing");
      cell.innerHTML = originalContent;
    }
  });

  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = Math.max(50, textarea.scrollHeight) + "px";
  });
}

function filterTasks() {
  const searchTerm = elements.searchBox.value.toLowerCase().trim();
  if (!searchTerm) {
    renderTable();
    return;
  }

  const filteredData = [activeData[0]];

  for (let i = 1; i < activeData.length; i++) {
    const row = activeData[i];
    const taskCell = row && row[taskColumnIndex];

    if (taskCell && String(taskCell).toLowerCase().includes(searchTerm)) {
      filteredData.push(row);
    }
  }

  renderTable(filteredData);
  elements.status.textContent = `Filtered: showing ${
    filteredData.length - 1
  } of ${activeData.length - 1} entries`;
}
