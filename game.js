// game.js - Main Game Logic

class Game {
  constructor() {
    // Managers
    this.resourceManager = new ResourceManager(this);
    this.upgradeManager = new UpgradeManager(this);
    this.researchManager = new ResearchManager(this);
    this.vaccineManager = new VaccineManager(this);
    this.jobManager = new JobManager(this);
    this.businessManager = new BusinessManager(this);
    this.settings = new SettingsManager(this);

    // Initialize Managers (State)
    this.resourceManager.init();
    this.upgradeManager.init();
    this.researchManager.init();
    this.vaccineManager.init();
    this.jobManager.init();
    this.businessManager.init();

    // Initialize Settings (Save Version etc)
    // SettingsManager constructor sets saveVersion

    this.tabUnlocks = {
      upgrades: false,
      research: false,
      vaccines: false,
      jobs: false,
      business: false
    };

    // CPS Limiter
    this.clickCount = 0;
    this.lastClickReset = Date.now();
    this.maxCps = 10;

    this.lastTick = Date.now();
    this.lastSave = Date.now(); // Initialize lastSave
    this.tickRate = 100;

    this.logs = [];
    this.currentLogFilter = 'all';
    this.currentUpgradeTab = 'general';
    this.options = {
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

    // Use SettingsManager for loading
    this.settings.load();

    // Autosave every 30 seconds (handled in tick)?? (goofy)
    setInterval(() => this.save(), 30000);

    // Save on close/refresh
    window.addEventListener('beforeunload', () => this.save());
  }

  save() {
    return this.settings.save();
  }

  load() {
    this.settings.load();
  }

  setupEventListeners() {
    // Most listeners are handled by TerminalUI or dynamic button creation
  }

  // Proxy Methods for UI calls
  clickBrain(e) {
    this.resourceManager.clickBrain();
  }

  buyUpgrade(key) {
    this.upgradeManager.buyUpgrade(key);
  }

  buyResearch(key) {
    this.researchManager.buyResearch(key);
  }

  buyVaccine(key) {
    this.vaccineManager.buyVaccine(key);
  }

  work() {
    this.jobManager.work();
  }

  steal() {
    this.jobManager.steal();
  }

  promote(jobId) {
    this.jobManager.promote(jobId);
  }

  triggerVaccine(tier) {
    this.vaccineManager.triggerVaccine(tier);
  }

  // Helper methods used by UI or Managers
  calculateCaps() {
    return this.resourceManager.calculateCaps();
  }


  getCost(item) {
    return item.cost;
  }

  tick() {
    const now = Date.now();
    let dt = (now - this.lastTick) / 1000;
    this.lastTick = now;

    // STRICT NO OFFLINE PROGRESS
    if (document.hidden) {
      return; // Pause completely if tab is hidden
    }

    // Clamp dt to prevent catch-up if loop was throttled
    if (dt > 0.1) dt = 0.1;

    this.resourceManager.tick(dt);
    this.jobManager.tick(dt);

    this.upgradeManager.checkUnlocks();
    this.researchManager.checkUnlocks();
    this.vaccineManager.checkUnlocks();

    this.updateUI();

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
