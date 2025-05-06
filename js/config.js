/**
 * Task Automation System - Configuration
 * Defines application settings and defaults
 */

// Application configuration
const appConfig = {
  // Default template settings
  defaultTemplate: {
    name: "DefaultTemplate",
    columns: ["Date", "Day", "Tasks", "Hours"],
    defaultDailyHours: 8,
    weekendHours: 0,
    weekendLabel: "OFF/Weekend",
  },

  // Date formatting
  dateFormat: {
    locale: "en-US",
    options: {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  },

  // Task settings
  tasks: {
    defaultTasks: [
      "Project Management",
      "Development",
      "Meetings",
      "Documentation",
      "Research",
      "Testing",
      "Customer Support",
    ],
    weekdayDefaults: {
      Monday: ["Project Management", "Planning"],
      Tuesday: ["Development", "Testing"],
      Wednesday: ["Development", "Meetings"],
      Thursday: ["Development", "Documentation"],
      Friday: ["Testing", "Project Wrap-up"],
    },
  },

  // UI settings
  ui: {
    tableCellMinHeight: 50,
    maxSearchResults: 100,
    statusMessageDuration: 5000, // milliseconds
  },

  // File settings
  file: {
    defaultFilename: "Task_Tracker",
    saveFormat: "xlsx",
    backupInterval: 5 * 60 * 1000, // 5 minutes in milliseconds
  },

  // Email settings
  email: {
    defaultSubject: "Task Report",
    companyDomain: "example.com",
    reportTitle: "Task Summary Report",
  },
};

// Load user-specific settings from localStorage
function loadUserSettings() {
  try {
    const savedSettings = localStorage.getItem("taskAutomationSettings");
    if (savedSettings) {
      const userSettings = JSON.parse(savedSettings);

      // Merge with default settings, only updating top-level properties
      // that exist in both objects to avoid corrupting the structure
      Object.keys(userSettings).forEach((key) => {
        if (
          appConfig[key] &&
          typeof userSettings[key] === typeof appConfig[key]
        ) {
          // For objects, merge properties instead of replacing
          if (
            typeof userSettings[key] === "object" &&
            !Array.isArray(userSettings[key])
          ) {
            Object.assign(appConfig[key], userSettings[key]);
          } else {
            appConfig[key] = userSettings[key];
          }
        }
      });
    }
  } catch (error) {
    console.error("Error loading user settings:", error);
    // Continue with default settings
  }
}

// Save user settings to localStorage
function saveUserSettings() {
  try {
    localStorage.setItem("taskAutomationSettings", JSON.stringify(appConfig));
  } catch (error) {
    console.error("Error saving user settings:", error);
  }
}

// Initialize configuration
loadUserSettings();
