// reset.js
(async () => {
  try {
    // Delete all caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));

    // Clear localStorage
    localStorage.clear();

    // Unregister service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }

    alert("Local Explorer data cleared. Reload the page to start fresh.");
  } catch (err) {
    console.error("Reset failed:", err);
    alert("Reset failed — check console for details.");
  }
})();
