const app = {
    tests: [
        { id: 1, file: 'psych_test_01.json', title: 'Mock Test 1 (March 2023)', questions: 100 },
        { id: 2, file: 'psych_test_02.json', title: 'Mock Test 2 ("SEPTEMBER 2022 SHIFT I")', questions: 100 },
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
        timerId: null, // Legacy support, now using app.timerId
    },

    timerId: null, // App-level timer reference
    isLoading: false,

    init: () => {
        app.renderDashboard();
    },

    loadDashboard: () => {
        if (app.timerId) clearInterval(app.timerId);
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
                <span class="icon">📝</span> ${t.title}
            </button>
        `).join('');
    },

    startTest: async (id) => {
        if (app.isLoading) return; // Prevent double clicks
        app.isLoading = true;

        const test = app.tests.find(t => t.id === id);
        if (!test) { app.isLoading = false; return; }

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
            currentQIndex: 0,
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

        // Adjust UI for Review Mode (Apply to ALL buttons)
        const submitBtns = document.querySelectorAll('.submit-btn');
        submitBtns.forEach(btn => {
            if (isCompleted) {
                btn.innerText = "Back to Results";
                btn.onclick = app.showResults;
                document.getElementById('timer').style.display = 'none';
            } else {
                btn.innerText = "Submit Test";
                btn.onclick = app.submitTest;
                document.getElementById('timer').style.display = 'block';
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
                const correctAnswers = q.answer ? q.answer.split(',').map(s => s.trim()) : [];

                if (userAns) {
                    if (correctAnswers.includes(userAns)) el.classList.add('p-correct');
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

    reviewTest: () => {
        document.getElementById('resultsView').classList.add('hidden');
        document.getElementById('testInterface').classList.remove('hidden');
        app.loadQuestion(0);
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
