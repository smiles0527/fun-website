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
            braindead: 500, // Base cap
            ideas: 5 // Base cap
        };

        this.brainSize = 1; // Multiplier for caps
        this.scalingMulti = 1.7; // Multiplier for idea gain past softcap

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
        this.vaccines = getInitialVaccines();
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
            offlineProgress: true,
            brightness: 100
        };

        // Initialize UI Manager
        this.ui = new TerminalUI(this);

        this.isReady = false;
        this.isResetting = false;
        this.init();
    }

    init() {
        this.ui.init(); // Initialize Terminal UI listeners
        this.setupEventListeners();
        
        const saveExists = localStorage.getItem('kylesBrainquestSave');
        
        if (saveExists) {
            this.ui.hideAll(); // Ensure hidden first
            this.load();
            this.isReady = true;
            this.tick();
        } else {
            // New Game: Hide UI and play intro
            this.ui.hideAll();
            this.ui.playIntroSequence(() => {
                this.isReady = true;
                this.tick();
                this.log("System online.", "lore");
            });
        }
        
        // Autosave every 30 seconds
        setInterval(() => this.save(), 30000);
        
        // Save on close/refresh
        window.addEventListener('beforeunload', () => this.save());
    }

    save() {
        if (!this.isReady || this.isResetting) return; // Don't save if not ready or resetting
        
        const saveData = {
            resources: this.resources,
            caps: this.caps,
            brainSize: this.brainSize,
            scalingMulti: this.scalingMulti,
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
            vaccines: Object.values(this.vaccines).map(v => ({
                id: v.id,
                purchased: v.purchased,
                visible: v.visible
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

            const saveData = JSON.parse(jsonString);
            
            if (saveData.resources) this.resources = { ...this.resources, ...saveData.resources };
            if (saveData.caps) this.caps = { ...this.caps, ...saveData.caps };
            if (saveData.brainSize) this.brainSize = saveData.brainSize;
            if (saveData.scalingMulti) this.scalingMulti = saveData.scalingMulti;
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

            if (saveData.vaccines) {
                saveData.vaccines.forEach(savedVaccine => {
                    const vaccine = this.vaccines[savedVaccine.id];
                    if (vaccine) {
                        vaccine.purchased = savedVaccine.purchased;
                        if (savedVaccine.visible !== undefined) vaccine.visible = savedVaccine.visible;
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
                    
                    const immunityMult = 100 / Math.max(1, this.resources.immunity);
                    const caps = this.calculateCaps();

                    // Calculate potential gains
                    const potentialBd = (this.production.braindead * immunityMult) * effectiveSeconds;
                    const potentialIdeas = this.production.ideas * effectiveSeconds;
                    
                    // Calculate actual gains by clamping to caps
                    const currentBd = this.resources.braindead;
                    const currentIdeas = this.resources.ideas;
                    
                    const newBd = Math.min(currentBd + potentialBd, caps.braindead);
                    // For ideas, we only care about hard cap for offline? Or soft cap penalty?
                    // Let's just respect hard cap for now to be safe and simple.
                    // If we want to be perfect we'd integrate the soft cap penalty but that's complex math for offline.
                    // Let's just cap at hard cap.
                    const newIdeas = Math.min(currentIdeas + potentialIdeas, caps.ideas.hard);
                    
                    const actualBdGained = newBd - currentBd;
                    const actualIdeasGained = newIdeas - currentIdeas;
                    
                    if (actualBdGained > 0 || actualIdeasGained > 0) {
                        this.resources.braindead = newBd;
                        this.resources.ideas = newIdeas;
                        
                        let msg = `You were gone for ${Math.floor(secondsOffline)}s.`;
                        if (secondsOffline > maxOfflineSeconds) msg += ` (Capped at 2h)`;
                        msg += ` Gained ${Math.floor(actualBdGained)} Bd and ${actualIdeasGained.toFixed(1)} Ideas.`;
                        
                        this.log(msg, "general");
                    }
                }
            }

            if (isInitialLoad) {
                // Check if we should reveal everything based on progress
                if (this.resources.braindead > 0) {
                    this.ui.checkProgression(this);
                } else {
                     // If 0 braindead (new save?), just show brain
                     this.ui.revealBrain();
                }
            } else {
                this.log("Save imported successfully!", "general");
                this.save();
                location.reload(); // Reload to ensure clean state
            }

            this.updateUI();
            
            if (this.research.thinkMore.purchased) {
                document.getElementById('immunity-display').style.display = 'flex';
            }
            
            const offlineToggle = document.getElementById('offline-toggle');
            if (offlineToggle) offlineToggle.checked = this.options.offlineProgress;

            // Apply visual settings
            if (this.options.brightness) {
                this.ui.applyBrightness(this.options.brightness);
            }

        } catch (e) {
            console.error("Failed to load save:", e);
            if (!isInitialLoad) alert("Invalid save data!");
        }
    }

    setupEventListeners() {
        // Most listeners are handled by TerminalUI or dynamic button creation
        
        // Autosave on unload is handled in init
    }
    reset() {
        this.isResetting = true;
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
        
        // Optional: Add log for click? Might spam.
        // this.log(`+${gain.toFixed(1)} Bd`);
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

    buyVaccine(key) {
        const item = this.vaccines[key];
        if (!item.purchased && this.resources[item.currency] >= item.cost) {
            // Check prereqs
            if (item.prereq && !this.vaccines[item.prereq].purchased) return;

            this.resources[item.currency] -= item.cost;
            item.purchased = true;
            item.effect(this); // Pass game instance
            this.log(`Administered ${item.name}`, "unlock");
            this.updateUI();
        }
    }

    calculateCaps() {
        const immunityFactor = Math.max(1, this.resources.immunity);
        
        // Ideas Caps
        const ideasSoftCap = (500 * this.brainSize) / immunityFactor;
        const ideasHardCap = (1000 * this.brainSize) / immunityFactor;

        // Braindead Cap
        const braindeadCap = (this.caps.braindead);

        return {
            ideas: {
                soft: ideasSoftCap,
                hard: ideasHardCap
            },
            braindead: braindeadCap
        };
    }

    checkCaps() {
        const caps = this.calculateCaps();

        // Enforce Hard Caps
        if (this.resources.ideas > caps.ideas.hard) {
            this.resources.ideas = caps.ideas.hard;
        }

        if (this.resources.braindead > caps.braindead) {
            this.resources.braindead = caps.braindead;
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
            
            // Reset Upgrades & Research & Vaccines
             Object.values(this.upgrades).forEach(u => { u.count = 0; });
             Object.values(this.research).forEach(r => { r.purchased = false; r.visible = false; });
             Object.values(this.vaccines).forEach(v => { v.purchased = false; v.visible = false; });

            // Apply global multiplier
            this.productionMultipliers.braindead *= 2.5; // Total 2.5x? Or additional? Text says "2.5x multiplier(total)"
            this.productionMultipliers.ideas *= 2.5;
            
            this.log("Vaccine V2 Administered. I feel... different.", "lore");
            this.save();
            location.reload();
        }
    }

    checkUnlocks() {
        // Helper to check a collection
        const check = (collection) => {
            Object.values(collection).forEach(item => {
                if (!item.visible && item.unlockCondition && item.unlockCondition(this)) {
                    item.visible = true;
                    item.newlyUnlocked = true;
                    this.log(`${item.name} unlocked!`, "unlock");
                }
            });
        };

        check(this.upgrades);
        check(this.research);
        check(this.vaccines);
    }

    tick() {
        const now = Date.now();
        const dt = (now - this.lastTick) / 1000;
        this.lastTick = now;

        const immunityMult = 100 / Math.max(1, this.resources.immunity);
        const caps = this.calculateCaps();
        
        // Braindead Production
        this.resources.braindead += (this.production.braindead * this.productionMultipliers.braindead * immunityMult) * dt;
        
        // Ideas Production with Soft Cap Logic
        let ideasProduction = this.production.ideas * this.productionMultipliers.ideas * dt;
        if (this.resources.ideas > caps.ideas.soft) {
            this.resources.ideas += ideasProduction / Math.pow(this.scalingMulti,(this.resources.ideas-caps.ideas.soft)); // Penalty if above soft cap
        }
        else {
            this.resources.ideas += ideasProduction;
        }
        
        this.checkCaps();
        
        if (this.jobCooldown > 0) {
            this.jobCooldown -= dt;
        }

        this.checkUnlocks();
        this.updateUI();
        
        // Autosave every 30s
        if (now - this.lastSave > 30000) {
            this.save();
            this.lastSave = now;
        }
        
        requestAnimationFrame(() => this.tick());
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
