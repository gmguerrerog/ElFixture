document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Typing Flicker Effect ---
    const neuralInputs = document.querySelectorAll('.neural-input');

    neuralInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            // Add flicker class
            e.target.classList.add('flicking');

            // Remove it quickly to create the digital typing effect
            setTimeout(() => {
                e.target.classList.remove('flicking');
            }, 100);
        });
    });

    // --- 2. Mode Selector (Football vs E-sports) ---
    const btnFootball = document.getElementById('btn-football');
    const btnEsports = document.getElementById('btn-esports');

    btnFootball.addEventListener('click', () => {
        btnFootball.classList.add('active');
        btnEsports.classList.remove('active');
        // Subtle background shift could be added here
        document.body.style.setProperty('--void-bg', '#020202');
    });

    btnEsports.addEventListener('click', () => {
        btnEsports.classList.add('active');
        btnFootball.classList.remove('active');
        // Shift to a slightly more purple/cyberpunk tone for E-sports
        document.body.style.setProperty('--void-bg', '#05020a');
    });

    // --- 3. Share Button Pulse ---
    const btnShare = document.getElementById('btn-share');
    btnShare.addEventListener('click', function (e) {
        let x = e.clientX - e.target.offsetLeft;
        let y = e.clientY - e.target.offsetTop;

        let ripples = document.createElement('span');
        ripples.style.left = x + 'px';
        ripples.style.top = y + 'px';
        ripples.classList.add('ripple'); // Needs css for this if we want advanced, but hover has a glow

        const originalText = this.querySelector('.orbitron-text').innerText;
        this.querySelector('.orbitron-text').innerText = "CODE: TRN-2050";
        this.style.borderColor = "var(--energy-secondary)";
        this.style.color = "var(--energy-secondary)";

        setTimeout(() => {
            this.querySelector('.orbitron-text').innerText = originalText;
            this.style.borderColor = "var(--energy-primary)";
            this.style.color = "var(--energy-primary)";
        }, 3000);
    });

    // --- 4. Bracket Generation & Flow ---
    const btnGenerate = document.getElementById('generate-bracket');
    const inputModule = document.querySelector('.neural-input-module');
    const bracketView = document.getElementById('bracket-view');

    btnGenerate.addEventListener('click', () => {
        // Collect names
        const teams = [];
        neuralInputs.forEach(input => {
            teams.push(input.value || input.placeholder);
        });

        // Hide input, show bracket
        inputModule.style.display = 'none';
        bracketView.style.display = 'flex';

        // Populate first round
        const r1Nodes = document.querySelectorAll('.round-1 .team-name');
        r1Nodes.forEach((node, index) => {
            if (teams[index]) {
                node.innerText = teams[index];
            }
        });

        // Setup clicking for bracket advancement
        setupBracketInteractions();
    });

    function setupBracketInteractions() {
        const r1Nodes = document.querySelectorAll('.round-1 .node');
        const r2Nodes = document.querySelectorAll('.round-2 .node');
        const finalNode = document.querySelector('.round-final .node');

        // Round 1 to Round 2
        r1Nodes.forEach((node, index) => {
            node.addEventListener('click', function () {
                // Determine which match and which advancing slot
                const matchIndex = Math.floor(index / 2);
                const targetNode = r2Nodes[matchIndex];

                advanceTeam(this, targetNode);
            });
        });

        // Round 2 to Final
        r2Nodes.forEach((node, index) => {
            node.addEventListener('click', function () {
                // Must have a team to advance
                if (this.classList.contains('waiting')) return;

                advanceTeam(this, finalNode, true);
            });
        });
    }

    function advanceTeam(sourceNode, targetNode, isFinal = false) {
        const teamName = sourceNode.querySelector('.team-name').innerText;

        // 1. Source node visual feedback (Cyan burst)
        sourceNode.classList.add('energy-burst');
        setTimeout(() => sourceNode.classList.remove('energy-burst'), 500);

        // 2. Animate connector line (simulated here by adding active class)
        // In a complex layout, we'd trace the exact SVG path.
        const connector = sourceNode.closest('.matchup').querySelector('.energy-connector');
        if (connector) {
            connector.style.background = 'var(--energy-secondary)';
            connector.style.boxShadow = '0 0 15px var(--energy-secondary)';
            setTimeout(() => {
                connector.style.background = 'rgba(0, 243, 255, 0.2)';
                connector.style.boxShadow = 'none';
            }, 1000);
        }

        // 3. Update target node
        setTimeout(() => {
            targetNode.classList.remove('waiting');
            const targetText = targetNode.querySelector('.team-name');
            targetText.innerText = teamName;

            // Particle rebuild effect (simple opacity transition for now)
            targetText.style.opacity = 0;
            targetText.style.transform = 'scale(0.8)';

            setTimeout(() => {
                targetText.style.transition = 'all 0.4s ease';
                targetText.style.opacity = 1;
                targetText.style.transform = 'scale(1)';
            }, 50);

            // Trigger victory
            if (isFinal) {
                triggerVictoryVortex(teamName);
            }
        }, 500); // Delay representing the energy travel time
    }

    // --- 5. Victory Vortex ---
    function triggerVictoryVortex(winnerName) {
        setTimeout(() => {
            const overlay = document.getElementById('victory-overlay');
            const winnerText = overlay.querySelector('.winner-name');

            winnerText.innerText = winnerName;
            overlay.classList.add('active');

            // Click to close
            overlay.addEventListener('click', () => {
                overlay.classList.remove('active');
            });
        }, 1000); // Wait for the final node update, then BAAM
    }

});
