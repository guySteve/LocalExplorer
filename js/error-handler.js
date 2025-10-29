// Central Error Handler for LocalExplorer
// Provides non-blocking user feedback and detailed console logging

let toastTimeout = null;

/**
 * Display a non-blocking toast message to the user
 * @param {string} message - User-friendly message to display
 * @param {number} duration - Duration in milliseconds (default 4000)
 */
function showToast(message, duration = 4000) {
  const toast = document.getElementById('errorToast');
  if (!toast) {
    console.warn('Toast element not found');
    return;
  }
  
  // Clear any existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  
  toast.textContent = message;
  toast.style.display = 'block';
  
  // Trigger reflow for animation
  void toast.offsetHeight;
  
  toast.classList.add('show');
  
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.style.display = 'none';
    }, 300); // Wait for fade out animation
  }, duration);
}

/**
 * Central error logging and user notification
 * @param {Error|string} error - The error object or message
 * @param {string} context - Context identifier (e.g., 'fetchWeatherData', 'performSearch:google')
 * @param {string} userMessage - User-friendly message to display
 */
function logError(error, context, userMessage) {
  // Log to console with context
  console.error(`[${context}]:`, error);
  
  // Show user-friendly message if provided
  if (userMessage) {
    showToast(userMessage);
  }
  
  // Future: Send to production logging service
  // sendToLogService({ error, context, timestamp: new Date().toISOString() });
}

// Make functions globally available
window.logError = logError;
window.showToast = showToast;
