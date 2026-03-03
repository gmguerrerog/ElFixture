document.addEventListener('DOMContentLoaded', () => {

    // --- State & Sync ---
    let tournamentId = window.location.hash.replace('#', '');
    let LOCAL_STORAGE_KEY = tournamentId ? `elfixture_${tournamentId}` : 'elfixture_draft';

    let appState = loadState() || {
        isStarted: false,
        teamCount: 8,
        mode: 'football',
        teams: [],
        bracketState: {} // e.g. "r1-m0": "TEAM A" (winners)
    };

    function loadState() {
        try {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (e) { return null; }
    }

    function saveState() {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
        // Simple visual pulse on save
        const pulse = document.querySelector('.pulse-dot');
        if (pulse) {
            pulse.style.backgroundColor = '#FFFFFF';
            setTimeout(() => pulse.style.backgroundColor = 'var(--energy-secondary)', 200);
        }
    }

    // Logo Home Reset
    const logoHome = document.getElementById('logo-home');
    if (logoHome) {
        logoHome.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear default draft to avoid getting stuck
            localStorage.removeItem('elfixture_draft');

            // Redirect to base path without hash or query params
            window.location.href = window.location.pathname;
        });
    }

    // --- Elements ---
    const inputGrid = document.getElementById('input-grid-container');
    const bracketGrid = document.getElementById('bracket-grid');
    const inputModule = document.querySelector('.neural-input-module');
    const bracketView = document.getElementById('bracket-view');
    const btn8 = document.getElementById('btn-8-teams');
    const btn16 = document.getElementById('btn-16-teams');

    // --- 1. Mode Selectors ---
    const btnFootball = document.getElementById('btn-football');
    const btnEsports = document.getElementById('btn-esports');

    function setMode(mode) {
        appState.mode = mode;
        saveState();
        if (mode === 'football') {
            btnFootball.classList.add('active');
            btnEsports.classList.remove('active');
            document.body.style.setProperty('--void-bg', '#020202');
        } else {
            btnEsports.classList.add('active');
            btnFootball.classList.remove('active');
            document.body.style.setProperty('--void-bg', '#05020a');
        }
    }

    if (btnFootball && btnEsports) {
        btnFootball.addEventListener('click', () => setMode('football'));
        btnEsports.addEventListener('click', () => setMode('esports'));
    }

    // --- Team Size Selectors ---
    function setTeamSize(size) {
        appState.teamCount = size;
        saveState();
        if (size === 8) {
            btn8.classList.add('active');
            btn16.classList.remove('active');
        } else {
            btn16.classList.add('active');
            btn8.classList.remove('active');
        }
        renderInputs(size);
    }

    if (btn8 && btn16) {
        btn8.addEventListener('click', () => setTeamSize(8));
        btn16.addEventListener('click', () => setTeamSize(16));
    }

    function renderInputs(count) {
        if (!inputGrid) return;
        inputGrid.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const num = i.toString().padStart(2, '0');
            const placeholder = appState.teams[i - 1] || `EQUIPO_${num}`;
            const html = `
                <div class="input-slot">
                    <span class="slot-id">${num}</span>
                    <input type="text" class="neural-input" placeholder="${placeholder}" value="${appState.teams[i - 1] || ''}" id="team-input-${i}">
                    <div class="laser-border"></div>
                </div>
            `;
            inputGrid.insertAdjacentHTML('beforeend', html);
        }

        const neuralInputs = document.querySelectorAll('.neural-input');
        neuralInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.classList.add('flicking');
                setTimeout(() => e.target.classList.remove('flicking'), 100);
            });
        });
    }

    // --- 2. Share Button Pulse & WhatsApp ---
    const btnShare = document.getElementById('btn-share');
    if (btnShare) {
        btnShare.addEventListener('click', function (e) {
            const originalText = this.querySelector('.orbitron-text').innerText;
            if (originalText.includes("ENVIADO")) return;

            if (!appState.isStarted || !tournamentId) {
                alert("Primero genera el torneo para poder compartirlo.");
                return;
            }

            this.querySelector('.orbitron-text').innerText = "LINK ENVIADO";
            this.style.borderColor = "var(--energy-secondary)";
            this.style.color = "var(--energy-secondary)";

            // Generate WhatsApp Link
            const currentUrl = window.location.href;
            const message = encodeURIComponent(`¡Sigue el torneo de ElFixture.com en vivo!\nEntra aquí para ver los resultados en tiempo real: ${currentUrl}`);
            window.open(`https://wa.me/?text=${message}`, '_blank');

            setTimeout(() => {
                this.querySelector('.orbitron-text').innerText = "COMPARTIR";
                this.style.borderColor = "var(--energy-primary)";
                this.style.color = "var(--energy-primary)";
            }, 3000);
        });
    }

    // --- 3. Bracket Generation ---
    const btnGenerate = document.getElementById('generate-bracket');

    if (btnGenerate) {
        btnGenerate.addEventListener('click', () => {
            // If it's a new draft, generate an ID and update URL
            if (!tournamentId) {
                tournamentId = Math.random().toString(36).substr(2, 9);
                LOCAL_STORAGE_KEY = `elfixture_${tournamentId}`;
                window.location.hash = tournamentId;
            }

            appState.teams = [];
            for (let i = 1; i <= appState.teamCount; i++) {
                const input = document.getElementById(`team-input-${i}`);
                appState.teams.push(input.value || input.placeholder);
            }
            appState.isStarted = true;
            appState.bracketState = {}; // Reset bracket history
            saveState();

            showBracket();
        });
    }

    function showBracket() {
        inputModule.style.display = 'none';
        bracketView.style.display = 'flex';
        renderBracket(appState.teams);
        restoreBracketState();
    }

    function createNode(teamName, round, match, position) {
        const node = document.createElement('div');
        node.className = `node panel-glass ${teamName ? '' : 'waiting'}`;
        node.dataset.round = round;
        node.dataset.match = match;
        node.dataset.pos = position;
        node.dataset.id = `r${round}-m${match}-p${position}`;
        node.innerHTML = `
            <span class="team-name roboto-mono">${teamName || 'ESPERANDO'}</span>
            <div class="laser-border"></div>
        `;
        return node;
    }

    function renderBracket(teams) {
        bracketGrid.innerHTML = '';
        const numRounds = Math.log2(teams.length);
        let previousNodesCount = teams.length;

        for (let r = 1; r <= numRounds; r++) {
            const currentNodesCount = previousNodesCount / 2;
            const roundDiv = document.createElement('div');
            roundDiv.className = `round round-${r}`;

            for (let m = 0; m < currentNodesCount; m++) {
                const matchupDiv = document.createElement('div');
                matchupDiv.className = 'matchup';

                // Top node
                const nodeA = createNode(r === 1 ? teams[m * 2] : null, r, m, 0);

                // Vertical internal connector
                const connector = document.createElement('div');
                connector.className = 'energy-connector';
                connector.style.width = '2px';
                connector.style.height = '15px';
                connector.style.background = 'rgba(0, 243, 255, 0.2)';
                connector.style.margin = '5px auto';

                // Bottom node
                const nodeB = createNode(r === 1 ? teams[m * 2 + 1] : null, r, m, 1);

                matchupDiv.appendChild(nodeA);
                matchupDiv.appendChild(connector);
                matchupDiv.appendChild(nodeB);
                roundDiv.appendChild(matchupDiv);
            }
            bracketGrid.appendChild(roundDiv);

            // Connectors to next round visual separator (Sci-Fi Data Highway)
            if (r < numRounds) {
                const colDiv = document.createElement('div');
                colDiv.className = 'connector-column';
                colDiv.innerHTML = `
                    <div style="width: 100%; height: 2px; background: rgba(0, 243, 255, 0.15); box-shadow: 0 0 8px rgba(0, 243, 255, 0.3);"></div>
                `;
                bracketGrid.appendChild(colDiv);
            }

            previousNodesCount = currentNodesCount;
        }

        // --- Final Connector ---
        const finalCol = document.createElement('div');
        finalCol.className = 'connector-column';
        finalCol.innerHTML = `
            <div style="width: 100%; height: 2px; background: rgba(255, 138, 0, 0.3); box-shadow: 0 0 10px rgba(255, 138, 0, 0.5);"></div>
        `;
        bracketGrid.appendChild(finalCol);

        // --- Final Winner Node ---
        const roundFinal = document.createElement('div');
        roundFinal.className = 'round round-final';
        roundFinal.innerHTML = `
            <div class="node final-node panel-glass waiting" data-round="final" data-id="final-winner">
                <div class="shield-icon glow-orange"></div>
                <span class="team-name orbitron-text">CHAMPION</span>
                <div class="laser-border primary-glow"></div>
            </div>
        `;
        bracketGrid.appendChild(roundFinal);

        setupBracketInteractions(numRounds);
    }

    // Restore state from LocalStorage after rendering
    function restoreBracketState() {
        for (const [targetId, teamName] of Object.entries(appState.bracketState)) {
            const targetNode = document.querySelector(`.node[data-id="${targetId}"]`);
            if (targetNode) {
                targetNode.classList.remove('waiting');
                targetNode.querySelector('.team-name').innerText = teamName;
            }
        }
    }

    // Multi-tab Sync Listener
    window.addEventListener('storage', (e) => {
        if (e.key === LOCAL_STORAGE_KEY) {
            appState = JSON.parse(e.newValue);
            if (appState.isStarted) {
                showBracket();
            } else {
                renderInputs(appState.teamCount);
            }
        }
    });

    // --- 4. Logic & Flow Interactions ---
    function setupBracketInteractions(numRounds) {
        const allNodes = document.querySelectorAll('.node:not(.final-node)');

        allNodes.forEach(node => {
            node.addEventListener('click', function () {
                if (this.classList.contains('waiting')) return;

                const currentRound = parseInt(this.dataset.round);
                const currentMatch = parseInt(this.dataset.match);
                const teamName = this.querySelector('.team-name').innerText;

                let targetNode;
                let isFinal = false;
                let targetId = '';

                if (currentRound === numRounds) {
                    targetNode = document.querySelector('.final-node');
                    isFinal = true;
                    targetId = 'final-winner';
                } else {
                    const nextRound = currentRound + 1;
                    const nextMatch = Math.floor(currentMatch / 2);
                    const isBottomNode = currentMatch % 2 !== 0;

                    const nextRoundDiv = document.querySelector(`.round-${nextRound}`);
                    const targetMatchup = nextRoundDiv.querySelectorAll('.matchup')[nextMatch];
                    const nodesInMatchup = targetMatchup.querySelectorAll('.node');

                    targetNode = isBottomNode ? nodesInMatchup[1] : nodesInMatchup[0];
                    targetId = targetNode.dataset.id;
                }

                // Save State
                appState.bracketState[targetId] = teamName;
                saveState();

                advanceTeam(this, targetNode, teamName, isFinal);
            });
        });
    }

    function advanceTeam(sourceNode, targetNode, teamName, isFinal = false) {
        // Visual Burst
        sourceNode.classList.add('energy-burst');
        setTimeout(() => sourceNode.classList.remove('energy-burst'), 500);

        // Internal connector animation
        const mx = sourceNode.closest('.matchup');
        const connector = mx ? mx.querySelector('.energy-connector') : null;
        if (connector && !isFinal) {
            connector.style.background = 'var(--energy-secondary)';
            connector.style.boxShadow = '0 0 15px var(--energy-secondary)';
            setTimeout(() => {
                connector.style.background = 'rgba(0, 243, 255, 0.2)';
                connector.style.boxShadow = 'none';
            }, 1000);
        }

        // Fill target text
        setTimeout(() => {
            targetNode.classList.remove('waiting');
            const targetText = targetNode.querySelector('.team-name');
            targetText.innerText = teamName;

            targetText.style.opacity = 0;
            targetText.style.transform = 'scale(0.8)';

            setTimeout(() => {
                targetText.style.transition = 'all 0.4s ease';
                targetText.style.opacity = 1;
                targetText.style.transform = 'scale(1)';
            }, 50);

            if (isFinal) {
                triggerVictoryVortex(teamName);
            }
        }, 500);
    }

    // --- 5. Victory Vortex ---
    function triggerVictoryVortex(winnerName) {
        setTimeout(() => {
            const overlay = document.getElementById('victory-overlay');
            const winnerText = overlay.querySelector('.winner-name');

            winnerText.innerText = winnerName;
            overlay.classList.add('active');

            overlay.addEventListener('click', () => {
                overlay.classList.remove('active');
            }, { once: true });
        }, 1000);
    }

    // Initialize App based on saved state
    try {
        setMode(appState.mode || 'football');
        setTeamSize(appState.teamCount || 8);
        if (appState.isStarted) {
            showBracket();
        }
    } catch (e) {
        console.error("Initialization error", e);
        // Fallback
        setTeamSize(8);
        renderInputs(8);
    }

});
