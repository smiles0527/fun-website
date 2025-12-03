// ui.js - Handles DOM updates and UI interactions

class UIManager {
    constructor(game) {
        this.game = game;
    }

    update(game) {
        // Update Resources
        document.getElementById('res-braindead').textContent = Math.floor(game.resources.braindead);
        document.getElementById('res-ideas').textContent = game.resources.ideas.toFixed(1);
        document.getElementById('res-immunity').textContent = Math.floor(game.resources.immunity);
        document.getElementById('res-currency').textContent = Math.floor(game.resources.currency);
        document.getElementById('res-suspicion').textContent = Math.floor(game.resources.suspicion) + '%';

        // Update Rates
        const immunityMult = 100 / game.resources.immunity;
        const bdRate = game.production.braindead * game.productionMultipliers.braindead * immunityMult;
        const ideasRate = game.production.ideas * game.productionMultipliers.ideas;

        const bdRateEl = document.getElementById('res-braindead-rate');
        if (bdRate > 0) bdRateEl.textContent = `(+${bdRate.toFixed(1)}/s)`;
        else bdRateEl.textContent = '';

        const ideasRateEl = document.getElementById('res-ideas-rate');
        if (ideasRate > 0) ideasRateEl.textContent = `(+${ideasRate.toFixed(1)}/s)`;
        else ideasRateEl.textContent = '';

        this.updateUpgrades(game);
        this.updateResearch(game);
        this.updateJobs(game);
        this.updateBrainVisuals(game);
    }

    updateBrainVisuals(game) {
        const brainIcon = document.querySelector('#brain-button .brain-icon');
        if (!brainIcon) return;

        // Visual progress based on Braindead resource (capped at 1000 for max visual)
        const progress = Math.min(game.resources.braindead / 1000, 1);
        
        // Interpolate values
        // Saturation: 0.2 (dull) -> 3 (vibrant)
        const saturate = 0.2 + (progress * 2.8);
        // Brightness: 0.6 (dim) -> 1.2 (bright)
        const brightness = 0.6 + (progress * 0.6);
        // Glow opacity: 0.1 -> 0.8
        const glowOp = 0.1 + (progress * 0.7);
        // Glow radius: 5px -> 30px
        const glowRad = 5 + (progress * 25);

        brainIcon.style.filter = `sepia(1) hue-rotate(10deg) saturate(${saturate}) brightness(${brightness}) drop-shadow(0 0 ${glowRad}px rgba(255, 215, 0, ${glowOp}))`;
    }

    updateResource(type, value) {
        const el = document.getElementById(`res-${type}`);
        if (el) {
            if (type === 'ideas') el.textContent = value.toFixed(1);
            else if (type === 'suspicion') el.textContent = Math.floor(value) + '%';
            else el.textContent = Math.floor(value);
        }
    }

    updateJobs(game) {
        const jobPanel = document.getElementById('job-panel');
        if (jobPanel.style.display === 'none') return; // Don't update if hidden

        const job = game.jobs[game.currentJob];
        document.getElementById('current-job-name').textContent = job.name;
        document.getElementById('job-salary').textContent = job.salary;
        document.getElementById('job-max-currency').textContent = job.maxCurrency;
        document.getElementById('work-amount').textContent = job.salary;
        
        const workBtn = document.getElementById('btn-work');
        const stealBtn = document.getElementById('btn-steal');
        
        if (game.jobCooldown > 0) {
            workBtn.disabled = true;
            stealBtn.disabled = true;
            workBtn.textContent = `Cooldown (${Math.ceil(game.jobCooldown)}s)`;
        } else {
            workBtn.disabled = false;
            stealBtn.disabled = false;
            workBtn.textContent = `Work (+${job.salary})`;
        }
        
        // Show suspicion if > 0
        const suspicionDisplay = document.getElementById('suspicion-display');
        if (game.resources.suspicion > 0) {
            suspicionDisplay.style.display = 'flex';
        }
        
        // Show currency if > 0 or job unlocked
        const currencyDisplay = document.getElementById('currency-display');
        if (game.resources.currency > 0 || jobPanel.style.display !== 'none') {
            currencyDisplay.style.display = 'flex';
        }
    }

    updateUpgrades(game) {
        const upgradeContainer = document.querySelector('.upgrades-panel .upgrade-list');
        Object.values(game.upgrades).forEach(upgrade => {
            let btn = document.getElementById(`btn-${upgrade.id}`);
            
            // Unlock check
            if (!upgrade.visible && upgrade.unlockCondition && upgrade.unlockCondition(game)) {
                upgrade.visible = true;
            }
            
            const isVisible = upgrade.visible || upgrade.count > 0;
            
            if (!isVisible) {
                if (btn) btn.style.display = 'none';
                return;
            }

            if (!btn) {
                btn = document.createElement('button');
                btn.id = `btn-${upgrade.id}`;
                btn.className = 'upgrade-btn';
                btn.innerHTML = `
                    <span class="upgrade-name">${upgrade.name}</span>
                    <span class="upgrade-cost"></span>
                    <span class="upgrade-desc">${upgrade.description}</span>
                `;
                btn.addEventListener('click', () => game.buyUpgrade(upgrade.id));
                upgradeContainer.appendChild(btn);
            }
            
            btn.style.display = 'block';
            
            // Update Name with Count and Production
            let nameText = `${upgrade.name} (${upgrade.count})`;
            if (upgrade.baseProduction) {
                const type = Object.keys(upgrade.baseProduction)[0];
                const base = upgrade.baseProduction[type];
                const mult = game.productionMultipliers[type] || 1;
                // Immunity affects braindead production
                const immunityMult = type === 'braindead' ? (100 / game.resources.immunity) : 1;
                
                const totalProd = base * upgrade.count * mult * immunityMult;
                const perSec = base * mult * immunityMult;
                
                // Show total production if count > 0, else show base
                if (upgrade.count > 0) {
                     nameText += ` (+${totalProd.toFixed(1)}/s)`;
                } else {
                     nameText += ` (+${perSec.toFixed(1)}/s)`;
                }
            }
            
            btn.querySelector('.upgrade-name').textContent = nameText;

            const costSpan = btn.querySelector('.upgrade-cost');
            costSpan.textContent = `${upgrade.cost} ${upgrade.currency === 'braindead' ? 'Bd' : 'Id'}`;
            btn.disabled = game.resources[upgrade.currency] < upgrade.cost;
        });
    }

    updateResearch(game) {
        const researchContainer = document.getElementById('research-list');
        Object.values(game.research).forEach(item => {
            if (item.purchased) {
                 const existingBtn = document.getElementById(`btn-research-${item.id}`);
                 if (existingBtn) existingBtn.style.display = 'none';
                 return;
            }

            let btn = document.getElementById(`btn-research-${item.id}`);

            // Unlock check
            if (!item.visible && item.unlockCondition && item.unlockCondition(game)) {
                item.visible = true;
            }

            const isVisible = item.visible || item.purchased;

             if (!isVisible) {
                if (btn) btn.style.display = 'none';
                return;
            }

            if (!btn) {
                btn = document.createElement('button');
                btn.id = `btn-research-${item.id}`;
                btn.className = 'upgrade-btn research-btn';
                btn.innerHTML = `
                    <span class="upgrade-name">${item.name}</span>
                    <span class="upgrade-cost">${item.cost} Ideas</span>
                    <span class="upgrade-desc">${item.description}</span>
                `;
                btn.onclick = () => game.buyResearch(item.id);
                researchContainer.appendChild(btn);
            }

            btn.style.display = 'block';
            btn.disabled = game.resources[item.currency] < item.cost;
        });
    }

    addLog(log) {
        const logContent = document.getElementById('log-content');
        if (!logContent) return;

        const entry = document.createElement('div');
        entry.className = `log-entry ${log.type}`;
        const timeStr = new Date(log.timestamp).toLocaleTimeString();
        entry.textContent = `[${timeStr}] ${log.message}`;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    renderLogs(logs, filter) {
        const logContent = document.getElementById('log-content');
        logContent.innerHTML = '';

        logs.forEach(log => {
            if (filter !== 'all' && log.type !== filter) {
                let show = false;
                if (filter === 'resources') {
                    if (log.type === 'general' || log.type === 'upgrade') show = true;
                } else if (filter === 'lore') {
                    if (log.type === 'lore' || log.type === 'unlock') show = true;
                }

                if (!show) return;
            }

            const entry = document.createElement('div');
            entry.className = `log-entry ${log.type}`;
            const timeStr = new Date(log.timestamp).toLocaleTimeString();
            entry.textContent = `[${timeStr}] ${log.message}`;
            logContent.appendChild(entry);
        });
    }

    showLorePopup(message) {
        // Create container if it doesn't exist
        let container = document.querySelector('.lore-popup-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'lore-popup-container';
            document.body.appendChild(container);
        }

        // Create popup
        const popup = document.createElement('div');
        popup.className = 'lore-popup';
        
        const text = document.createElement('div');
        text.className = 'lore-popup-text';
        text.textContent = message;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'lore-popup-close';
        closeBtn.textContent = 'Dismiss';
        // Click anywhere to dismiss
        popup.onclick = () => {
            popup.style.animation = 'popupFadeOut 0.3s ease forwards';
            setTimeout(() => popup.remove(), 300);
        };

        popup.appendChild(text);
        popup.appendChild(closeBtn);
        container.appendChild(popup);

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            if (document.body.contains(popup)) {
                popup.style.animation = 'popupFadeOut 0.5s ease forwards';
                setTimeout(() => popup.remove(), 500);
            }
        }, 4000);
    }

    createFloatingText(x, y, text) {
        const el = document.createElement('div');
        el.className = 'floating-text';
        el.textContent = text;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    playIntroSequence(onComplete) {
        const overlay = document.createElement('div');
        overlay.id = 'intro-overlay';
        document.body.appendChild(overlay);

        const lines = [
            "Initializing Neural Interface...",
            "Loading Core Modules...",
            "Synapse Link Established.",
            "Subject: Kyle.",
            "Objective: Brainquest.",
            "Welcome."
        ];

        let delay = 0;
        lines.forEach((line, index) => {
            setTimeout(() => {
                const p = document.createElement('div');
                p.className = 'intro-line intro-cursor';
                p.textContent = '> ' + line;
                overlay.appendChild(p);
                
                // Remove cursor from previous line
                if (index > 0) {
                    overlay.children[index-1].classList.remove('intro-cursor');
                }
                
                p.style.opacity = 1;
            }, delay);

            delay += 300 + Math.random() * 200;
        });

        setTimeout(() => {
            overlay.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                overlay.remove();
                this.playMaterializeSequence(onComplete);
            }, 300);
        }, delay + 500);
    }

    playMaterializeSequence(onComplete) {
        // Trigger Flash
        const flash = document.getElementById('flash-overlay');
        flash.classList.add('flash-active');

        setTimeout(() => {
            // Sequence Reveal with Corner Convergence
            const mapping = {
                'sidebar-section': 'corner-tl', // Top-Left
                'brain-section': 'corner-tr',   // Top-Right
                'panels-section': 'corner-bl',  // Bottom-Left
                'log-section': 'corner-br'      // Bottom-Right
            };

            Object.entries(mapping).forEach(([id, animClass], index) => {
                setTimeout(() => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.classList.remove('hidden-ui');
                        el.classList.add(animClass);
                    }
                }, index * 100); // Fast stagger
            });

            // Ensure brain button exists
            const brainBtn = document.getElementById('brain-button');
            if (brainBtn) {
                // Remove old listener to prevent duplicates (though anonymous functions are hard to remove, 
                // we can rely on the fact that this sequence usually runs once per session or reload)
                // A better approach for the keydown is to add it in setupEventListeners in game.js, 
                // but since we are here:
                brainBtn.onkeydown = (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                    }
                };
            }

            if (onComplete) onComplete();
        }, 300); // Wait for flash to peak
    }

    revealAll() {
        const elements = [
            'sidebar-section',
            'brain-section',
            'panels-section',
            'log-section'
        ];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('hidden-ui', 'corner-tl', 'corner-tr', 'corner-bl', 'corner-br');
            }
        });
    }

    hideAll() {
        const elements = [
            'sidebar-section',
            'brain-section',
            'panels-section',
            'log-section'
        ];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('hidden-ui');
                el.classList.remove('corner-tl', 'corner-tr', 'corner-bl', 'corner-br');
            }
        });
    }
}
