class BusinessManager {
  constructor(game) {
    this.game = game;
  }

  init() {
    this.game.businesses = this.game.businesses || {};
    this.game.ownedBusinesses = this.game.ownedBusinesses || [];
    this.game.cities = getInitialCities();
    this.game.currentCity = this.game.currentCity || 'smallTown';
    this.game.businessStats = this.game.businessStats || {
      totalRevenue: 0,
      totalEmployeesHired: 0,
      prestigeCount: 0
    };
  }

  getBusinessTypes() {
    return {
      fastFoodJoint: {
        id: 'fastFoodJoint',
        name: "Fast Food Joint",
        description: "Low margin, high volume",
        baseCost: 1000,
        baseProduction: 10,
        baseDemand: 8,
        pricePerUnit: 0.5,
        tier: 1,
        unlockCondition: (game) => game.research.getAJob && game.research.getAJob.purchased
      },
      retailStore: {
        id: 'retailStore',
        name: "Retail Store",
        description: "Medium margin, medium volume",
        baseCost: 5000,
        baseProduction: 5,
        baseDemand: 5,
        pricePerUnit: 2,
        tier: 2,
        unlockCondition: (game) => game.ownedBusinesses.some(b => b.type === 'fastFoodJoint')
      },
      techStartup: {
        id: 'techStartup',
        name: "Tech Startup",
        description: "High margin, low volume, needs R&D",
        baseCost: 25000,
        baseProduction: 2,
        baseDemand: 3,
        pricePerUnit: 50,
        tier: 3,
        unlockCondition: (game) => game.ownedBusinesses.some(b => b.type === 'retailStore')
      },
      manufacturing: {
        id: 'manufacturing',
        name: "Manufacturing Plant",
        description: "Supplies other businesses",
        baseCost: 100000,
        baseProduction: 20,
        baseDemand: 15,
        pricePerUnit: 5,
        tier: 4,
        unlockCondition: (game) => game.ownedBusinesses.some(b => b.type === 'techStartup')
      },
      realEstate: {
        id: 'realEstate',
        name: "Real Estate Agency",
        description: "Passive income, very expensive",
        baseCost: 500000,
        baseProduction: 1,
        baseDemand: 1,
        pricePerUnit: 1000,
        tier: 5,
        unlockCondition: (game) => game.ownedBusinesses.some(b => b.type === 'manufacturing')
      },
      pharmaceutical: {
        id: 'pharmaceutical',
        name: "Pharmaceutical Corp",
        description: "End-game. Leads to final vaccine.",
        baseCost: 5000000,
        baseProduction: 0.5,
        baseDemand: 1,
        pricePerUnit: 10000,
        tier: 6,
        unlockCondition: (game) => game.ownedBusinesses.some(b => b.type === 'realEstate')
      }
    };
  }

  createBusiness(typeId) {
    const types = this.getBusinessTypes();
    const type = types[typeId];
    if (!type) return null;

    const cost = this.getBusinessCost(typeId);
    if (this.game.resources.currency < cost) return null;
    if (!type.unlockCondition(this.game)) return null;

    this.game.resources.currency -= cost;

    const business = {
      id: `${typeId}_${Date.now()}`,
      type: typeId,
      name: type.name,
      employees: {
        operations: 0,
        logistics: 0,
        marketing: 0,
        sales: 0,
        hr: 0,
        management: 0
      },
      averageSkill: 1.0,
      productionBar: 0,
      demandBar: 0,
      inventory: 0,
      totalRevenue: 0
    };

    this.game.ownedBusinesses.push(business);
    this.game.log(`Purchased ${type.name}!`, "unlock");
    this.game.updateUI();
    return business;
  }

  getBusinessCost(typeId) {
    const types = this.getBusinessTypes();
    const type = types[typeId];
    if (!type) return Infinity;

    // Each owned business of same type increases cost
    const ownedOfType = this.game.ownedBusinesses.filter(b => b.type === typeId).length;
    return Math.floor(type.baseCost * Math.pow(2, ownedOfType));
  }

  getTotalEmployees(business) {
    return Object.values(business.employees).reduce((a, b) => a + b, 0);
  }

  getEmployeeCost(business) {
    const city = this.game.cities[this.game.currentCity];
    const totalEmployees = this.getTotalEmployees(business);
    const softCap = city.softCap;

    let baseCost = 100;

    if (totalEmployees < softCap) {
      // Linear costs
      return baseCost;
    } else {
      // Exponential after soft cap
      const excess = totalEmployees - softCap;
      return Math.floor(baseCost * Math.pow(1.15, excess));
    }
  }

  canHire(business, employeeType) {
    const city = this.game.cities[this.game.currentCity];
    const totalEmployees = this.getTotalEmployees(business);

    // Hard cap check
    if (totalEmployees >= city.hardCap) return false;

    // Currency check
    const cost = this.getEmployeeCost(business);
    if (this.game.resources.currency < cost) return false;

    return true;
  }

  hire(business, employeeType, count = 1) {
    for (let i = 0; i < count; i++) {
      if (!this.canHire(business, employeeType)) break;

      const cost = this.getEmployeeCost(business);
      this.game.resources.currency -= cost;
      business.employees[employeeType]++;
      this.game.businessStats.totalEmployeesHired++;
    }
    this.game.updateUI();
  }

  fire(business, employeeType, count = 1) {
    const toFire = Math.min(count, business.employees[employeeType]);
    business.employees[employeeType] -= toFire;
    this.game.updateUI();
  }

  calculateEffectiveness(business, employeeType) {
    const city = this.game.cities[this.game.currentCity];
    const count = business.employees[employeeType];
    const softCap = city.softCap / 6; // Per-type soft cap

    let effectiveness = count * business.averageSkill;

    // Diminishing returns after soft cap
    if (count > softCap) {
      effectiveness = softCap * business.averageSkill +
        Math.log(count - softCap + 1) * business.averageSkill;
    }

    // Management multiplier
    const mgmtBonus = 1 + (business.employees.management * 0.1 * business.averageSkill);
    effectiveness *= mgmtBonus;

    return effectiveness;
  }

  tick(dt) {
    this.game.ownedBusinesses.forEach(business => {
      const types = this.getBusinessTypes();
      const type = types[business.type];
      if (!type) return;

      // Skill growth (slow)
      if (this.getTotalEmployees(business) > 0) {
        const hrBonus = 1 + (business.employees.hr * 0.05 * business.averageSkill);
        business.averageSkill += 0.0001 * dt * hrBonus;
        if (business.averageSkill > 10) business.averageSkill = 10; // Cap at 10x
      }

      // Production
      const opsEffect = this.calculateEffectiveness(business, 'operations');
      const logEffect = this.calculateEffectiveness(business, 'logistics');
      const productionRate = type.baseProduction * (1 + opsEffect * 0.1) * (1 + logEffect * 0.05);
      business.productionBar += productionRate * dt;

      // Demand
      const mktEffect = this.calculateEffectiveness(business, 'marketing');
      const demandRate = type.baseDemand * (1 + mktEffect * 0.1);
      business.demandBar += demandRate * dt;

      // Convert to inventory
      if (business.productionBar >= 100) {
        const units = Math.floor(business.productionBar / 100);
        business.productionBar -= units * 100;
        business.inventory += units;
      }

      // Sales
      if (business.demandBar >= 100 && business.inventory > 0) {
        const salesEffect = this.calculateEffectiveness(business, 'sales');
        const sellUnits = Math.min(
          Math.floor(business.demandBar / 100),
          business.inventory,
          Math.max(1, Math.floor(salesEffect))
        );

        if (sellUnits > 0) {
          const city = this.game.cities[this.game.currentCity];
          const revenue = sellUnits * type.pricePerUnit * city.demandMultiplier;

          this.game.resources.currency += revenue;
          business.totalRevenue += revenue;
          this.game.businessStats.totalRevenue += revenue;

          business.inventory -= sellUnits;
          business.demandBar -= sellUnits * 100;
        }
      }

      // Inventory decay (waste if not sold)
      if (business.inventory > 100) {
        business.inventory -= dt * 0.1; // Slow decay
      }
    });
  }

  getAvailableBusinessTypes() {
    const types = this.getBusinessTypes();
    return Object.values(types).filter(t => t.unlockCondition(this.game));
  }

  prestige() {
    // TODO: Implement city relocation prestige
  }
}
