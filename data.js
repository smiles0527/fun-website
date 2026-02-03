// data.js - Contains static game data and definitions

const { Suspense } = require("react");

function getInitialUpgrades() {
  return {
    enhancedClick: {
      id: 'enhancedClick',
      name: "Enhanced Click",
      description: "+0.5 Braindead per click",
      baseCost: 10,
      costScale: 1.6,
      currency: "braindead",
      count: 0,
      clickBonus: { braindead: 0.5 },
      type: 'general',
      unlockCondition: function (game) { return game.resources.braindead >= 10; },
      visible: false
    },
    autoclicker: {
      id: 'autoclicker',
      name: "Autoclicker",
      description: "Generates Braindead automatically",
      baseCost: 25,
      costScale: 1.3,
      currency: "braindead",
      count: 0,
      productionBonus: { braindead: 1 },
      unlockCondition: function (game) { return game.resources.braindead >= 10; },
      visible: false
    },
    thoughtCondenser: {
      id: 'thoughtCondenser',
      name: "Thought Condenser",
      description: "Generates Ideas slowly",
      baseCost: 75,
      costScale: 1.4,
      currency: "braindead",
      count: 0,
      productionBonus: { ideas: 0.1 },
      progressionRequired: true,
      unlockCondition: function (game) { return game.resources.braindead >= 50; },
      visible: false
    },
    ideaAmplifier: {
      id: 'ideaAmplifier',
      name: "Idea Amplifier",
      description: "Boosts Idea generation",
      baseCost: 250,
      costScale: 1.6,
      currency: "braindead",
      count: 0,
      productionBonus: { ideas: 0.2 },
      unlockCondition: function (game) { return game.resources.ideas >= 1; },
      visible: false
    },
    necroticTissue: {
      id: 'necroticTissue',
      name: "Necrotic Tissue",
      description: "Connects braindead. +20% Braindead production.",
      baseCost: 100,
      costScale: 1.5,
      currency: "braindead",
      count: 0,
      productionMulti: { braindead: 0.2 },
      unlockCondition: function (game) { return game.research.necroticTissue && game.research.necroticTissue.purchased; },
      visible: false
    },
    necroticShell: {
      id: 'necroticShell',
      name: "Necrotic Shell",
      description: "Increases Braindead Cap.",
      baseCost: 250,
      costScale: 2.0,
      currency: "braindead",
      count: 0,
      effect: function (game, count) { game.caps.braindead += 500; }, // Keep effect for one-time/special things? No, this is an upgrade, should be recalculated too.
      // Wait, caps are usually recalculated too. I should add capBonus.
      capBonus: { braindead: 500 },
      unlockCondition: function (game) { return game.research.necroticShell && game.research.necroticShell.purchased; },
      visible: false
    },
    neuronicCovering: {
      id: 'neuronicCovering',
      name: "Neuronic Covering",
      description: "Increases Brain Size (affects caps).",
      baseCost: 300,
      costScale: 1.4,
      currency: "braindead",
      count: 0,
      // Brain size is a special property.
      specialBonus: { brainSize: 1 },
      progressionRequired: true,
      unlockCondition: function (game) { return game.research.neuronicCoating && game.research.neuronicCoating.purchased; },
      visible: false
    },
    braindeadProducer: {
      id: 'braindeadProducer',
      name: "Braindead Producer",
      description: "Generates Braindead using money.",
      baseCost: 100,
      costScale: 1.2,
      currency: "currency",
      count: 0,
      count: 0,
      productionBonus: { braindead: 5 },
      type: 'biomatter',
      unlockCondition: function (game) { return game.research.biomatterLab && game.research.biomatterLab.purchased; },
      visible: false
    },
    ideaProducer: {
      id: 'ideaProducer',
      name: "Idea Producer",
      description: "Generates Ideas using money.",
      baseCost: 200,
      costScale: 1.3,
      currency: "currency",
      count: 0,
      count: 0,
      productionBonus: { ideas: 0.5 },
      type: 'biomatter',
      unlockCondition: function (game) { return game.research.biomatterLab && game.research.biomatterLab.purchased; },
      visible: false
    },
    neuralStatic: {
      id: 'neuralStatic',
      name: "Neural Static",
      description: "Brain noise generates activity. Costs Ideas.",
      baseCost: 10,
      costScale: 1.5,
      currency: "ideas",
      count: 0,
      productionBonus: { braindead: 5 },
      type: 'general',
      unlockCondition: function (game) { return game.research.neuroticCondensor && game.research.neuroticCondensor.purchased; },
      visible: false
    }
  };
}

function getInitialResearch() {
  return {
    think: {
      id: 'think',
      name: "Think",
      description: "Unlock the power of your mind.",
      cost: 1,
      currency: "ideas",
      purchased: false,
      prereq: null,
      effect: function (game) {
        game.log("How can I increase my braindead? It must be something to do with my brain...", "lore");
      },
      unlockCondition: function (game) { return game.resources.ideas >= 1; },
      visible: false
    },
    thinkMore: {
      id: 'thinkMore',
      name: "Think some more",
      description: "Dig deeper.",
      cost: 6,
      currency: "ideas",
      purchased: false,
      prereq: 'think',
      effect: function (game) {
        game.log("There seems to be some sort of 'immunity' stopping me from increasing my braindead quickly...", "lore");
        document.getElementById('immunity-display').style.display = 'flex';
      },
      unlockCondition: function (game) { return game.research.think.purchased && game.resources.ideas >= 2; },
      visible: false
    },
    immunityResearch: {
      id: 'immunityResearch',
      name: "Immunity Research",
      description: "Study the resistance.",
      cost: 7,
      currency: "ideas",
      purchased: false,
      prereq: 'thinkMore',
      effect: function (game) {
        game.log("Aha! I can just create a vaccine to decrease my immunity. That's how vaccines work right?", "lore");
      },
      unlockCondition: function (game) { return game.research.thinkMore.purchased; },
      visible: false
    },
    vaccineV1Research: {
      id: 'vaccineV1Research',
      name: "Vaccine V1 Blueprint",
      description: "The first step.",
      cost: 25,
      currency: "ideas",
      purchased: false,
      prereq: 'immunityResearch',
      effect: function (game) {
        game.log("[placeholder]", "lore");
      },
      unlockCondition: function (game) { return game.research.immunityResearch.purchased; },
      visible: false
    },
    necroticTissue: {
      id: 'necroticTissue',
      name: "Necrotic Tissue",
      description: "What if I connected my braindead?",
      cost: 2,
      currency: "ideas",
      purchased: false,
      prereq: 'think',
      effect: function (game) { game.log("Tissue connected.", "lore"); },
      unlockCondition: function (game) { return game.research.think.purchased; },
      visible: false
    },
    neuroticCondensor: {
      id: 'neuroticCondensor',
      name: "Neurotic Condensor",
      description: "Could I use my necrotic tissue to think?",
      cost: 3,
      currency: "ideas",
      purchased: false,
      prereq: 'think',
      effect: function (game) { game.log("Condenser upgraded.", "lore"); },
      unlockCondition: function (game) { return game.research.think.purchased; },
      visible: false
    },
    necroticShell: {
      id: 'necroticShell',
      name: "Necrotic Shell",
      description: "Unlock Necrotic Shell upgrade.",
      cost: 7,
      currency: "ideas",
      purchased: false,
      prereq: 'immunityResearch',
      effect: function (game) { game.log("Shell unlocked.", "lore"); },
      unlockCondition: function (game) { return game.research.immunityResearch.purchased; },
      visible: false
    },
    efficientIdeas: {
      id: 'efficientIdeas',
      name: "Efficient Ideas",
      description: "1.5x Idea Production.",
      cost: 7,
      currency: "ideas",
      purchased: false,
      prereq: 'immunityResearch',
      productionMulti: { ideas: 0.5 },
      unlockCondition: function (game) { return game.research.immunityResearch.purchased; },
      visible: false
    },
    neuronicCoating: {
      id: 'neuronicCoating',
      name: "Neuronic Coating",
      description: "Unlock Neuronic Covering.",
      cost: 8,
      currency: "ideas",
      purchased: false,
      prereq: 'necroticShell',
      effect: function (game) { game.log("Coating applied.", "lore"); },
      unlockCondition: function (game) { return game.research.necroticShell.purchased; },
      visible: false
    },
    getAJob: {
      id: 'getAJob',
      name: "Get a J*b",
      description: "Unlock the Job tab.",
      cost: 50,
      currency: "ideas",
      purchased: false,
      prereq: null,
      effect: function (game) {
        game.log("Time to work...", "lore");
        document.getElementById('job-panel').style.display = 'flex';
      },
      unlockCondition: function (game) { return game.vaccines && game.vaccines.vaccineV1 && game.vaccines.vaccineV1.purchased; },
      visible: false
    },

    // Currency upgrades
    studyBiomatter: {
      id: 'studyBiomatter',
      name: "Study Biomatter",
      description: "Unlock Biomatter Lab.",
      cost: 5,
      currency: "currency",
      purchased: false,
      prereq: 'getAJob',
      effect: function (game) { game.log("Biomatter is fascinating.", "lore"); },
      unlockCondition: function (game) { return game.research.getAJob.purchased; },
      visible: false
    },
    biomatterLab: {
      id: 'biomatterLab',
      name: "Biomatter Lab",
      description: "Unlock Producers.",
      cost: 50,
      currency: "currency",
      purchased: false,
      prereq: 'studyBiomatter',
      effect: function (game) { game.log("Lab operational.", "lore"); },
      unlockCondition: function (game) { return game.research.studyBiomatter.purchased; },
      visible: false
    }
  };
}

function getInitialVaccines() {
  return {
    vaccineV1: {
      id: 'vaccineV1',
      name: "Vaccine V1",
      description: "Reduces immunity.",
      cost: 25,
      currency: "ideas",
      purchased: false,
      prereq: null,
      effect: function (game) {
        game.triggerVaccine(1);
      },
      // reset all progress except for immunity + make this vaccine unable to be bought
      // apply 1.5x buff(multiplicative of other buffs) to ideas and braindead
      unlockCondition: function (game) { return game.research.vaccineV1Research.purchased; },
      visible: false
    },
    vaccineV2: {
      id: 'vaccineV2',
      name: "Vaccine V2",
      description: "Resets everything except milestones.",
      cost: 50,
      currency: "ideas",
      purchased: false,
      prereq: 'vaccineV1',
      effect: function (game) { game.triggerVaccine(2); },
      unlockCondition: function (game) { return game.vaccines.vaccineV1.purchased; },
      visible: false
    }
  };
}

function getInitialJobs() {
  return {
    intern: {
      id: 'intern',
      name: "Intern",
      salary: 0.1,
      maxCurrency: 10,
      suspicionRate: 0,
      cooldown: 5,
      tier: 1,
      reqWorks: 0,
      reqCurrency: 0
    },
    fastFood: {
      id: 'fastFood',
      name: "Fast Food Worker",
      salary: 0.5,
      maxCurrency: 50,
      suspicionRate: 5, // 5% chance to get fired per work
      cooldown: 5,
      tier: 1,
      reqWorks: 0,
      reqCurrency: 0
    },
    retail: {
      id: 'retail',
      name: "Retail Clerk",
      salary: 2,
      maxCurrency: 200,
      suspicionRate: 3,
      cooldown: 4,
      tier: 2,
      reqWorks: 10,
      reqCurrency: 0
    },
    delivery: {
      id: 'delivery',
      name: "Delivery Driver",
      salary: 3,
      maxCurrenecy: 300,
      suspicionRate: 2,
      cooldown: 6,
      tier: 2,
      reqWorks: 10,
      reqCurrency: 0
    },

    //tier3 reqruires 50 works + $100
    office: {
      id: 'office',
      name: "Office Worker",
      salary: 10,
      maxCurrency: 1000,
      suspicionRate: 1,
      cooldown: 3,
      tier: 3,
      reqWorks: 50,
      reqCurrency: 100
    },
    technician: {
      id: 'techincian',
      name: "Technician",
      salary: 15,
      maxCurrency: 1500,
      suspicionRate: 5,
      cooldown: 5,
      tier: 3,
      reqWorks: 50,
      reqCurrency: 100
    },
    //tier4 200 works + $1000
    manager: {
      id: 'manager',
      name: "Manager",
      salary: 50,
      maxCurrency: 5000,
      suspicionRate: 0.5,
      cooldown: 2,
      tier: 4,
      reqWorks: 200,
      reqCurrency: 1000
    },
    specialist: {
      id: 'specialist',
      name: "Specialist",
      salary: 75,
      maxCurrency: 7500,
      suspicionRate: 2,
      cooldown: 4,
      tier: 4,
      reqWorks: 200,
      reqCurrency: 1000
    },
    //tier5 requires vaccinev3???
    executive: {
      id: 'executive',
      name: "Executive",
      salary: 200,
      maxCurrency: 20000,
      suspicionRate: 0,
      cooldown: 1,
      tier: 5,
      reqWorks: 500,
      reqCurrency: 10000,
      reqVaccine: 'vaccineV3'
    },
  };
}
