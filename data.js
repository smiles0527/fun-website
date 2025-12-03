// data.js - Contains static game data and definitions

function getInitialUpgrades() {
    return {
        enhancedClick: {
            id: 'enhancedClick',
            name: "Enhanced Click",
            description: "+0.5 Braindead per click",
            cost: 10,
            costScale: 1.6,
            currency: "braindead",
            count: 0,
            effect: function(game) { game.clickValue.braindead += 0.5; },
            unlockCondition: function(game) { return game.resources.braindead >= 10; },
            visible: false
        },
        autoclicker: {
            id: 'autoclicker',
            name: "Autoclicker",
            description: "Generates Braindead automatically",
            cost: 25,
            costScale: 1.3,
            currency: "braindead",
            count: 0,
            effect: function(game) { game.production.braindead += 1; },
            baseProduction: { braindead: 1 },
            unlockCondition: function(game) { return game.resources.braindead >= 10; },
            visible: false
        },
        thoughtCondenser: {
            id: 'thoughtCondenser',
            name: "Thought Condenser",
            description: "Generates Ideas slowly",
            cost: 75,
            costScale: 1.4,
            currency: "braindead",
            count: 0,
            effect: function(game) { game.production.ideas += 0.05; },
            baseProduction: { ideas: 0.05 },
            unlockCondition: function(game) { return game.resources.braindead >= 50; },
            visible: false
        },
        ideaAmplifier: {
            id: 'ideaAmplifier',
            name: "Idea Amplifier",
            description: "Boosts Idea generation",
            cost: 500,
            costScale: 1.5,
            currency: "braindead",
            count: 0,
            effect: function(game) { game.production.ideas += 0.2; },
            baseProduction: { ideas: 0.1 },
            unlockCondition: function(game) { return game.resources.ideas >= 1; },
            visible: false
        },
        necroticTissue: {
            id: 'necroticTissue',
            name: "Necrotic Tissue",
            description: "Connects braindead. +10% Braindead production.",
            cost: 1000,
            costScale: 1.5,
            currency: "braindead",
            count: 0,
            effect: function(game) { game.productionMultipliers.braindead += 0.1; },
            unlockCondition: function(game) { return game.research.necroticTissue && game.research.necroticTissue.purchased; },
            visible: false
        },
        necroticShell: {
            id: 'necroticShell',
            name: "Necrotic Shell",
            description: "Increases Braindead Cap.",
            cost: 5000,
            costScale: 2.0,
            currency: "braindead",
            count: 0,
            effect: function(game) { game.caps.braindead += 500; },
            unlockCondition: function(game) { return game.research.necroticShell && game.research.necroticShell.purchased; },
            visible: false
        },
        neuronicCovering: {
            id: 'neuronicCovering',
            name: "Neuronic Covering",
            description: "Increases Brain Size (affects caps).",
            cost: 10,
            costScale: 1.5,
            currency: "ideas",
            count: 0,
            effect: function(game) { game.brainSize += 1; },
            unlockCondition: function(game) { return game.research.neuronicCoating && game.research.neuronicCoating.purchased; },
            visible: false
        },
        braindeadProducer: {
            id: 'braindeadProducer',
            name: "Braindead Producer",
            description: "Generates Braindead using money.",
            cost: 100,
            costScale: 1.2,
            currency: "currency",
            count: 0,
            effect: function(game) { game.production.braindead += 5; },
            baseProduction: { braindead: 5 },
            unlockCondition: function(game) { return game.research.biomatterLab && game.research.biomatterLab.purchased; },
            visible: false
        },
        ideaProducer: {
            id: 'ideaProducer',
            name: "Idea Producer",
            description: "Generates Ideas using money.",
            cost: 200,
            costScale: 1.3,
            currency: "currency",
            count: 0,
            effect: function(game) { game.production.ideas += 0.5; },
            baseProduction: { ideas: 0.5 },
            unlockCondition: function(game) { return game.research.biomatterLab && game.research.biomatterLab.purchased; },
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
            effect: function(game) {
                game.log("How can I increase my braindead? It must be something to do with my brain...", "lore");
            },
            unlockCondition: function(game) { return game.resources.ideas >= 1; },
            visible: false
        },
        thinkMore: {
            id: 'thinkMore',
            name: "Think some more",
            description: "Dig deeper.",
            cost: 25,
            currency: "ideas",
            purchased: false,
            prereq: 'think',
            effect: function(game) {
                game.log("There seems to be some sort of 'immunity' stopping me from increasing my braindead quickly...", "lore");
                document.getElementById('immunity-display').style.display = 'flex';
            },
            unlockCondition: function(game) { return game.research.think.purchased && game.resources.ideas >= 2; },
            visible: false
        },
        immunityResearch: {
            id: 'immunityResearch',
            name: "Immunity Research",
            description: "Study the resistance.",
            cost: 100,
            currency: "ideas",
            purchased: false,
            prereq: 'thinkMore',
            effect: function(game) {
                game.log("Aha! I can just create a vaccine to decrease my immunity. That's how vaccines work right?", "lore");
            },
            unlockCondition: function(game) { return game.research.thinkMore.purchased && game.resources.ideas >= 5; },
            visible: false
        },
        vaccineV1: {
            id: 'vaccineV1',
            name: "Vaccine V1",
            description: "Reduces immunity.",
            cost: 250,
            currency: "ideas",
            purchased: false,
            prereq: 'immunityResearch',
            effect: function(game) {
                game.resources.immunity = Math.max(1, game.resources.immunity - 10);
                game.log("Immunity reduced! Braindead gain increased.", "general");
            },
            unlockCondition: function(game) { return game.research.immunityResearch.purchased && game.resources.ideas >= 10; },
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
            effect: function(game) { game.log("Tissue connected.", "lore"); },
            unlockCondition: function(game) { return game.research.think.purchased; },
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
            effect: function(game) { game.log("Condenser upgraded.", "lore"); },
            unlockCondition: function(game) { return game.research.think.purchased; },
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
            effect: function(game) { game.log("Shell unlocked.", "lore"); },
            unlockCondition: function(game) { return game.research.immunityResearch.purchased; },
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
            effect: function(game) { game.productionMultipliers.ideas += 0.5; },
            unlockCondition: function(game) { return game.research.immunityResearch.purchased; },
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
            effect: function(game) { game.log("Coating applied.", "lore"); },
            unlockCondition: function(game) { return game.research.necroticShell.purchased; },
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
            effect: function(game) { game.triggerVaccine(2); },
            unlockCondition: function(game) { return game.research.vaccineV1.purchased; },
            visible: false
        },
        getAJob: {
            id: 'getAJob',
            name: "Get a J*b",
            description: "Unlock the Job tab.",
            cost: 50,
            currency: "ideas",
            purchased: false,
            prereq: 'vaccineV1',
            effect: function(game) { 
                game.log("Time to work...", "lore");
                document.getElementById('job-panel').style.display = 'flex';
            },
            unlockCondition: function(game) { return game.research.vaccineV1.purchased; },
            visible: false
        },
        studyBiomatter: {
            id: 'studyBiomatter',
            name: "Study Biomatter",
            description: "Unlock Biomatter Lab.",
            cost: 5,
            currency: "currency",
            purchased: false,
            prereq: 'getAJob',
            effect: function(game) { game.log("Biomatter is fascinating.", "lore"); },
            unlockCondition: function(game) { return game.research.getAJob.purchased; },
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
            effect: function(game) { game.log("Lab operational.", "lore"); },
            unlockCondition: function(game) { return game.research.studyBiomatter.purchased; },
            visible: false
        }
    };
}

function getInitialJobs() {
    return {
        intern: {
            id: 'intern',
            name: "Unpaid Intern",
            salary: 0,
            maxCurrency: 10,
            suspicionRate: 0,
            req: 0
        },
        fastFood: {
            id: 'fastFood',
            name: "Fast Food Worker",
            salary: 1,
            maxCurrency: 100,
            suspicionRate: 5, // 5% chance to get fired per work
            req: 0 // Starting job
        }
    };
}
