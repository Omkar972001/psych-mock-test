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

    // --- Combined Helpers (Local + Supabase) ---

    saveAttempt: async (data) => {
        // data: { testId, score, totalQuestions, correct, incorrect, unanswered, timeTaken }

        // 1. Save Locally (IndexedDB)
        if (Storage.db) {
            const tx = Storage.db.transaction(['attempts'], 'readwrite');
            const store = tx.objectStore('attempts');
            store.add({
                ...data,
                timestamp: Date.now(),
                date: new Date().toISOString()
            });
        }

        // 2. Save to Supabase (if logged in)
        if (typeof Auth !== 'undefined' && Auth.user && typeof supabase !== 'undefined' && supabase) {
            try {
                const { error } = await supabase.from('attempts').insert({
                    user_id: Auth.user.id,
                    test_id: data.testId,
                    score: data.score,
                    total_questions: data.totalQuestions,
                    correct: data.correct,
                    incorrect: data.incorrect,
                    unanswered: data.unanswered,
                    time_taken: data.timeTaken,
                    timestamp: new Date().toISOString()
                });
                if (error) console.error("Supabase Save Error:", error);
                else console.log("Storage: Attempt synced to Supabase");
            } catch (err) {
                console.error("Supabase unreachable:", err);
            }
        }
    },

    getHistory: async () => {
        let history = [];

        // 1. Fetch Local History
        if (Storage.db) {
            const localHistory = await new Promise((resolve) => {
                const tx = Storage.db.transaction(['attempts'], 'readonly');
                const store = tx.objectStore('attempts');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
            });
            history = [...localHistory];
        }

        // 2. Fetch Supabase History (if logged in)
        if (typeof Auth !== 'undefined' && Auth.user && typeof supabase !== 'undefined' && supabase) {
            try {
                const { data, error } = await supabase
                    .from('attempts')
                    .select('*')
                    .eq('user_id', Auth.user.id);

                if (data && !error) {
                    // Map Supabase fields to local fields if different
                    const remoteHistory = data.map(item => ({
                        ...item,
                        testId: item.test_id,
                        totalQuestions: item.total_questions,
                        timeTaken: item.time_taken,
                        timestamp: new Date(item.timestamp).getTime()
                    }));

                    // Merge and de-duplicate (simple merge by timestamp for now)
                    history = [...history, ...remoteHistory];
                }
            } catch (err) {
                console.error("Supabase fetch failed, using local history only.");
            }
        }

        // Sort reverse chronological
        return history.sort((a, b) => b.timestamp - a.timestamp);
    },

    saveResponse: async (data) => {
        // data: { testId, qId, selectedOption, isCorrect, timeSpent }
        if (Storage.db) {
            const tx = Storage.db.transaction(['responses'], 'readwrite');
            const store = tx.objectStore('responses');
            store.add({
                ...data,
                timestamp: Date.now()
            });
        }

        // Detailed response tracking in Supabase could be added here
    },

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
