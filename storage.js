const Storage = {
    // 1. Initialize - No local DB needed anymore
    init: async () => {
        Storage.updateStreak();
        console.log("Storage: API Mode Initialized");
        return Promise.resolve();
    },

    // --- LocalStorage Helpers (User Prefs/Streak only) ---

    // --- LocalStorage Helpers (User Prefs only) ---

    // Streak is now Server-Side
    updateStreak: async () => {
        try {
            const res = await fetch('/api/streak', { method: 'POST' });
            const data = await res.json();
            console.log(`Storage: Streak updated to ${data.streak} days`);
            return data.streak;
        } catch (err) {
            console.error("Storage: Failed to update streak", err);
            return 0;
        }
    },

    setLastAttemptedMock: (id) => {
        localStorage.setItem('psych_user_lastTestId', id);
    },

    getLastAttemptedMock: () => {
        return localStorage.getItem('psych_user_lastTestId');
    },

    getStreak: async () => {
        try {
            const res = await fetch('/api/streak');
            const data = await res.json();
            return data.streak || 0;
        } catch (err) {
            console.error("Storage: Failed to get streak", err);
            return 0;
        }
    },

    // --- Server API Helpers ---

    saveAttempt: async (data) => {
        // data: { testId, score, totalQuestions, correct, incorrect, unanswered, timeTaken }
        const payload = {
            ...data,
            timestamp: Date.now(),
            date: new Date().toISOString()
        };

        try {
            const res = await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                console.log("Storage: Attempt saved to server");
            } else {
                console.error("Storage: Server failed to save attempt", result);
            }
        } catch (err) {
            console.error("Storage: Network error saving attempt", err);
        }
    },

    getHistory: async () => {
        try {
            const res = await fetch('/api/history');
            if (!res.ok) throw new Error("Server returned " + res.status);

            const history = await res.json();
            // Sort reverse chronological
            return history.sort((a, b) => b.timestamp - a.timestamp);
        } catch (err) {
            console.error("Storage: Failed to fetch history", err);
            return [];
        }
    },

    // Stubbed out as we are not using IndexedDB for per-question tracking anymore
    saveResponse: async (data) => {
        // console.log("Storage: saveResponse skipped (Server Mode)");
    },

    logQuestionTime: (testId, qId, timeSpent) => {
        // console.log("Storage: logQuestionTime skipped (Server Mode)");
    },

    getQuestionTimes: async (testId) => {
        return {};
    }
};
