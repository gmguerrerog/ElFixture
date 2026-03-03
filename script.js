document.addEventListener('DOMContentLoaded', () => {

    // --- State & Sync ---
    let tournamentId = window.location.hash.replace('#', '');
    let LOCAL_STORAGE_KEY = tournamentId ? `elfixture_${tournamentId}` : 'elfixture_draft';

    let appState = loadState() || {
        isStarted: false,
        tournamentType: 'bracket', // 'bracket' or 'league'
        teamCount: 8,
        mode: 'football',
        leagueConfig: { rounds: 1 },
        teams: [],
        bracketState: {},
        matches: [] // For league match history
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
    const leagueView = document.getElementById('league-view');
    const promoBanner = document.getElementById('promo-banner');
    const btn8 = document.getElementById('btn-8-teams');
    const btn16 = document.getElementById('btn-16-teams');

    // --- 1. Mode Selectors ---
    const btnFootball = document.getElementById('btn-football');
    const btnEsports = document.getElementById('btn-esports');

    // --- 1.1 System Mode (Bracket vs League) ---
    const btnElimination = document.getElementById('btn-elimination');
    const btnLeague = document.getElementById('btn-league');
    const eliminationConfig = document.getElementById('elimination-config');
    const leagueConfig = document.getElementById('league-config');
    const leagueTeamCount = document.getElementById('league-team-count');
    const btn1Round = document.getElementById('btn-1-round');
    const btn2Rounds = document.getElementById('btn-2-rounds');

    function setTournamentType(type) {
        appState.tournamentType = type;
        saveState();
        if (type === 'bracket') {
            if (btnElimination) btnElimination.classList.add('active');
            if (btnLeague) btnLeague.classList.remove('active');
            if (eliminationConfig) eliminationConfig.style.display = 'flex';
            if (leagueConfig) leagueConfig.style.display = 'none';
            setTeamSize(appState.teamCount || 8);
        } else {
            if (btnLeague) btnLeague.classList.add('active');
            if (btnElimination) btnElimination.classList.remove('active');
            if (eliminationConfig) eliminationConfig.style.display = 'none';
            if (leagueConfig) leagueConfig.style.display = 'flex';
            setTeamSize(parseInt(leagueTeamCount.value) || 4);
        }
    }

    if (btnElimination && btnLeague) {
        btnElimination.addEventListener('click', () => setTournamentType('bracket'));
        btnLeague.addEventListener('click', () => setTournamentType('league'));
    }

    if (leagueTeamCount) {
        leagueTeamCount.addEventListener('input', (e) => {
            let count = parseInt(e.target.value);
            if (count > 20) count = 20;
            if (count < 3) count = 3;
            setTeamSize(count);
        });
    }

    function setLeagueRounds(rounds) {
        appState.leagueConfig.rounds = rounds;
        saveState();
        if (rounds === 1) {
            if (btn1Round) btn1Round.classList.add('active');
            if (btn2Rounds) btn2Rounds.classList.remove('active');
        } else {
            if (btn2Rounds) btn2Rounds.classList.add('active');
            if (btn1Round) btn1Round.classList.remove('active');
        }
    }

    if (btn1Round && btn2Rounds) {
        btn1Round.addEventListener('click', () => setLeagueRounds(1));
        btn2Rounds.addEventListener('click', () => setLeagueRounds(2));
    }

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

    // --- Audio Controls ---
    const btnAudio = document.getElementById('btn-audio');
    const epicAudio = document.getElementById('epic-audio');

    if (btnAudio && epicAudio) {
        epicAudio.volume = 0.4;
        let userPaused = false;

        function attemptPlay() {
            if (userPaused) return;
            epicAudio.play().then(() => {
                btnAudio.querySelector('.orbitron-text').innerText = '🎵 MÚSICA: ON';
                btnAudio.classList.add('playing');
            }).catch(e => {
                console.log("Auto-play prevented by browser. Wait for user interaction.");
                btnAudio.querySelector('.orbitron-text').innerText = '🎵 MÚSICA: OFF';
                btnAudio.classList.remove('playing');
            });
        }

        // Try to play immediately
        attemptPlay();

        // Any user interaction will trigger playback if it was blocked
        document.body.addEventListener('click', () => {
            if (epicAudio.paused) attemptPlay();
        }, { once: true });

        btnAudio.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent body click from firing simultaneously
            if (epicAudio.paused || userPaused) {
                userPaused = false;
                attemptPlay();
            } else {
                epicAudio.pause();
                userPaused = true;
                btnAudio.querySelector('.orbitron-text').innerText = '🎵 MÚSICA: OFF';
                btnAudio.classList.remove('playing');
            }
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
                if (input) appState.teams.push(input.value || input.placeholder);
            }
            appState.isStarted = true;

            if (appState.tournamentType === 'bracket') {
                appState.bracketState = {}; // Reset bracket history
                saveState();
                showBracket();
            } else {
                generateLeagueSchedule();
                saveState();
                showLeague();
            }
        });
    }

    // --- League Schedule Algorithm (Round-Robin) ---
    function generateLeagueSchedule() {
        let teams = [...appState.teams];
        if (teams.length % 2 !== 0) {
            teams.push(null); // 'null' acts as a Bye
        }

        const numTeams = teams.length;
        const totalRounds = numTeams - 1;
        const matchesPerRound = numTeams / 2;
        let matches = [];
        let matchIndex = 0;

        for (let round = 0; round < totalRounds; round++) {
            for (let match = 0; match < matchesPerRound; match++) {
                const home = (round + match) % (numTeams - 1);
                let away = (numTeams - 1 - match + round) % (numTeams - 1);

                if (match === 0) {
                    away = numTeams - 1;
                }

                let homeTeam = teams[home];
                let awayTeam = teams[away];

                if (match === 0 && round % 2 !== 0) {
                    let temp = homeTeam;
                    homeTeam = awayTeam;
                    awayTeam = temp;
                }

                if (homeTeam !== null && awayTeam !== null) {
                    matches.push({
                        id: `match-${matchIndex++}`,
                        round: round + 1,
                        home: homeTeam,
                        away: awayTeam,
                        scoreHome: null,
                        scoreAway: null
                    });
                }
            }
        }

        if (appState.leagueConfig && appState.leagueConfig.rounds === 2) {
            const firstHalfPairs = [...matches];
            firstHalfPairs.forEach(m => {
                matches.push({
                    id: `match-${matchIndex++}`,
                    round: m.round + totalRounds,
                    home: m.away,
                    away: m.home,
                    scoreHome: null,
                    scoreAway: null
                });
            });
        }

        appState.matches = matches;
    }

    function showBracket() {
        inputModule.style.display = 'none';
        if (promoBanner) promoBanner.style.display = 'none';
        if (leagueView) leagueView.style.display = 'none';
        bracketView.style.display = 'flex';
        renderBracket(appState.teams);
        restoreBracketState();
    }

    function showLeague() {
        inputModule.style.display = 'none';
        if (promoBanner) promoBanner.style.display = 'none';
        bracketView.style.display = 'none';
        if (leagueView) leagueView.style.display = 'block'; // Or flex depending on layout needs, but display:block works over the container
        renderCalendar();
        renderLeaderboard();
    }

    // --- League Render Logic ---
    function renderCalendar() {
        const matchesListContainer = document.getElementById('matches-list-container');
        if (!matchesListContainer) return;

        matchesListContainer.innerHTML = '';

        // Group matches by round
        const rounds = {};
        appState.matches.forEach(m => {
            if (!rounds[m.round]) rounds[m.round] = [];
            rounds[m.round].push(m);
        });

        Object.keys(rounds).sort((a, b) => a - b).forEach(rNum => {
            const roundMatchList = rounds[rNum];

            const roundHeader = document.createElement('h3');
            roundHeader.className = 'orbitron-text glow-text sm';
            roundHeader.style.fontSize = '0.9rem';
            roundHeader.style.marginTop = '15px';
            roundHeader.style.marginBottom = '5px';
            roundHeader.innerText = `FECHA ${rNum}`;
            matchesListContainer.appendChild(roundHeader);

            roundMatchList.forEach(m => {
                const card = document.createElement('div');
                card.className = 'match-card';
                card.innerHTML = `
                    <div class="match-team right">${m.home}</div>
                    <div class="score-inputs">
                        <input type="number" class="score-input p-home" data-id="${m.id}" data-side="home" min="0" value="${m.scoreHome !== null ? m.scoreHome : ''}">
                        <span style="color:rgba(255,255,255,0.3)">-</span>
                        <input type="number" class="score-input p-away" data-id="${m.id}" data-side="away" min="0" value="${m.scoreAway !== null ? m.scoreAway : ''}">
                    </div>
                    <div class="match-team">${m.away}</div>
                `;
                matchesListContainer.appendChild(card);
            });
        });

        // Add Listeners
        const scoreInputs = matchesListContainer.querySelectorAll('.score-input');
        scoreInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const side = e.target.getAttribute('data-side');
                const val = e.target.value === '' ? null : parseInt(e.target.value);

                const match = appState.matches.find(m => m.id === id);
                if (match) {
                    if (side === 'home') match.scoreHome = val;
                    if (side === 'away') match.scoreAway = val;
                    saveState();
                    renderLeaderboard();
                }
            });
        });
    }

    function computeLeaderboard() {
        const stats = {};

        // Initialize stats
        appState.teams.forEach(t => {
            stats[t] = { name: t, PTS: 0, PJ: 0, PG: 0, PE: 0, PP: 0, GF: 0, GC: 0, DIF: 0 };
        });

        // Tally scores
        appState.matches.forEach(m => {
            if (m.scoreHome !== null && m.scoreAway !== null) {
                const hStats = stats[m.home];
                const aStats = stats[m.away];

                hStats.PJ++;
                aStats.PJ++;
                hStats.GF += m.scoreHome;
                hStats.GC += m.scoreAway;
                aStats.GF += m.scoreAway;
                aStats.GC += m.scoreHome;

                if (m.scoreHome > m.scoreAway) {
                    hStats.PG++; hStats.PTS += 3;
                    aStats.PP++;
                } else if (m.scoreHome < m.scoreAway) {
                    aStats.PG++; aStats.PTS += 3;
                    hStats.PP++;
                } else {
                    hStats.PE++; hStats.PTS += 1;
                    aStats.PE++; aStats.PTS += 1;
                }
            }
        });

        const arr = Object.values(stats);
        arr.forEach(s => s.DIF = s.GF - s.GC);

        // Standard tie-breakers: PTS > DIF > GF > PG > lowest GC
        arr.sort((a, b) => {
            if (b.PTS !== a.PTS) return b.PTS - a.PTS;
            if (b.DIF !== a.DIF) return b.DIF - a.DIF;
            if (b.GF !== a.GF) return b.GF - a.GF;
            if (b.PG !== a.PG) return b.PG - a.PG;
            return a.GC - b.GC;
        });

        return arr;
    }

    function renderLeaderboard() {
        const tbody = document.getElementById('leaderboard-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const sorted = computeLeaderboard();

        sorted.forEach((teamStats, index) => {
            const tr = document.createElement('tr');
            tr.className = 'leaderboard-row';
            if (index === 0 && teamStats.PJ > 0) tr.classList.add('rank-1');

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td class="text-left">${teamStats.name}</td>
                <td><strong>${teamStats.PTS}</strong></td>
                <td>${teamStats.PJ}</td>
                <td>${teamStats.PG}</td>
                <td>${teamStats.PE}</td>
                <td>${teamStats.PP}</td>
                <td>${teamStats.GF}</td>
                <td>${teamStats.GC}</td>
                <td>${teamStats.DIF > 0 ? '+' + teamStats.DIF : teamStats.DIF}</td>
            `;
            tbody.appendChild(tr);
        });
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
        if (appState.isStarted) {
            if (appState.tournamentType === 'bracket') {
                showBracket();
            } else {
                showLeague();
            }
        } else {
            setTournamentType(appState.tournamentType || 'bracket');
            setTeamSize(appState.teamCount || 8);
            setMode(appState.mode || 'football');
            setLeagueRounds(appState.leagueConfig ? appState.leagueConfig.rounds : 1);
        }
    } catch (e) {
        console.error("Initialization error", e);
        // Fallback
        setTeamSize(8);
        renderInputs(8);
    }

    // --- Epic 3: Legal Modals Logic ---
    const legalLinks = document.querySelectorAll('.legal-link');
    const modalCloses = document.querySelectorAll('.modal-close');
    const overlays = document.querySelectorAll('.cyber-modal-overlay');

    legalLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-modal');
            const targetModal = document.getElementById(targetId);
            if (targetModal) targetModal.classList.add('active');
        });
    });

    modalCloses.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.cyber-modal-overlay').classList.remove('active');
        });
    });

    overlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    // --- Epic 3: HTML2Canvas Export Logic ---
    function exportToPNG(elementId, filename) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Save original styles explicitly
        const originalBg = element.style.backgroundColor || '';
        const originalPadding = element.style.padding || '';
        const originalRadius = element.style.borderRadius || '';

        // Force a solid dark background so transparent areas don't render black weirdly
        element.style.backgroundColor = '#020202';
        element.style.padding = '20px';
        element.style.borderRadius = '10px';

        // Use a safe scale for mobile (devicePixelRatio often crashes iOS if too high)
        const scaleValue = window.devicePixelRatio > 1 ? 2 : 1;

        html2canvas(element, {
            backgroundColor: '#020202',
            scale: scaleValue,
            useCORS: true,
            allowTaint: true, // helps with some image loading
            logging: false,
            // scrollX and Y can sometimes help with shifted mobile renders
            scrollX: 0,
            scrollY: -window.scrollY
        }).then(canvas => {
            // Restore origin style
            element.style.backgroundColor = originalBg;
            element.style.padding = originalPadding;
            element.style.borderRadius = originalRadius;

            try {
                const imgData = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = filename;
                link.href = imgData;

                // Append, click, remove - much safer for mobile browsers
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (err) {
                console.error("Canvas toDataURL failed: ", err);
                alert("Tu navegador móvil bloqueó la descarga de la imagen por seguridad. Intenta desde un PC.");
            }
        }).catch(err => {
            console.error("Export Error: ", err);
            alert("Hubo un error al generar la imagen. Intenta de nuevo.");
            element.style.backgroundColor = originalBg;
            element.style.padding = originalPadding;
            element.style.borderRadius = originalRadius;
        });
    }

    const btnExportLeague = document.getElementById('btn-export-league');
    if (btnExportLeague) {
        btnExportLeague.addEventListener('click', (e) => {
            e.preventDefault();
            // Wrap the table or just target the parent module to get the whole leaderboard
            exportToPNG('league-view', 'ElFixture_Liga.png');
        });
    }

    const btnExportChampion = document.getElementById('btn-export-champion');
    if (btnExportChampion) {
        btnExportChampion.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent vortex closing
            e.preventDefault();
            exportToPNG('champion-export-area', 'ElFixture_Campeon.png');
        });
    }

});
