// game.js - Main Game Logic

class Game {
    constructor() {
        this.resources = {
            braindead: 0,
            ideas: 0,
            immunity: 100,
            currency: 0,
            suspicion: 0
        };

        this.caps = {
            braindead: 100, // Base cap
            ideas: 5 // Base cap
        };

        this.brainSize = 1; // Multiplier for caps

        this.production = {
            braindead: 0,
            ideas: 0
        };

        this.productionMultipliers = {
            braindead: 1,
            ideas: 1
        };

        this.clickValue = {
            braindead: 1
        };

        // Initialize from data.js
        this.upgrades = getInitialUpgrades();
        this.research = getInitialResearch();
        this.jobs = getInitialJobs();
        this.currentJob = 'intern';
        this.jobCooldown = 0;

        // CPS Limiter
        this.clickCount = 0;
        this.lastClickReset = Date.now();
        this.maxCps = 10;

        this.lastTick = Date.now();
        this.tickRate = 100;

        this.logs = [];
        this.currentLogFilter = 'all';
        this.options = {
            offlineProgress: true
        };

        // Initialize UI Manager
        this.ui = new UIManager(this);

        this.init();
    }

    init() {
        this.setupEventListeners();
        
        const saveExists = localStorage.getItem('kylesBrainquestSave');
        
        if (saveExists) {
            this.ui.hideAll(); // Ensure hidden first
            this.ui.playMaterializeSequence(() => {
                this.load();
                this.gameLoop();
            });
        } else {
            // New Game: Hide UI and play intro
            this.ui.hideAll();
            this.ui.playIntroSequence(() => {
                this.gameLoop();
                this.log("Welcome to Kyle's Brainquest.", "lore");
            });
        }
        
        // Autosave every 30 seconds
        setInterval(() => this.save(), 30000);
        
        // Save on close/refresh
        window.addEventListener('beforeunload', () => this.save());
    }

    save() {
        const saveData = {
            resources: this.resources,
            caps: this.caps,
            brainSize: this.brainSize,
            production: this.production,
            productionMultipliers: this.productionMultipliers,
            clickValue: this.clickValue,
            currentJob: this.currentJob,
            upgrades: Object.values(this.upgrades).map(u => ({
                id: u.id,
                count: u.count,
                cost: u.cost,
                visible: u.visible
            })),
            research: Object.values(this.research).map(r => ({
                id: r.id,
                purchased: r.purchased,
                visible: r.visible
            })),
            options: this.options,
            lastTick: Date.now(),
            logHistory: this.logs.slice(-50) // Save last 50 logs
        };
        
        const saveString = JSON.stringify(saveData);
        localStorage.setItem('kylesBrainquestSave', btoa(saveString));
        return btoa(saveString);
    }

    load() {
        const saveString = localStorage.getItem('kylesBrainquestSave');
        if (saveString) {
            this.importSave(saveString, true);
        }
    }

    importSave(saveString, isInitialLoad = false) {
        try {
            let jsonString = saveString;
            try {
                const decoded = atob(saveString);
                // Simple check to see if it looks like JSON
                if (decoded.trim().startsWith('{') || decoded.trim().startsWith('[')) {
                    jsonString = decoded;
                }
            } catch (e) {
                // Not base64 or decode failed, assume plain JSON
            }

            const saveData = JSON.parse(jsonString);
            
            if (saveData.resources) this.resources = { ...this.resources, ...saveData.resources };
            if (saveData.caps) this.caps = { ...this.caps, ...saveData.caps };
            if (saveData.brainSize) this.brainSize = saveData.brainSize;
            if (saveData.production) this.production = { ...this.production, ...saveData.production };
            if (saveData.productionMultipliers) this.productionMultipliers = { ...this.productionMultipliers, ...saveData.productionMultipliers };
            if (saveData.clickValue) this.clickValue = { ...this.clickValue, ...saveData.clickValue };
            if (saveData.currentJob) this.currentJob = saveData.currentJob;
            if (saveData.options) this.options = { ...this.options, ...saveData.options };
            
            // Validate critical values
            if (isNaN(this.resources.braindead)) this.resources.braindead = 0;
            if (isNaN(this.resources.ideas)) this.resources.ideas = 0;
            if (isNaN(this.resources.immunity)) this.resources.immunity = 100;
            if (isNaN(this.resources.currency)) this.resources.currency = 0;
            if (isNaN(this.resources.suspicion)) this.resources.suspicion = 0;

            if (saveData.upgrades) {
                saveData.upgrades.forEach(savedUpgrade => {
                    const upgrade = this.upgrades[savedUpgrade.id];
                    if (upgrade) {
                        upgrade.count = savedUpgrade.count;
                        upgrade.cost = savedUpgrade.cost;
                        if (savedUpgrade.visible !== undefined) upgrade.visible = savedUpgrade.visible;
                    }
                });
            }

            if (saveData.research) {
                saveData.research.forEach(savedResearch => {
                    const research = this.research[savedResearch.id];
                    if (research) {
                        research.purchased = savedResearch.purchased;
                        if (savedResearch.visible !== undefined) research.visible = savedResearch.visible;
                    }
                });
            }

            if (saveData.logHistory) {
                this.logs = saveData.logHistory;
                // Restore logs to UI without animation/sound if possible, or just add them
                this.logs.forEach(entry => {
                    this.ui.addLog(entry);
                });
            }
            
            if (isInitialLoad && saveData.lastTick && this.options.offlineProgress) {
                const now = Date.now();
                const secondsOffline = (now - saveData.lastTick) / 1000;
                
                if (secondsOffline > 60) {
                    const maxOfflineSeconds = 7200;
                    const effectiveSeconds = Math.min(secondsOffline, maxOfflineSeconds);
                    
                    const immunityMult = 100 / this.resources.immunity;
                    const bdGained = (this.production.braindead * immunityMult) * effectiveSeconds;
                    const ideasGained = this.production.ideas * effectiveSeconds;
                    
                    if (bdGained > 0 || ideasGained > 0) {
                        this.resources.braindead += bdGained;
                        this.resources.ideas += ideasGained;
                        
                        let msg = `You were gone for ${Math.floor(secondsOffline)}s.`;
                        if (secondsOffline > maxOfflineSeconds) msg += ` (Capped at 2h)`;
                        msg += ` Gained ${Math.floor(bdGained)} Bd and ${ideasGained.toFixed(1)} Ideas.`;
                        
                        this.log(msg, "general");
                    }
                }
            }

            if (isInitialLoad) {
                // No log on initial load
            } else {
                this.log("Save imported successfully!", "general");
                this.save();
            }

            this.updateUI();
            
            if (this.research.thinkMore.purchased) {
                document.getElementById('immunity-display').style.display = 'flex';
            }
            
            const offlineToggle = document.getElementById('offline-toggle');
            if (offlineToggle) offlineToggle.checked = this.options.offlineProgress;

        } catch (e) {
            console.error("Failed to load save:", e);
            if (!isInitialLoad) alert("Invalid save data!");
            this.log("Error loading save data.", "general");
        }
    }

    setupEventListeners() {
        document.getElementById('brain-button').addEventListener('click', (e) => {
            this.clickBrain(e);
        });

        const tabs = document.querySelectorAll('.log-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentLogFilter = tab.textContent.toLowerCase();
                this.ui.renderLogs(this.logs, this.currentLogFilter);
            });
        });

        // Settings Modal
        const modal = document.getElementById('settings-modal');
        const settingsBtn = document.getElementById('settings-button');
        const closeBtn = document.getElementById('close-settings');
        const exportBtn = document.getElementById('export-save-btn');
        const importBtn = document.getElementById('import-save-btn');
        const hardResetBtn = document.getElementById('hard-reset-btn');
        const offlineToggle = document.getElementById('offline-toggle');
        const saveArea = document.getElementById('save-data-area');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                modal.style.display = 'flex';
                saveArea.value = '';
            });
        }

        if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const saveString = this.save();
                saveArea.value = saveString;
                saveArea.select();
                document.execCommand('copy');
                this.log("Save copied to clipboard!", "general");
                exportBtn.textContent = "Copied!";
                setTimeout(() => exportBtn.textContent = "Export Save", 2000);
            });
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => {
                const saveString = prompt("Paste your save string here:");
                if (saveString) {
                    this.importSave(saveString);
                    modal.style.display = 'none';
                }
            });
        }

        if (hardResetBtn) {
            hardResetBtn.addEventListener('click', () => {
                if (confirm("Are you sure you want to HARD RESET? This will wipe all progress.")) {
                    this.reset();
                }
            });
        }

        if (offlineToggle) {
            offlineToggle.addEventListener('change', (e) => {
                this.options.offlineProgress = e.target.checked;
                this.save();
                this.log(`Offline progress ${this.options.offlineProgress ? 'enabled' : 'disabled'}.`, "general");
            });
        }

        const workBtn = document.getElementById('btn-work');
        const stealBtn = document.getElementById('btn-steal');
        
        if (workBtn) workBtn.addEventListener('click', () => this.work());
        if (stealBtn) stealBtn.addEventListener('click', () => this.steal());
    }
    reset() {
        localStorage.removeItem('kylesBrainquestSave');
        location.reload();
    }

    clickBrain(e) {
        const now = Date.now();
        if (now - this.lastClickReset >= 1000) {
            this.clickCount = 0;
            this.lastClickReset = now;
        }

        if (this.clickCount >= this.maxCps) {
            return; // Rate limited
        }
        this.clickCount++;

        const immunityMult = 100 / this.resources.immunity;
        const gain = this.clickValue.braindead * immunityMult;
        this.addResource('braindead', gain);
        this.ui.createFloatingText(e.clientX, e.clientY, `+${gain.toFixed(1)} Bd`);
    }

    addResource(type, amount) {
        this.resources[type] += amount;
        this.ui.updateResource(type, this.resources[type]);
    }

    buyUpgrade(key) {
        const upgrade = this.upgrades[key];
        if (this.resources[upgrade.currency] >= upgrade.cost) {
            this.resources[upgrade.currency] -= upgrade.cost;
            upgrade.count++;
            upgrade.cost = Math.floor(upgrade.cost * upgrade.costScale);
            upgrade.effect(this); // Pass game instance
            this.log(`Purchased ${upgrade.name}`, "upgrade");
            this.updateUI();
        }
    }

    buyResearch(key) {
        const item = this.research[key];
        if (!item.purchased && this.resources[item.currency] >= item.cost) {
            // Check prereqs
            if (item.prereq && !this.research[item.prereq].purchased) return;

            this.resources[item.currency] -= item.cost;
            item.purchased = true;
            item.effect(this); // Pass game instance
            this.log(`Researched ${item.name}`, "unlock");
            this.updateUI();
        }
    }

    checkCaps() {
        // Soft/Hard caps logic
        // Softcap begins at 500 * Brain Size / Immunity
        // Hardcap at 1000 * Brain Size / Immunity
        
        const immunityFactor = Math.max(1, this.resources.immunity);
        const softCap = (50000 * this.brainSize) / immunityFactor;
        const hardCap = (100000 * this.brainSize) / immunityFactor;
        
        // Apply caps to Ideas? The planning doc says "IDEAS ARE HARDCAPPED AND SOFTCAPPED BASED ON IMMUNITY"
        // But also "THERE IS A MAX BRAINDEAD/CAP(necrotic shell increases it)"
        
        // Let's apply immunity-based caps to Ideas
        if (this.resources.ideas > hardCap) {
            this.resources.ideas = hardCap;
        } else if (this.resources.ideas > softCap) {
            // Softcap: drastically reduced production? 
            // For now, just hard cap at hardCap. 
            // Maybe reduce production in gameLoop if > softCap?
            // Implementing simple hard cap for now based on text.
        }

        // Braindead Cap
        // Calculate dynamic cap based on base cap (100), brain size, and immunity
        // Multiplier 1000 ensures starting cap is 1000 (at 100 immunity) to allow early upgrades
        const braindeadCap = (this.caps.braindead * this.brainSize * 1000) / immunityFactor;
        
        if (this.resources.braindead > braindeadCap) {
            this.resources.braindead = braindeadCap;
        }
        
        // Currency Cap
        const job = this.jobs[this.currentJob];
        if (this.resources.currency > job.maxCurrency) {
            this.resources.currency = job.maxCurrency;
        }
    }

    work() {
        if (this.jobCooldown > 0) return;
        
        const job = this.jobs[this.currentJob];
        this.resources.currency += job.salary;
        this.jobCooldown = 5; // 5 seconds cooldown
        
        // Suspicion check
        if (Math.random() * 100 < job.suspicionRate) {
            this.log("You were fired for suspicious behavior!", "warning");
            this.currentJob = 'intern'; // Demotion
            this.resources.suspicion = 0;
        }
        
        this.updateUI();
    }

    steal() {
        if (this.jobCooldown > 0) return;
        
        const job = this.jobs[this.currentJob];
        this.resources.suspicion += 1;
        this.resources.currency += job.maxCurrency * 0.05;
        this.jobCooldown = 5;
        
        this.updateUI();
    }

    promote(jobId) {
        // Logic to switch jobs if requirements met
        // For now, just switch if unlocked
        if (this.jobs[jobId]) {
            this.currentJob = jobId;
            this.updateUI();
        }
    }

    triggerVaccine(tier) {
        if (tier === 1) {
            // Reset resources
            this.resources.braindead = 0;
            this.resources.ideas = 0;
            this.resources.immunity = 80; // Reduced immunity
            this.resources.currency = 0;
            this.resources.suspicion = 0;
            
            // Reset Upgrades
            Object.values(this.upgrades).forEach(u => {
                u.count = 0;
                u.cost = u.cost / Math.pow(u.costScale, u.count); // Reset cost roughly (or just reload initial)
                // Better: re-initialize upgrades but keep some persistent flags if any
                // For V1, full reset of upgrades
                u.count = 0;
                // Re-fetch initial cost from data would be best, but we modified the object.
                // Let's just manually reset costs for now or reload page logic?
                // Reloading page logic is safer for full reset.
            });
            
            // Reset Research
            Object.values(this.research).forEach(r => {
                r.purchased = false;
                r.visible = false;
            });

            // Apply global multiplier
            this.productionMultipliers.braindead *= 1.5;
            this.productionMultipliers.ideas *= 1.5;
            
            this.log("Vaccine V1 Administered. Immunity reduced.", "lore");
            this.save();
            location.reload(); // Simple way to ensure clean state with new saved values (except we need to save the multiplier!)
            
        } else if (tier === 2) {
             // Reset resources
            this.resources.braindead = 0;
            this.resources.ideas = 0;
            this.resources.immunity = 60; // Reduced further?
            this.resources.currency = 0;
            this.resources.suspicion = 0;
            
            // Reset Upgrades & Research
             Object.values(this.upgrades).forEach(u => { u.count = 0; });
             Object.values(this.research).forEach(r => { r.purchased = false; r.visible = false; });

            // Apply global multiplier
            this.productionMultipliers.braindead *= 2.5; // Total 2.5x? Or additional? Text says "2.5x multiplier(total)"
            this.productionMultipliers.ideas *= 2.5;
            
            this.log("Vaccine V2 Administered. I feel... different.", "lore");
            this.save();
            location.reload();
        }
    }

    gameLoop() {
        const now = Date.now();
        const dt = (now - this.lastTick) / 1000;
        
        if (dt >= 0.1) {
            const immunityMult = 100 / this.resources.immunity;
            this.resources.braindead += (this.production.braindead * this.productionMultipliers.braindead * immunityMult) * dt;
            this.resources.ideas += this.production.ideas * this.productionMultipliers.ideas * dt;
            
            this.checkCaps();
            
            if (this.jobCooldown > 0) {
                this.jobCooldown -= dt;
            }

            this.lastTick = now;
            this.updateUI();
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    updateUI() {
        try {
            this.ui.update(this);
        } catch (e) {
            console.error("UI Update failed:", e);
        }
    }

    log(message, type = 'general') {
        const entry = { message, type, timestamp: Date.now() };
        this.logs.push(entry);
        if (this.logs.length > 50) this.logs.shift(); // Keep last 50
        
        this.ui.addLog(entry);

        if (type === 'lore') {
            this.ui.showLorePopup(message);
        }
    }
}

window.onload = () => {
    window.game = new Game();
};
