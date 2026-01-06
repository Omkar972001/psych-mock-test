const app = {
    tests: [
        { id: 1, file: 'psych_test_01.json', title: 'Mock Test 1 (March 2023)', questions: 100 },
        { id: 2, file: 'psych_test_02.json', title: 'Mock Test 2 (Dec 2019)', questions: 100 },
        { id: 3, file: 'psych_test_03.json', title: 'Mock Test 3 (June 2019)', questions: 100 },
        { id: 4, file: 'psych_test_04.json', title: 'Mock Test 4 (Dec 2018)', questions: 100 }
    ],
    state: {
        currentTestId: null,
        data: null,
        currentInfo: null, // metadata
        answers: {}, // { qId: "A" }
        visited: new Set(),
        currentQIndex: 0,
        timeLeft: 7200, // 2 hours in seconds
        timerId: null,
        isReviewMode: false,
        lastScore: 0
    },

    init: () => {
        app.renderDashboard();
    },

    loadDashboard: () => {
        clearInterval(app.state.timerId);
        document.getElementById('dashboardView').classList.remove('hidden');
        document.getElementById('testInterface').classList.add('hidden');
        document.getElementById('resultsView').classList.add('hidden');
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.nav-item').classList.add('active'); // Dashboard active
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

            return `
            <div class="test-card ${cName}" onclick="app.startTest(${t.id})">
                <span class="test-badge">Full Mock</span>
                <div class="test-title">${t.title}</div>
                <div class="test-meta">${t.questions} Questions • 120 Mins</div>
                ${scoreBadge}
                <button class="start-btn">${status}</button>
                ${retakeHtml}
            </div>
        `}).join('');

        const list = document.getElementById('testList');
        list.innerHTML = app.tests.map(t => `
            <button class="nav-item" onclick="app.startTest(${t.id})">
                <span class="icon">📝</span> Option ${t.id}
            </button>
        `).join('');
    },

    startTest: async (id) => {
        const test = app.tests.find(t => t.id === id);
        if (!test) return;

        // Load Persisted State if exists
        const savedKey = `psych_test_${id}_state`;
        const savedRaw = localStorage.getItem(savedKey);
        let saved = savedRaw ? JSON.parse(savedRaw) : null;

        const isCompleted = saved?.completed;

        // Reset State
        app.state = {
            currentTestId: id,
            currentInfo: test,
            data: null,
            answers: saved?.answers || {},
            visited: new Set(saved?.visited || []),
            currentQIndex: 0,
            timeLeft: saved?.timeLeft || 7200,
            timerId: null,
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

        // Adjust UI for Review Mode
        const submitBtn = document.querySelector('.submit-btn');
        if (isCompleted) {
            submitBtn.innerText = "Back to Results";
            submitBtn.onclick = app.showResults;
            document.getElementById('timer').style.display = 'none';
        } else {
            submitBtn.innerText = "Submit Test";
            submitBtn.onclick = app.submitTest;
            document.getElementById('timer').style.display = 'block';
        }

        // Fetch Data
        try {
            const res = await fetch(test.file);
            if (!res.ok) throw new Error("Failed to load");
            const data = await res.json();
            app.state.data = data;

            if (!data.questions || data.questions.length === 0) {
                alert("This test has no questions available yet.");
                app.loadDashboard();
                return;
            }

            if (!isCompleted) app.startTimer();
            app.loadQuestion(0);
            app.renderPalette();
        } catch (e) {
            console.error(e);
            alert("Error loading test data: " + e.message);
            app.loadDashboard();
        }
    },

    startTimer: () => {
        const display = document.getElementById('timer');

        // Clear existing to avoid dupes
        if (app.state.timerId) clearInterval(app.state.timerId);

        app.state.timerId = setInterval(() => {
            app.state.timeLeft--;

            // Persist every 5 secs (Optimization)
            if (app.state.timeLeft % 5 === 0) app.persistState();

            if (app.state.timeLeft <= 0) {
                app.submitTest();
            }

            const hours = Math.floor(app.state.timeLeft / 3600);
            const mins = Math.floor((app.state.timeLeft % 3600) / 60);
            const secs = app.state.timeLeft % 60;
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
            timeLeft: app.state.timeLeft,
            completed: app.state.isReviewMode,
            score: app.state.lastScore
        };
        localStorage.setItem(key, JSON.stringify(payload));
    },

    loadQuestion: (index) => {
        if (index < 0 || index >= app.state.data.questions.length) return;

        app.state.currentQIndex = index;
        const q = app.state.data.questions[index];
        app.state.visited.add(q.id);

        // Update UI
        document.getElementById('qNum').innerText = q.id;
        document.getElementById('qText').innerText = q.question;

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
                const correctAns = q.answer ? q.answer.trim() : null;
                // Highlight Correct Answer
                if (label === correctAns) {
                    reviewClass = "correct-opt";
                    correctIcon = "✅";
                }
                // Highlight Wrong Selection
                if (isSelected && label !== correctAns) {
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
        app.state.answers[q.id] = val;
        app.loadQuestion(app.state.currentQIndex);
        app.persistState();
    },

    nextQuestion: () => {
        app.loadQuestion(app.state.currentQIndex + 1);
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
            if (i === app.state.currentQIndex) el.classList.add('active');

            // Review Mode Coloring
            if (app.state.isReviewMode) {
                const userAns = app.state.answers[q.id];
                const correctAns = q.answer ? q.answer.trim() : null;

                if (userAns) {
                    if (userAns === correctAns) el.classList.add('p-correct');
                    else el.classList.add('p-wrong');
                } else if (userAns === undefined && app.state.visited.has(q.id)) {
                    // Visited but not answered in review?
                }
            } else {
                // Normal Mode
                if (app.state.answers[q.id]) el.classList.add('answered');
                else if (app.state.visited.has(q.id)) el.classList.add('visited');
            }
        });
    },

    submitTest: () => {
        if (confirm("Are you sure you want to submit?")) {
            app.processResults();
        }
    },

    processResults: () => {
        clearInterval(app.state.timerId);

        let correct = 0;
        let incorrect = 0;
        let unanswered = 0;

        app.state.data.questions.forEach(q => {
            const userAns = app.state.answers[q.id];

            if (!userAns) {
                unanswered++;
            } else if (q.answer && userAns === q.answer.trim()) {
                correct++;
            } else {
                incorrect++;
            }
        });

        // Update State
        app.state.isReviewMode = true;
        app.state.lastScore = correct * 2;
        app.persistState(); // This saves as completed

        app.showResults();

        // Update Stats on card immediately if we returned to dashboard, but here we show result View
        setTimeout(() => {
            const circle = document.querySelector('.score-circle');
            if (circle) {
                const pct = (correct / app.state.data.questions.length) * 100;
                circle.style.setProperty('--score-pct', pct);
            }
            document.getElementById('scoreValue').innerText = correct * 2;
            document.getElementById('correctCount').innerText = correct;
            document.getElementById('incorrectCount').innerText = incorrect;
            document.getElementById('unansweredCount').innerText = unanswered;
        }, 100);
    },

    showResults: () => {
        document.getElementById('testInterface').classList.add('hidden');
        document.getElementById('resultsView').classList.remove('hidden');
    },

    retakeTest: () => {
        if (!app.state.currentTestId) return;
        if (confirm("This will clear your previous progress and score. Are you sure you want to retake the test?")) {
            const id = app.state.currentTestId;
            const key = `psych_test_${id}_state`;
            localStorage.removeItem(key);
            app.startTest(id);
        }
    }
};

// Init
window.onload = app.init;
