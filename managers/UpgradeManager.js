class UpgradeManager {
    constructor(game) {
        this.game = game;
    }

    init() {
        this.game.upgrades = getInitialUpgrades();
    }

    getCost(upgrade) {
        return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, upgrade.count));
    }

    buyUpgrade(key) {
        const upgrade = this.game.upgrades[key];
        const cost = this.getCost(upgrade);
        if (this.game.resources[upgrade.currency] >= cost) {
            this.game.resources[upgrade.currency] -= cost;
            upgrade.count++;
            // upgrade.cost is no longer stored, calculated dynamically
            
            if (upgrade.effect) {
                upgrade.effect(this.game, upgrade.count);
            }
            
            // Recalculate all rates/caps
            this.game.resourceManager.recalculateRates(this.game);

            this.game.log(`Purchased ${upgrade.name}`, "upgrade");
            this.game.updateUI();
        }
    }

    checkUnlocks() {
        // Tab Unlocks
        if (!this.game.tabUnlocks.upgrades && this.game.resources.braindead >= 10) {
            this.game.tabUnlocks.upgrades = true;
            this.game.updateUI(); // Force update to show tab
        }

        Object.values(this.game.upgrades).forEach(item => {
            if (!item.visible && item.unlockCondition && item.unlockCondition(this.game)) {
                item.visible = true;
                item.newlyUnlocked = true;
                this.game.log(`${item.name} unlocked!`, "unlock");
            }
        });
    }
}
