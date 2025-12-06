class SettingsManager {
    constructor(game) {
        this.game = game;
        this.saveVersion = 2; // Moved from Game
    }

    getHTML() {
        let html = '';
        
        // Save Management
        html += `<div style="margin-bottom: 5px; color: #fff;">-- SYSTEM --</div>`;
        html += `<button class="cmd-btn" onclick="game.settings.save(); game.ui.log('Game saved.', 'system')">force save</button>`;
        html += `<button class="cmd-btn" onclick="game.settings.exportSave()">export save</button>`;
        html += `<button class="cmd-btn" onclick="game.settings.importSave()">import save</button>`;
        html += `<button class="cmd-btn" style="color: #ff6666;" onclick="if(confirm('HARD RESET?')) game.settings.reset()">hard reset</button>`;
        
        // Options
        html += `<div style="margin-top: 15px; margin-bottom: 5px; color: #fff;">-- CONFIG --</div>`;
        
        html += `<div style="margin-top: 10px; color: var(--dim-text);">Screen Brightness: <span id="brightness-val">${this.game.options.brightness}%</span></div>`;
        html += `<div style="display: flex; gap: 10px; margin-bottom: 10px;">`;
        html += `<button class="cmd-btn" onclick="game.options.brightness = Math.max(50, game.options.brightness - 10); document.getElementById('brightness-val').textContent = game.options.brightness + '%'; game.settings.applyBrightness(game.options.brightness); game.settings.save();">[ - ]</button>`;
        html += `<button class="cmd-btn" onclick="game.options.brightness = Math.min(150, game.options.brightness + 10); document.getElementById('brightness-val').textContent = game.options.brightness + '%'; game.settings.applyBrightness(game.options.brightness); game.settings.save();">[ + ]</button>`;
        html += `</div>`;
        
        return html;
    }

    applyBrightness(value) {
        document.body.style.filter = `brightness(${value}%)`;
    }

    setupAutosave() {
        // Autosave every 30 seconds
        setInterval(() => this.save(), 30000);
        
        // Save on close/refresh
        window.addEventListener('beforeunload', () => this.save());
    }

    save() {
        if (!this.game.isReady || this.game.isResetting) return; // Don't save if not ready or resetting
        
        const saveData = {
            version: this.saveVersion,
            resources: this.game.resources,
            tabUnlocks: this.game.tabUnlocks,
            caps: this.game.caps,
            brainSize: this.game.brainSize,
            scalingMulti: this.game.scalingMulti,
            production: this.game.production,
            productionMultipliers: this.game.productionMultipliers,
            clickValue: this.game.clickValue,
            currentJob: this.game.currentJob,
            upgrades: Object.values(this.game.upgrades).map(u => ({
                id: u.id,
                count: u.count,
                cost: u.cost,
                visible: u.visible
            })),
            research: Object.values(this.game.research).map(r => ({
                id: r.id,
                purchased: r.purchased,
                visible: r.visible
            })),
            vaccines: Object.values(this.game.vaccines).map(v => ({
                id: v.id,
                purchased: v.purchased,
                visible: v.visible
            })),
            options: this.game.options,
            lastTick: Date.now(),
            logHistory: this.game.logs.slice(-50) // Save last 50 logs
        };
        
        const saveString = JSON.stringify(saveData);
        localStorage.setItem('kylesBrainquestSave', btoa(saveString));
        return btoa(saveString);
    }

    load() {
        const saveExists = localStorage.getItem('kylesBrainquestSave');
        
        if (saveExists) {
            this.game.ui.hideAll(); // Ensure hidden first
            this.importSave(saveExists, true);
            this.game.isReady = true;
            this.game.tick();
        } else {
            // New Game: Hide UI and play intro
            this.game.ui.hideAll();
            this.game.ui.playIntroSequence(() => {
                this.game.isReady = true;
                this.game.tick();
                this.game.log("System online.", "lore");
            });
        }
    }

    importSave(saveString, isInitialLoad = false) {
        try {
            let jsonString = saveString.trim();
            try {
                const decoded = atob(saveString);
                // Simple check to see if it looks like JSON
                if (decoded.trim().startsWith('{') || decoded.trim().startsWith('[')) {
                    jsonString = decoded;
                }
            } catch (e) {
                // Not base64 or decode failed, assume plain JSON
            }

            let saveData = JSON.parse(jsonString);
            
            // Migrate save data if needed
            saveData = this.migrateSave(saveData);
            
            if (saveData.resources) this.game.resources = { ...this.game.resources, ...saveData.resources };
            if (saveData.caps) this.game.caps = { ...this.game.caps, ...saveData.caps };
            if (saveData.brainSize) this.game.brainSize = saveData.brainSize;
            if (saveData.scalingMulti) this.game.scalingMulti = saveData.scalingMulti;
            if (saveData.production) this.game.production = { ...this.game.production, ...saveData.production };
            if (saveData.productionMultipliers) this.game.productionMultipliers = { ...this.game.productionMultipliers, ...saveData.productionMultipliers };
            if (saveData.clickValue) this.game.clickValue = { ...this.game.clickValue, ...saveData.clickValue };
            if (saveData.currentJob) this.game.currentJob = saveData.currentJob;
            if (saveData.options) this.game.options = { ...this.game.options, ...saveData.options };
            if (saveData.tabUnlocks) this.game.tabUnlocks = { ...this.game.tabUnlocks, ...saveData.tabUnlocks };
            
            // Validate critical values
            if (isNaN(this.game.resources.braindead)) this.game.resources.braindead = 0;
            if (isNaN(this.game.resources.ideas)) this.game.resources.ideas = 0;
            if (isNaN(this.game.resources.immunity) || this.game.resources.immunity <= 0) this.game.resources.immunity = 100;
            if (isNaN(this.game.resources.currency)) this.game.resources.currency = 0;
            if (isNaN(this.game.resources.suspicion)) this.game.resources.suspicion = 0;
            
            if (isNaN(this.game.clickValue.braindead)) this.game.clickValue.braindead = 1;

            if (saveData.upgrades) {
                saveData.upgrades.forEach(savedUpgrade => {
                    const upgrade = this.game.upgrades[savedUpgrade.id];
                    if (upgrade) {
                        upgrade.count = savedUpgrade.count;
                        // Not sure if this is correct but ok
                        upgrade.cost = savedUpgrade.cost;
                        if (savedUpgrade.visible !== undefined) upgrade.visible = savedUpgrade.visible;
                    }
                });
            }

            if (saveData.research) {
                saveData.research.forEach(savedResearch => {
                    const research = this.game.research[savedResearch.id];
                    if (research) {
                        research.purchased = savedResearch.purchased;
                        if (savedResearch.visible !== undefined) research.visible = savedResearch.visible;
                    }
                });
            }

            if (saveData.vaccines) {
                saveData.vaccines.forEach(savedVaccine => {
                    const vaccine = this.game.vaccines[savedVaccine.id];
                    if (vaccine) {
                        vaccine.purchased = savedVaccine.purchased;
                        if (savedVaccine.visible !== undefined) vaccine.visible = savedVaccine.visible;
                    }
                });
            }

            if (saveData.logHistory) {
                const introMessages = ["Initializing...", "Subject: Kyle.", "Status: Dormant.", "Wake up."];
                this.game.logs = saveData.logHistory.filter(entry => !introMessages.includes(entry.message));
                // Restore logs to UI without animation/sound if possible, or just add them
                this.game.logs.forEach(entry => {
                    this.game.ui.addLog(entry);
                });
            }

            if (isInitialLoad) {
                // Check if we should reveal everything based on progress
                if (this.game.resources.braindead > 0 || this.game.tabUnlocks.upgrades) {
                    this.game.ui.checkProgression(this.game);
                } else {
                     // If 0 braindead (new save?), just show brain
                     this.game.ui.revealBrain();
                }
            } else {
                this.game.log("Save imported successfully!", "general");
                this.save();
                location.reload(); // Reload to ensure clean state
            }

            // Recalculate rates based on loaded upgrades/research
            this.game.resourceManager.recalculateRates(this.game);

            this.game.updateUI();
            
            if (this.game.research.thinkMore.purchased) {
                document.getElementById('immunity-display').style.display = 'flex';
            }
            
            // Apply visual settings
            if (this.game.options.brightness) {
                this.applyBrightness(this.game.options.brightness);
            }

        } catch (e) {
            console.error("Failed to load save:", e);
            if (!isInitialLoad) alert("Invalid save data!");
        }
    }

    migrateSave(saveData) {
        // If version is missing, it's version 0 (pre-migration system)
        const version = saveData.version || 0;
        
        if (version < this.saveVersion) {
            console.log(`Migrating save from v${version} to v${this.saveVersion}...`);
            
            // Migration: v0 -> v1
            if (version < 1) {
                // Ensure all resource keys exist
                if (!saveData.resources) saveData.resources = {};
                if (saveData.resources.braindead === undefined) saveData.resources.braindead = 0;
                if (saveData.resources.ideas === undefined) saveData.resources.ideas = 0;
                if (saveData.resources.immunity === undefined) saveData.resources.immunity = 100;
                if (saveData.resources.currency === undefined) saveData.resources.currency = 0;
                if (saveData.resources.suspicion === undefined) saveData.resources.suspicion = 0;
                
                // Ensure other critical objects exist
                if (!saveData.caps) saveData.caps = { braindead: 500, ideas: 5 };
                if (!saveData.production) saveData.production = { braindead: 0, ideas: 0 };
                if (!saveData.productionMultipliers) saveData.productionMultipliers = { braindead: 1, ideas: 1 };
                
                // v1 adds versioning, so we just return the sanitized object
                saveData.version = 1;
            }

            // Migration: v1 -> v2
            if (version < 2) {
                if (!saveData.tabUnlocks) {
                    saveData.tabUnlocks = {
                        upgrades: (saveData.resources && saveData.resources.braindead >= 10),
                        research: (saveData.resources && saveData.resources.ideas > 0)
                    };
                }
                saveData.version = 2;
            }
            
            // Future migrations can go here (e.g., if (version < 3) { ... })
        }
        
        return saveData;
    }

    exportSave() {
        const saveString = this.save();
        navigator.clipboard.writeText(saveString).then(() => {
            this.game.ui.log("Save copied to clipboard.", "system");
        }).catch(err => {
            this.game.ui.log("Failed to copy save.", "system");
            console.error(err);
        });
    }

    reset() {
        this.game.isResetting = true;
        localStorage.removeItem('kylesBrainquestSave');
        location.reload();
    }
}
