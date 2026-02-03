class VaccineManager {
  constructor(game) {
    this.game = game;
  }

  init() {
    this.game.vaccines = getInitialVaccines();
  }

  buyVaccine(key) {
    const item = this.game.vaccines[key];
    if (!item.purchased && this.game.resources[item.currency] >= item.cost) {
      // Check prereqs
      if (item.prereq && !this.game.vaccines[item.prereq].purchased) return;

      this.game.resources[item.currency] -= item.cost;
      item.purchased = true;
      item.effect(this.game); // Pass game instance
      this.game.log(`Administered ${item.name}`, "unlock");
      this.game.updateUI();
    }
  }

  triggerVaccine(tier) {
    // 1. Reset Global Stats to Defaults
    this.game.production = { braindead: 0, ideas: 0 };
    this.game.productionMultipliers = { braindead: 1, ideas: 1 };
    this.game.clickValue = { braindead: 1 };
    this.game.caps = { braindead: 500, ideas: 5 };
    this.game.brainSize = 1;
    this.game.scalingMulti = 1.75;

    // 2. Reset Upgrades (Count AND Cost)
    const freshUpgrades = getInitialUpgrades();
    Object.keys(this.game.upgrades).forEach(key => {
      const u = this.game.upgrades[key];
      const fresh = freshUpgrades[key];
      if (fresh) {
        u.count = 0;
        u.cost = fresh.cost; // Reset cost
        u.visible = false;
      }
    });

    // 3. Reset Research
    Object.values(this.game.research).forEach(r => {
      r.purchased = false;
      r.visible = false;
    });

    if (tier === 1) {
      // Reset resources
      this.game.resources.braindead = 0;
      this.game.resources.ideas = 0;
      this.game.resources.immunity = 80; // Reduced immunity
      this.game.resources.currency = 0;
      this.game.resources.suspicion = 0;

      // Apply global multiplier
      this.game.productionMultipliers.braindead *= 1.5;
      this.game.productionMultipliers.ideas *= 1.5;

      this.game.log("Vaccine V1 Administered. Immunity reduced.", "lore");
      this.game.save();
      location.reload();

    } else if (tier === 2) {
      // Reset resources
      this.game.resources.braindead = 0;
      this.game.resources.ideas = 0;
      this.game.resources.immunity = 60;
      this.game.resources.currency = 0;
      this.game.resources.suspicion = 0;

      // Apply global multiplier
      this.game.productionMultipliers.braindead *= 2.5;
      this.game.productionMultipliers.ideas *= 2.5;

      this.game.log("Vaccine V2 Administered. I feel... different.", "lore");
      this.game.save();
      location.reload();
    }
  }

  checkUnlocks() {

    if (!this.game.tabUnlocks.vaccines && this.game.research.vaccineV1Research &&
      this.game.research.vaccineV1Resaerch.purchased) {

      this.game.tabUnlocks.vaccines = true;
      this.game.updateUI();
    }

    Object.values(this.game.vaccines).forEach(item => {
      if (!item.visible && item.unlockCondition && item.unlockCondition(this.game)) {
        item.visible = true;
        item.newlyUnlocked = true;
        this.game.log(`${item.name} unlocked!`, "unlock");
      }
    });
  }
}
