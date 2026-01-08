const app = {
    tests: [
        { id: 1, file: 'psych_test_01.json', title: 'Mock Test 1 (DEC 2024 SHIFT II)', questions: 100 },
        { id: 2, file: 'psych_test_02.json', title: 'Mock Test 2 (March 2023)', questions: 100 },
        { id: 3, file: 'psych_test_03.json', title: 'Mock Test 3 ("SEPTEMBER 2022 SHIFT I")', questions: 100 },
        { id: 4, file: 'psych_test_04.json', title: 'Mock Test 4 (June 2019)', questions: 100 },
        { id: 5, file: 'psych_test_05.json', title: 'Mock Test 5 (Dec 2018)', questions: 100 }
    ],
    state: {
        currentTestId: null,
        data: null,
        currentInfo: null, // metadata
        answers: {}, // { qId: "A" }
        visited: new Set(),
        currentQIndex: 0,
        timeLeft: 7200, // 2 hours in seconds
        timerId: null, // Legacy support, now using app.timerId
    },

    timerId: null, // App-level timer reference
    isLoading: false,

    init: async () => {
        try {
            await Storage.init();
        } catch (err) {
            console.error("Storage Init Failed", err);
        }

        window.addEventListener('hashchange', app.router);

        // Handle initial hash or default to dashboard
        if (!window.location.hash) {
            window.location.hash = '#dashboard';
        } else {
            app.router();
        }
    },

    router: () => {
        const hash = window.location.hash.slice(1); // remove #
        const [route, param] = hash.split('/');

        console.log("Navigating to:", route, param);

        if (route === 'dashboard' || route === '') {
            app.renderDashboardView();
        } else if (route === 'test' && param) {
            app.loadTest(parseInt(param));
        } else if (route === 'result') {
            app.renderResultView();
        } else if (route === 'review') {
            app.renderReviewView();
        } else if (route === 'history') {
            app.renderHistoryView();
        } else {
            // 404 or unknown -> Dashboard
            window.location.hash = '#dashboard';
        }
    },

    // Navigation Triggers (Actions)
    goToDashboard: () => {
        window.location.hash = '#dashboard';
    },

    goToHistory: () => {
        window.location.hash = '#history';
    },

    startTest: (id) => {
        window.location.hash = `#test/${id}`;
    },

    // View Renderers (Called by Router)
    renderDashboardView: () => {
        if (app.timerId) clearInterval(app.timerId);
        document.getElementById('dashboardView').classList.remove('hidden');
        document.getElementById('testInterface').classList.add('hidden');
        document.getElementById('resultsView').classList.add('hidden');
        document.getElementById('historyView').classList.add('hidden');

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-item')[0].classList.add('active'); // Dashboard active (assuming 0)


        // Render Streak Info (Optional UI enhancement)
        const streak = Storage.getStreak();
        // Insert streak somewhere if element exists, or just log
        // For now, let's append it to welcome text if not present
        const welcome = document.querySelector('.welcome-text p');
        if (welcome && !welcome.innerText.includes('Streak')) {
            welcome.innerText += ` 🔥 ${streak} Day Streak!`;
        }

        app.renderDashboard();
    },

    renderDashboard: () => {
        const grid = document.getElementById('testsGrid');
        grid.innerHTML = app.tests.map(t => {
            // Check formatted saved state
            const savedState = localStorage.getItem(`psych_test_${t.id}_state`);
            let status = "Start Test";
            let cName = "";
            let scoreBadge = "";

            if (savedState) {
                const parsed = JSON.parse(savedState);
                if (parsed.completed) {
                    status = "Review Results";
                    cName = "completed";
                    const score = parsed.score || 0;
                    scoreBadge = `<div style="margin-top:0.5rem; color: var(--success); font-weight:bold;">Score: ${score}</div>`;
                } else {
                    status = "Resume Test";
                    cName = "in-progress";
                }
            }

            const retakeHtml = (cName === 'completed')
                ? `<div style="text-align:center; margin-top:0.5rem; font-size:0.85rem; text-decoration:underline; color:#94a3b8; z-index:10; position:relative;" onclick="event.stopPropagation(); app.state.currentTestId=${t.id}; app.retakeTest()">Retake</div>`
                : '';

            // Highlight Last Active
            const lastId = Storage.getLastAttemptedMock();
            let activeBorder = "";
            let activeLabel = "";
            if (lastId && parseInt(lastId) === t.id) {
                activeBorder = "border: 2px solid var(--primary); transform:scale(1.02); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);";
                activeLabel = `<div style="position:absolute; top:-10px; right:10px; background:var(--primary); color:white; font-size:0.7rem; padding:2px 8px; border-radius:12px;">Last Active</div>`;
            }

            return `
            <div class="test-card ${cName}" style="${activeBorder}" onclick="app.startTest(${t.id})">
                ${activeLabel}
                <span class="test-badge">Full Mock</span>
                <div class="test-title">${t.title}</div>
                <div class="test-meta">${t.questions} Questions • 120 Mins</div>
                ${scoreBadge}
                <button class="start-btn">${status}</button>
                ${retakeHtml}
            </div>
        `}).join('');
    },

    loadTest: async (id) => {
        if (app.isLoading) return;
        app.isLoading = true;

        const test = app.tests.find(t => t.id === id);
        if (!test) {
            app.isLoading = false;
            app.goToDashboard();
            return;
        }

        // --- Storage Update ---
        Storage.setLastAttemptedMock(id);

        // Load Persisted State
        const savedKey = `psych_test_${id}_state`;
        const savedRaw = localStorage.getItem(savedKey);
        let saved = savedRaw ? JSON.parse(savedRaw) : null;

        const isCompleted = saved?.completed;

        // Cleanup any existing timer violently
        if (app.timerId) {
            clearInterval(app.timerId);
            app.timerId = null;
        }

        // Reset State
        app.state = {
            currentTestId: id,
            currentInfo: test,
            data: null,
            answers: saved?.answers || {},
            visited: new Set(saved?.visited || []),
            marked: new Set(saved?.marked || []), // New Marked Set
            currentQIndex: saved?.currentQIndex || 0,
            timeLeft: saved?.timeLeft || 7200,
            timerId: null, // Legacy
            isReviewMode: isCompleted,
            lastScore: saved?.score || 0
        };

        // UI Prep
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('resultsView').classList.add('hidden');
        document.getElementById('testInterface').classList.remove('hidden');
        document.getElementById('currentTestTitle').innerText = test.title + (isCompleted ? " (Review)" : "");
        document.getElementById('qText').innerText = "Loading Test Data...";
        document.getElementById('optionsList').innerHTML = "";

        // Reset Mark Button
        const markBtn = document.getElementById('markBtn');
        if (markBtn) markBtn.innerText = "Mark for Review";

        // Adjust UI for Review Mode (Apply to ALL buttons)
        const submitBtns = document.querySelectorAll('.submit-btn');
        submitBtns.forEach(btn => {
            if (isCompleted) {
                btn.innerText = "Back to Results";
                btn.onclick = () => window.location.hash = '#result';
                document.getElementById('timer').style.display = 'none';
                if (markBtn) markBtn.style.display = 'none'; // Hide in review
            } else {
                btn.innerText = "Submit Test";
                btn.onclick = app.submitTest;
                document.getElementById('timer').style.display = 'block';
                if (markBtn) markBtn.style.display = 'inline-block';
            }
        });

        // Fetch Data
        try {
            const res = await fetch(test.file);
            if (!res.ok) throw new Error("Failed to load");
            const data = await res.json();
            app.state.data = data;

            if (!data.questions || data.questions.length === 0) {
                alert("This test has no questions available yet.");
                app.goToDashboard();
                return;
            }

            if (!isCompleted) app.startTimer();
            app.state.lastQuestionTime = Date.now(); // Init Time

            // Preload Question Times for Analytics
            if (isCompleted) {
                try {
                    app.state.questionTimes = await Storage.getQuestionTimes(id);
                    console.log("Loaded Question Times", app.state.questionTimes);
                } catch (e) {
                    console.error("Failed to load question times", e);
                }
            }

            app.loadQuestion(app.state.currentQIndex);
            app.renderPalette();
        } catch (e) {
            console.error(e);
            alert("Error loading test data: " + e.message);
            app.goToDashboard();
        } finally {
            app.isLoading = false;
        }
    },

    startTimer: () => {
        const display = document.getElementById('timer');
        console.log("Starting Timer...");

        // Clear existing to avoid dupes
        if (app.timerId) {
            console.log("Clearing existing timer", app.timerId);
            clearInterval(app.timerId);
            app.timerId = null;
        }

        // Use Date.now() for accurate timing
        // If restarting, use current timeLeft. 
        // Note: timeLeft is in seconds.
        const endTime = Date.now() + (app.state.timeLeft * 1000);

        app.timerId = setInterval(() => {
            const now = Date.now();
            const remaining = Math.round((endTime - now) / 1000);

            app.state.timeLeft = remaining;

            // Persist every 5 secs
            if (remaining % 5 === 0) app.persistState();

            if (remaining <= 0) {
                app.state.timeLeft = 0;
                display.innerText = "00:00:00";
                clearInterval(app.timerId);
                app.submitTest();
                return;
            }

            const hours = Math.floor(remaining / 3600);
            const mins = Math.floor((remaining % 3600) / 60);
            const secs = remaining % 60;
            display.innerText = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
        }, 1000);

        function pad(n) { return n < 10 ? '0' + n : n; }
    },

    persistState: () => {
        if (!app.state.currentTestId) return;
        const key = `psych_test_${app.state.currentTestId}_state`;
        const payload = {
            answers: app.state.answers,
            visited: Array.from(app.state.visited), // Set to Array
            marked: Array.from(app.state.marked), // Set to Array
            timeLeft: app.state.timeLeft,
            completed: app.state.isReviewMode,
            score: app.state.lastScore,
            currentQIndex: app.state.currentQIndex
        };
        localStorage.setItem(key, JSON.stringify(payload));
    },

    loadQuestion: (index) => {
        if (index < 0 || index >= app.state.data.questions.length) return;

        // --- Time Tracking ---
        const now = Date.now();
        if (app.state.lastQuestionTime && app.state.currentQIndex !== undefined) {
            const timeSpent = (now - app.state.lastQuestionTime) / 1000;
            const prevId = app.state.data.questions[app.state.currentQIndex].id;
            // Only log if meaningful (> 0.5s)
            if (timeSpent > 0.5 && !app.state.isReviewMode) {
                Storage.logQuestionTime(app.state.currentTestId, prevId, timeSpent);
            }
        }
        app.state.lastQuestionTime = now;
        // ---------------------

        app.state.currentQIndex = index;
        const q = app.state.data.questions[index];
        app.state.visited.add(q.id);

        // Update UI
        document.getElementById('qNum').innerText = q.id;

        // Display Time Spent (Review Mode Only)
        // We'll append it to qNum or q-marks.
        // Ideally we should have a dedicated spot, but let's append to .q-marks
        const marksEl = document.querySelector('.q-marks');
        if (app.state.isReviewMode) {
            // We need to fetch times efficiently. Doing it per Q is slow if we do IDB every time.
            // Better: Load all times for this test into app.state when Review starts.
            // But for now, let's just do a quick async check or assume we loaded it.
            // Loading per Q is bad for sync `loadQuestion`.
            // Let's assume we populate `app.state.questionTimes` when entering review mode or loadTest.
            if (app.state.questionTimes && app.state.questionTimes[q.id]) {
                marksEl.innerText = `Time: ${Math.round(app.state.questionTimes[q.id])}s`;
            } else {
                marksEl.innerText = "Time: --";
            }
        } else {
            marksEl.innerText = "+2 / -0";
        }

        // Match List Parsing
        let qContent = q.question;
        const matchData = app.parseMatchQuestion(q.question);

        if (matchData) {
            const list1Html = matchData.list1.map(item => `
                <div class="match-item">
                    <span class="match-label">(${item.label})</span>
                    <span class="match-content">${item.text}</span>
                </div>
            `).join('');

            const list2Html = matchData.list2.map(item => `
                <div class="match-item">
                    <span class="match-label">(${item.label})</span>
                    <span class="match-content">${item.text}</span>
                </div>
            `).join('');

            qContent = `
                <div>${matchData.header}</div>
                <div class="match-list-grid">
                    <div class="match-col">
                        <h4>List I</h4>
                        ${list1Html}
                    </div>
                    <div class="match-col">
                        <h4>List II</h4>
                        ${list2Html}
                    </div>
                </div>
                <div style="margin-top: 1rem; font-weight: 500;">${matchData.footer}</div>
            `;
            document.getElementById('qText').innerHTML = qContent;
        } else {
            document.getElementById('qText').innerText = q.question;
        }

        // Options
        const optsContainer = document.getElementById('optionsList');
        const userAns = app.state.answers[q.id];

        const labels = ['A', 'B', 'C', 'D'];

        optsContainer.innerHTML = q.options.map((opt, i) => {
            const label = labels[i] || (i + 1);
            const isSelected = userAns === label;

            // Review Styles
            let reviewClass = "";
            let correctIcon = "";
            let clickHandler = `onclick="app.selectAnswer('${label}')"`;

            if (app.state.isReviewMode) {
                clickHandler = ""; // Disable click
                const correctAnswers = q.answer ? q.answer.split(',').map(s => s.trim()) : [];
                // Highlight Correct Answer
                if (correctAnswers.includes(label)) {
                    reviewClass = "correct-opt";
                    correctIcon = "✅";
                }
                // Highlight Wrong Selection
                if (isSelected && !correctAnswers.includes(label)) {
                    reviewClass = "wrong-opt";
                    correctIcon = "❌";
                }
            }

            return `
                <div class="option-item ${isSelected ? 'selected' : ''} ${reviewClass}" ${clickHandler}>
                    <div style="flex:1"><strong>(${label})</strong> <span>${opt}</span></div>
                    <div>${correctIcon}</div>
                </div>
            `;
        }).join('');

        // Passage
        const pBox = document.getElementById('passageBox');
        if (q.passageId && app.state.data.passages[q.passageId]) {
            pBox.classList.remove('hidden');
            document.getElementById('passageContent').innerText = app.state.data.passages[q.passageId];
        } else {
            pBox.classList.add('hidden');
        }

        app.updatePalette();
    },

    selectAnswer: (val) => {
        if (app.state.isReviewMode) return; // Read only
        const q = app.state.data.questions[app.state.currentQIndex];

        // Save Response to Storage
        const correctAnswers = q.answer ? q.answer.split(',').map(s => s.trim()) : [];
        const isCorrect = correctAnswers.includes(val);
        Storage.saveResponse({
            testId: app.state.currentTestId,
            qId: q.id,
            selectedOption: val,
            isCorrect: isCorrect,
            timeSpent: 0 // handled by logQuestionTime mostly, could calculate partial here
        });

        app.state.answers[q.id] = val;
        app.loadQuestion(app.state.currentQIndex); // Reload to show selected state
        app.persistState();
    },

    nextQuestion: () => {
        app.loadQuestion(app.state.currentQIndex + 1);
    },

    toggleMark: () => {
        const id = app.state.data.questions[app.state.currentQIndex].id;

        if (app.state.marked.has(id)) {
            app.state.marked.delete(id);
            document.getElementById('markBtn').innerText = "Mark for Review";
            document.getElementById('markBtn').classList.remove('active');
        } else {
            app.state.marked.add(id);
            document.getElementById('markBtn').innerText = "Unmark";
            document.getElementById('markBtn').classList.add('active');
        }
        app.updatePalette();
        app.persistState();
    },

    prevQuestion: () => {
        app.loadQuestion(app.state.currentQIndex - 1);
    },

    renderPalette: () => {
        const grid = document.getElementById('paletteGrid');
        grid.innerHTML = app.state.data.questions.map((q, i) => `
            <div class="p-bubble" id="bubble-${q.id}" onclick="app.loadQuestion(${i})">
                ${q.id}
            </div>
        `).join('');
    },

    updatePalette: () => {
        app.state.data.questions.forEach((q, i) => {
            const el = document.getElementById(`bubble-${q.id}`);
            if (!el) return;

            // Reset base classes
            el.className = 'p-bubble';

            // Current
            if (i === app.state.currentQIndex) {
                el.classList.add('active');

                // Also Update Mark Button Text
                const markBtn = document.getElementById('markBtn');
                if (markBtn) {
                    if (app.state.marked.has(q.id)) {
                        markBtn.innerText = "Unmark";
                    } else {
                        markBtn.innerText = "Mark for Review";
                    }
                }
            }

            // Review Mode Coloring
            if (app.state.isReviewMode) {
                const userAns = app.state.answers[q.id];
                const correctAnswers = q.answer ? q.answer.split(',').map(s => s.trim()) : [];

                if (userAns) {
                    if (correctAnswers.includes(userAns)) el.classList.add('p-correct');
                    else el.classList.add('p-wrong');
                } else if (userAns === undefined && app.state.visited.has(q.id)) {
                    // Visited but not answered in review?
                }
            } else {
                // Normal Mode Priority:
                // 1. Marked & Answered -> Purple + Green
                // 2. Marked -> Purple
                // 3. Answered -> Green
                // 4. Visited (but not answered) -> Red
                // 5. Not Visited -> Grey (Default)

                const isMarked = app.state.marked.has(q.id);
                const isAnswered = !!app.state.answers[q.id];
                const isVisited = app.state.visited.has(q.id);

                if (isMarked && isAnswered) {
                    el.classList.add('marked-answered');
                } else if (isMarked) {
                    el.classList.add('marked');
                } else if (isAnswered) {
                    el.classList.add('answered');
                } else if (isVisited) {
                    el.classList.add('visited');
                } else {
                    // Default grey
                }
            }
        });
    },

    submitTest: () => {
        console.log("Submit Test Clicked");
        if (confirm("Are you sure you want to submit?")) {
            console.log("User confirmed submission");
            app.processResults();
        }
    },

    processResults: () => {
        if (app.timerId) clearInterval(app.timerId);

        let correct = 0;
        let incorrect = 0;
        let unanswered = 0;

        app.state.data.questions.forEach(q => {
            const userAns = app.state.answers[q.id];

            if (!userAns) {
                unanswered++;
            } else {
                const correctAnswers = q.answer ? q.answer.split(',').map(s => s.trim()) : [];
                if (correctAnswers.includes(userAns)) {
                    correct++;
                } else {
                    incorrect++;
                }
            }
        });

        // Save Attempt to Storage
        Storage.saveAttempt({
            testId: app.state.currentTestId,
            score: correct * 2,
            totalQuestions: app.state.data.questions.length,
            correct,
            incorrect,
            unanswered,
            timeTaken: 7200 - app.state.timeLeft // Approximate
        });

        // Update State
        app.state.isReviewMode = true;
        app.state.lastScore = correct * 2;
        app.persistState(); // This saves as completed

        // Navigate to result
        window.location.hash = '#result';

        // Update Stats (Delayed to ensure view is rendered)
        setTimeout(() => {
            app.updateResultStats(correct, incorrect, unanswered);
        }, 100);
    },

    updateResultStats: (correct, incorrect, unanswered) => {
        const circle = document.querySelector('.score-circle');
        if (circle) {
            const pct = (correct / app.state.data.questions.length) * 100;
            circle.style.setProperty('--score-pct', pct);
        }
        document.getElementById('scoreValue').innerText = correct * 2;
        document.getElementById('correctCount').innerText = correct;
        document.getElementById('incorrectCount').innerText = incorrect;
        document.getElementById('unansweredCount').innerText = unanswered;
    },

    renderResultView: () => {
        // Safety check: Do we have state?
        if (!app.state.isReviewMode || !app.state.data) {
            // Restore from LS if possible? 
            // Or just redirect dashboard
            console.warn("No result state found, redirecting.");
            app.goToDashboard();
            return;
        }

        document.getElementById('testInterface').classList.add('hidden');
        document.getElementById('resultsView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');

        // Recalculate stats for display if coming from refresh/nav
        // (Reusing logic from processResults partial)
        let correct = 0, incorrect = 0, unanswered = 0;
        app.state.data.questions.forEach(q => {
            const userAns = app.state.answers[q.id];
            if (!userAns) unanswered++;
            else {
                const correctAnswers = q.answer ? q.answer.split(',').map(s => s.trim()) : [];
                if (correctAnswers.includes(userAns)) correct++;
                else incorrect++;
            }
        });

        setTimeout(() => app.updateResultStats(correct, incorrect, unanswered), 50);
    },

    showResults: () => {
        // Legacy alias or just push hash
        window.location.hash = '#result';
    },

    toggleSidebar: (forceState) => {
        const sidebar = document.getElementById('mainSidebar');
        if (typeof forceState === 'boolean') {
            if (forceState) sidebar.classList.add('active');
            else sidebar.classList.remove('active');
        } else {
            sidebar.classList.toggle('active');
        }
    },

    togglePalette: () => {
        const palette = document.getElementById('questionPalette');
        palette.classList.toggle('active');
    },

    renderReviewView: async () => {
        if (!app.state.data) {
            app.goToDashboard();
            return;
        }

        document.getElementById('resultsView').classList.add('hidden');
        document.getElementById('testInterface').classList.remove('hidden');

        // Ensure we are in review mode
        app.state.isReviewMode = true;

        // Load Analytics Data
        if (!app.state.questionTimes && app.state.currentTestId) {
            try {
                app.state.questionTimes = await Storage.getQuestionTimes(app.state.currentTestId);
            } catch (e) {
                console.error("Review Time Fetch Error", e);
            }
        }

        // Update buttons handled in loadTest/render logic, but we might be switching views efficiently
        const submitBtns = document.querySelectorAll('.submit-btn');
        submitBtns.forEach(btn => {
            btn.innerText = "Back to Results";
            btn.onclick = () => window.location.hash = '#result';
            document.getElementById('timer').style.display = 'none';
        });

        app.loadQuestion(0);
    },

    renderHistoryView: async () => {
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('testInterface').classList.add('hidden');
        document.getElementById('resultsView').classList.add('hidden');
        document.getElementById('historyView').classList.remove('hidden');

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        // Activate History nav item (hacky index select, better to use IDs in future)
        const items = document.querySelectorAll('.nav-item');
        if (items.length > 1) items[1].classList.add('active');

        const list = document.getElementById('historyList');
        list.innerHTML = `<div style="text-align:center; padding:2rem;">Loading history...</div>`;

        try {
            const history = await Storage.getHistory();

            if (history.length === 0) {
                list.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:2rem;">No tests attempted yet.</div>`;
                return;
            }

            list.innerHTML = history.map(h => {
                const test = app.tests.find(t => t.id === h.testId);
                const title = test ? test.title : `Unknown Test (ID: ${h.testId})`;
                const date = new Date(h.timestamp).toLocaleString();
                const score = h.score || 0;
                const timeMin = Math.round((h.timeTaken || 0) / 60);

                return `
                <div class="test-card" style="cursor:default; margin-bottom:1rem;">
                    <span class="test-badge">${date}</span>
                    <div class="test-title">${title}</div>
                    <div class="test-meta">
                        Score: <b>${score} / ${h.totalQuestions * 2}</b> • Time: <b>${timeMin} mins</b>
                    </div>
                    <div style="margin-top:0.5rem; font-size:0.9rem; color:#64748b;">
                        Correct: ${h.correct} | Incorrect: ${h.incorrect} | Unanswered: ${h.unanswered}
                    </div>
                </div>
                `;
            }).join('');

        } catch (e) {
            console.error("History Error", e);
            list.innerHTML = `<div style="color:red; text-align:center;">Failed to load history.</div>`;
        }
    },

    reviewTest: () => {
        window.location.hash = '#review';
    },

    retakeTest: () => {
        if (!app.state.currentTestId) return;
        if (confirm("This will clear your previous progress and score. Are you sure you want to retake the test?")) {
            const id = app.state.currentTestId;
            const key = `psych_test_${id}_state`;
            localStorage.removeItem(key);
            app.startTest(id);
        }
    },

    parseMatchQuestion: (text) => {
        // ... (existing parseMatchQuestion code) ...
        // Keeping previous function body implicitly via replace range logic (if I was replacing whole file, but I'm editing specific block)
        // Actually wait, I need to preserve parseMatchQuestion. The EndLine 600 likely cuts into it. 
        // I should just ADD renderHistoryView before reviewTest and leave logic alone.
        // Wait, reviewTest is around line 590 in original.
        // Let's just insert renderHistoryView before reviewTest.

        // RE-READING: I am replacing lines UP TO reviewTest usually.
        // The original code has renderResultView around 520, then reviewTest around 585.
        // Let's insert renderHistoryView above reviewTest.
    },


    parseMatchQuestion: (text) => {
        // Basic check if it looks like a Match List question
        if (!text.includes("List I") || !text.includes("List II")) return null;

        try {
            // Regex to find the lists section. 
            // It assumes "List I" and "List II" headers exist.
            // Items are like (a) ... (I) ...

            // Extract Header (text before List I)
            const headerMatch = text.match(/^(.*?)List I/i);
            const header = headerMatch ? headerMatch[1].trim() : "Match List I with List II";

            // Extract Footer (usually "Choose the correct...")
            const footerMatch = text.match(/(Choose the correct answer.*)$/i);
            const footer = footerMatch ? footerMatch[1].trim() : "";

            // Parsing pairs
            // Strategy: Look for pattern (a) ... (I) ... (b) ... (II) ...
            // We'll iterate through the text extracting these blocks.

            const list1 = [];
            const list2 = [];

            // Normalize spaces
            const cleanText = text.replace(/\s+/g, ' ');

            // Regex for items: (a) Text (I) Text (b)...
            // We look for (char) text ... (Roman/Num) text

            // Let's split by List I item markers (a), (b), (c)...
            const parts = cleanText.split(/\(([a-e])\)/);
            // parts[0] is header garbage
            // parts[1] is 'a', parts[2] is content...

            if (parts.length < 3) return null; // Not enough parts

            for (let i = 1; i < parts.length; i += 2) {
                const label1 = parts[i]; // a, b, c
                let contentChunk = parts[i + 1]; // Text (I) Text... or last bit

                // Inside contentChunk, find the List II marker (I), (II)...
                const split2 = contentChunk.split(/\(([IVX]+|\d+)\)/);

                if (split2.length >= 3) {
                    const text1 = split2[0].trim();
                    const label2 = split2[1]; // I, II..

                    // The text2 is the rest, but we need to stop before the next List I marker which split removed
                    // Actually split removed the next marker? No, split consumed it.
                    // Wait, the main split split by (a). So contentChunk ends where next (b) began.
                    // So contentChunk contains: "  Text for a   (I)  Text for I " 

                    let text2 = split2.slice(2).join('(').trim(); // Rejoin if multiple parens inside text

                    // Clean up footer from the last item
                    if (i + 2 >= parts.length) {
                        const fIndex = text2.indexOf("Choose the correct");
                        if (fIndex > -1) text2 = text2.substring(0, fIndex).trim();
                    }

                    list1.push({ label: label1, text: text1 });
                    list2.push({ label: label2, text: text2 });
                } else {
                    // Render failure
                    return null;
                }
            }

            if (list1.length === 0) return null;

            return { header, list1, list2, footer };

        } catch (e) {
            console.error("Parse Match Error", e);
            return null; // Fallback to raw text
        }
    }
};

// Init
window.onload = app.init;
