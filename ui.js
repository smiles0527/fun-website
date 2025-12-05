// ui.js - Terminal UI Manager

class TerminalUI {
    constructor(game) {
        this.game = game;
        this.elements = {
            resourceStrip: document.getElementById('resource-strip'),
            visualArea: document.getElementById('visual-area'),
            asciiArt: document.getElementById('ascii-art'),
            logDisplay: document.getElementById('log-display'),
            controlsArea: document.getElementById('controls-area'),
            navStrip: document.getElementById('nav-strip')
        };
        
        this.currentView = 'main'; // main, upgrades, research, jobs
        this.lastControlsHTML = '';
        this.lastNavHTML = '';
        this.lastResourceHTML = '';
        this.asciiBrain = `
      .---.
    .'     '.
   /   o  o  \\
  |    __    |
   \\  (  )  /
    '.____.'
        `;
    }

    init() {
        this.elements.asciiArt.textContent = ""; // Start empty
        this.elements.clickFeedback = document.getElementById('click-feedback');
        this.elements.brainWrapper = document.getElementById('brain-wrapper');
        
        // Click handler on the wrapper for better usability
        this.elements.brainWrapper.onclick = () => {
            this.game.clickBrain();
            
            // Show feedback
            const immunityMult = 100 / Math.max(1, this.game.resources.immunity);
            const gain = this.game.clickValue.braindead * immunityMult;
            const caps = this.game.calculateCaps();
            
            const fb = this.elements.clickFeedback;
            
            if (this.game.resources.braindead >= caps.braindead) {
                fb.textContent = `+0 (MAX)`;
                fb.style.color = '#ff4444';
            } else {
                fb.textContent = `+${Math.floor(gain)} Bd`;
                fb.style.color = ''; // Reset color
            }
            
            fb.classList.remove('visible');
            void fb.offsetWidth; // Trigger reflow
            fb.classList.add('visible');
            
            if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
            
            this.feedbackTimeout = setTimeout(() => {
                fb.classList.remove('visible');
            }, 100); // Start fading out quickly
        };
        
        // Prevent double-click selection
        this.elements.brainWrapper.addEventListener('mousedown', (e) => e.preventDefault());
        
        this.feedbackTimeout = null;
    }

    update(game) {
        this.updateResources(game);
        this.updateControls(game);
        this.updateNav(game);
        this.checkProgression(game);
    }

    revealBrain() {
        if (!this.elements.asciiArt.textContent) {
            this.elements.asciiArt.textContent = this.asciiBrain;
        }
    }

    checkProgression(game) {
        // Phase 1: Brain appears
        // Handled by intro or load, but safety check:
        if (game.resources.braindead > 0 && !this.elements.asciiArt.textContent) {
             this.revealBrain();
             this.log("A shape forms in the void.");
        }


        // Phase 2: Resources appear
        if (game.resources.braindead > 0) {
            this.elements.resourceStrip.style.display = 'flex';
        }

        // Phase 3: Nav appears
        if (game.resources.braindead >= 10) {
            this.elements.navStrip.style.display = 'flex';
        }
    }

    updateResources(game) {
        if (this.elements.resourceStrip.style.display === 'none') return;

        const res = game.resources;
        const caps = game.calculateCaps();
        let html = '';
        
        // Calculate rates
        const immunityMult = 100 / Math.max(1, res.immunity);
        const bdRate = game.production.braindead * game.productionMultipliers.braindead * immunityMult;
        let ideasRate = game.production.ideas * game.productionMultipliers.ideas;
        if (res.ideas > caps.ideas.soft) {
            ideasRate = ideasRate / Math.pow(game.scalingMulti, (res.ideas - caps.ideas.soft));
        }

        if (res.braindead > 0) {
            html += `<div class="res-item">Braindead: <span class="res-val">${Math.floor(res.braindead)}</span>`;
            if (res.braindead >= caps.braindead) {
                html += `<span class="res-capped">(MAX)</span>`;
            } else if (bdRate > 0) {
                html += `<span class="res-rate">(+${bdRate.toFixed(1)}/s)</span>`;
            }
            html += `</div>`;
        }
        
        if (res.ideas > 0) {
            html += `<div class="res-item">Ideas: <span class="res-val">${res.ideas.toFixed(1)}</span>`;
            if (res.ideas >= caps.ideas.hard) {
                html += `<span class="res-capped">(MAX)</span>`;
            } else if (ideasRate > 0) {
                html += `<span class="res-rate">(+${ideasRate.toFixed(1)}/s)</span>`;
            }
            html += `</div>`;
        }

        if (res.immunity < 100) html += `<div class="res-item">Immunity: <span class="res-val">${Math.floor(res.immunity)}</span></div>`;
        if (res.currency > 0) html += `<div class="res-item">Currency: <span class="res-val">${Math.floor(res.currency)}</span></div>`;

        if (this.lastResourceHTML !== html) {
            this.elements.resourceStrip.innerHTML = html;
            this.lastResourceHTML = html;
        }
    }

    hasNotifications(view, game) {
        if (view === 'upgrades') {
            return Object.values(game.upgrades).some(u => u.newlyUnlocked);
        }
        if (view === 'research') {
            return Object.values(game.research).some(r => r.newlyUnlocked);
        }
        if (view === 'vaccines') {
            return Object.values(game.vaccines).some(v => v.newlyUnlocked);
        }
        return false;
    }

    updateNav(game) {
        if (this.elements.navStrip.style.display === 'none') return;

        const views = ['main'];
        if (game.resources.braindead >= 10) views.push('upgrades');
        if (game.resources.ideas > 0) views.push('research');
        if (game.research.immunityResearch.purchased) {
            views.push('vaccines');
        }
        
        if (game.research.getAJob && game.research.getAJob.purchased) {
            views.push('jobs');
        } let html = '';
        views.forEach(view => {
            const active = this.currentView === view ? 'active' : '';
            let notify = '';

            // Check for notifications
            if (this.hasNotifications(view, game)) {
                notify = 'nav-notify';
            }

            html += `<a href="#" class="nav-link ${active} ${notify}" onclick="game.ui.switchView('${view}'); return false;">[ ${view.toUpperCase()} ]</a>`;
        });
        
        // Settings link always there if nav is visible
        const active = this.currentView === 'settings' ? 'active' : '';
        html += `<a href="#" class="nav-link ${active}" onclick="game.ui.switchView('settings'); return false;">[ SETTINGS ]</a>`;

        if (this.lastNavHTML !== html) {
            this.elements.navStrip.innerHTML = html;
            this.lastNavHTML = html;
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Clear notifications for this view
        if (view === 'upgrades') {
            Object.values(this.game.upgrades).forEach(u => u.newlyUnlocked = false);
        } else if (view === 'research') {
            Object.values(this.game.research).forEach(r => r.newlyUnlocked = false);
        } else if (view === 'vaccines') {
            Object.values(this.game.vaccines).forEach(v => v.newlyUnlocked = false);
        }
        
        this.update(this.game); // Immediate update
    }

    updateControls(game) {
        const container = this.elements.controlsArea;
        let html = '';

        if (this.currentView === 'main') {
            // Main view
        } else if (this.currentView === 'upgrades') {
            html = this.getUpgradesHTML(game);
        } else if (this.currentView === 'research') {
            html = this.getResearchHTML(game);
        } else if (this.currentView === 'vaccines') {
            html = this.getVaccinesHTML(game);
        } else if (this.currentView === 'jobs') {
            html = this.getJobsHTML(game);
        } else if (this.currentView === 'settings') {
            html = this.getSettingsHTML(game);
        }

        if (this.lastControlsHTML !== html) {
            container.innerHTML = html;
            this.lastControlsHTML = html;
        }
    }

    getUpgradesHTML(game) {
        let html = '';
        Object.values(game.upgrades).forEach(u => {
            if (!u.visible) return;

            const canAfford = game.resources[u.currency] >= u.cost;
            const disabled = canAfford ? '' : 'disabled';
            
            let text = `buy ${u.name.toLowerCase()} (${Math.floor(u.cost)} ${u.currency === 'braindead' ? 'bd' : 'id'})`;
            if (u.count > 0) text += ` [owned: ${u.count}]`;
            
            html += `<button class="cmd-btn" ${disabled} onclick="game.buyUpgrade('${u.id}')" title="${u.description}">${text}</button>`;
        });
        return html;
    }

    getResearchHTML(game) {
        let html = '';
        const availableResearch = Object.values(game.research).filter(r => {
            if (r.purchased) return false; // Hide purchased
            if (r.visible) return true;
            return false;
        });

        if (availableResearch.length === 0) {
            html += `<div style="color: var(--dim-text);">No research available.</div>`;
        } else {
            availableResearch.forEach(r => {
                const canAfford = game.resources[r.currency] >= r.cost;
                const prereqMet = !r.prereq || game.research[r.prereq].purchased;
                const disabled = (!canAfford || !prereqMet) ? 'disabled' : '';
                
                let text = `research ${r.name.toLowerCase()} (${r.cost} ${r.currency})`;
                
                html += `<button class="cmd-btn" ${disabled} onclick="game.buyResearch('${r.id}')" title="${r.description}">${text}</button>`;
            });
        }
        return html;
    }

    getVaccinesHTML(game) {
        let html = '';
        const availableVaccines = Object.values(game.vaccines).filter(v => {
            if (v.purchased) return false; // Hide purchased
            if (v.visible) return true;
            return false;
        });

        if (availableVaccines.length === 0) {
            html += `<div style="color: var(--dim-text);">No vaccines available.</div>`;
        } else {
            availableVaccines.forEach(v => {
                const canAfford = game.resources[v.currency] >= v.cost;
                const prereqMet = !v.prereq || game.vaccines[v.prereq].purchased;
                const disabled = (!canAfford || !prereqMet) ? 'disabled' : '';
                
                let text = `buy ${v.name.toLowerCase()} (${v.cost} ${v.currency})`;
                
                html += `<button class="cmd-btn" ${disabled} onclick="game.buyVaccine('${v.id}')" title="${v.description}">${text}</button>`;
            });
        }
        return html;
    }

    getJobsHTML(game) {
        let html = '';
        // Job Info
        const job = game.jobs[game.currentJob];
        html += `<div style="margin-bottom: 10px; color: #888;">Current Job: ${job.name} (Salary: ${job.salary})</div>`;

        // Actions
        const cooldown = game.jobCooldown > 0;
        const btnText = cooldown ? `resting... (${Math.ceil(game.jobCooldown)})` : `work shift`;
        const disabled = cooldown ? 'disabled' : '';
        
        html += `<button class="cmd-btn" ${disabled} onclick="game.work()">${btnText}</button>`;
        
        return html;
    }

    getSettingsHTML(game) {
        let html = '';
        
        // Save Management
        html += `<div style="margin-bottom: 5px; color: #fff;">-- SYSTEM --</div>`;
        html += `<button class="cmd-btn" onclick="game.save(); game.ui.log('Game saved.', 'system')">force save</button>`;
        html += `<button class="cmd-btn" onclick="game.ui.exportSave()">export save</button>`;
        html += `<button class="cmd-btn" onclick="game.ui.importSave()">import save</button>`;
        html += `<button class="cmd-btn" style="color: #ff6666;" onclick="if(confirm('HARD RESET?')) game.reset()">hard reset</button>`;
        
        // Options
        html += `<div style="margin-top: 15px; margin-bottom: 5px; color: #fff;">-- CONFIG --</div>`;
        const offlineState = game.options.offlineProgress ? 'ON' : 'OFF';
        html += `<button class="cmd-btn" onclick="game.options.offlineProgress = !game.options.offlineProgress; game.save();">offline progress: ${offlineState}</button>`;
        
        html += `<div style="margin-top: 10px; color: var(--dim-text);">Screen Brightness: <span id="brightness-val">${game.options.brightness}%</span></div>`;
        html += `<div style="display: flex; gap: 10px; margin-bottom: 10px;">`;
        html += `<button class="cmd-btn" onclick="game.options.brightness = Math.max(50, game.options.brightness - 10); document.getElementById('brightness-val').textContent = game.options.brightness + '%'; game.ui.applyBrightness(game.options.brightness); game.save();">[ - ]</button>`;
        html += `<button class="cmd-btn" onclick="game.options.brightness = Math.min(150, game.options.brightness + 10); document.getElementById('brightness-val').textContent = game.options.brightness + '%'; game.ui.applyBrightness(game.options.brightness); game.save();">[ + ]</button>`;
        html += `</div>`;
        
        return html;
    }

    applyBrightness(value) {
        document.body.style.filter = `brightness(${value}%)`;
    }

    exportSave() {
        const saveString = this.game.save();
        navigator.clipboard.writeText(saveString).then(() => {
            this.log("Save copied to clipboard.", "system");
        }).catch(err => {
            this.log("Failed to copy save.", "system");
            console.error(err);
        });
    }

    importSave() {
        const saveString = prompt("Paste save string:");
        if (saveString) {
            this.game.importSave(saveString);
        }
    }

    log(message, type = 'general') {
        const entry = document.createElement('div');
        entry.className = 'log-line new';
        entry.textContent = `> ${message}`;
        this.elements.logDisplay.appendChild(entry);
        this.elements.logDisplay.scrollTop = this.elements.logDisplay.scrollHeight;
        
        // Remove 'new' class after animation
        setTimeout(() => entry.classList.remove('new'), 500);
    }

    // Helper for game.js to call
    addLog(entry) {
        this.log(entry.message, entry.type);
    }
    
    hideAll() {
        // Reset to initial state
        this.elements.resourceStrip.style.display = 'none';
        this.elements.navStrip.style.display = 'none';
        this.elements.asciiArt.textContent = "";
    }
    
    playIntroSequence(onComplete) {
        this.log("Initializing...");
        setTimeout(() => {
            this.log("Subject: Kyle.");
            setTimeout(() => {
                this.log("Status: Dormant.");
                setTimeout(() => {
                    this.log("Wake up.");
                    // Reveal the brain
                    this.revealBrain();
                    if (onComplete) onComplete();
                }, 1500);
            }, 1500);
        }, 1500);
    }
}
