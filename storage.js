const Storage = {
    dbName: 'PsychMockDB',
    dbVersion: 1,
    db: null,

    init: async () => {
        // 1. Initialize LocalStorage Metadata
        Storage.updateStreak();

        // 2. Initialize IndexedDB
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(Storage.dbName, Storage.dbVersion);

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store 1: Attempts (History)
                if (!db.objectStoreNames.contains('attempts')) {
                    const attemptStore = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
                    attemptStore.createIndex('testId', 'testId', { unique: false });
                    attemptStore.createIndex('date', 'date', { unique: false });
                }

                // Store 2: Responses (Per Question Data)
                // Key: Composite or just unique ID. Let's use auto-increment to keep it simple, 
                // but query by [testId, qId] via index would be nice. 
                // Actually, let's just log every interaction.
                if (!db.objectStoreNames.contains('responses')) {
                    const respStore = db.createObjectStore('responses', { keyPath: 'id', autoIncrement: true });
                    respStore.createIndex('testId', 'testId', { unique: false });
                    respStore.createIndex('qId', 'qId', { unique: false });
                    respStore.createIndex('test_q', ['testId', 'qId'], { unique: false });
                }
            };

            request.onsuccess = (event) => {
                Storage.db = event.target.result;
                console.log("Storage: IndexedDB Initialized");
                resolve(Storage.db);
            };
        });
    },

    // --- LocalStorage Helpers ---

    updateStreak: () => {
        const lastActive = localStorage.getItem('psych_user_lastActive');
        const today = new Date().toISOString().split('T')[0];
        let streak = parseInt(localStorage.getItem('psych_user_streak') || 0);

        if (lastActive === today) {
            // Already active today, do nothing
        } else if (lastActive) {
            const lastDate = new Date(lastActive);
            const currentDate = new Date(today);
            const diffTime = Math.abs(currentDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                streak++; // Consecutive day
            } else {
                streak = 1; // Broken streak
            }
        } else {
            streak = 1; // First time
        }

        localStorage.setItem('psych_user_lastActive', today);
        localStorage.setItem('psych_user_streak', streak);
        console.log(`Storage: Streak updated to ${streak} days`);
    },

    setLastAttemptedMock: (id) => {
        localStorage.setItem('psych_user_lastTestId', id);
    },

    getLastAttemptedMock: () => {
        return localStorage.getItem('psych_user_lastTestId');
    },

    getStreak: () => {
        return parseInt(localStorage.getItem('psych_user_streak') || 0);
    },

    // --- IndexedDB Helpers ---

    saveAttempt: (data) => {
        // data: { testId, score, totalQuestions, correct, incorrect, unanswered, timeTaken }
        if (!Storage.db) return;

        const tx = Storage.db.transaction(['attempts'], 'readwrite');
        const store = tx.objectStore('attempts');
        const payload = {
            ...data,
            timestamp: Date.now(),
            date: new Date().toISOString()
        };
        store.add(payload);
    },

    saveResponse: (data) => {
        // data: { testId, qId, selectedOption, isCorrect, timeSpent }
        if (!Storage.db) return;

        const tx = Storage.db.transaction(['responses'], 'readwrite');
        const store = tx.objectStore('responses');
        const payload = {
            ...data,
            timestamp: Date.now()
        };
        store.add(payload);
    },

    // Update or Add time spent on a question
    // This is tricky because we might have multiple entries for the same question if visited multiple times.
    // For now, we will just log a "visit" entry with time spent. Analysis can aggregate it.
    logQuestionTime: (testId, qId, timeSpent) => {
        if (!Storage.db || !timeSpent) return;

        const tx = Storage.db.transaction(['responses'], 'readwrite');
        const store = tx.objectStore('responses');
        store.add({
            type: 'time_log',
            testId,
            qId,
            timeSpent,
            timestamp: Date.now()
        });
    },

    getHistory: async () => {
        if (!Storage.db) return [];
        return new Promise((resolve) => {
            const tx = Storage.db.transaction(['attempts'], 'readonly');
            const store = tx.objectStore('attempts');
            const request = store.getAll();
            request.onsuccess = () => {
                // Return reverse chronological order
                resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
            };
        });
    },

    getQuestionTimes: async (testId) => {
        if (!Storage.db) return {};
        return new Promise((resolve) => {
            const tx = Storage.db.transaction(['responses'], 'readonly');
            const store = tx.objectStore('responses');
            const index = store.index('testId');
            const request = index.getAll(testId);

            request.onsuccess = () => {
                const results = request.result;
                const times = {}; // { qId: totalSeconds }

                results.forEach(r => {
                    if (r.timeSpent) {
                        times[r.qId] = (times[r.qId] || 0) + r.timeSpent;
                    }
                });
                resolve(times);
            };
        });
    }
};
