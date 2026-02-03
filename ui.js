// ui.js - Terminal UI Manager

class TerminalUI {
  constructor(game) {
    this.game = game;
    this.elements = {
      resourceStrip: document.getElementById('resource-strip'),
      visualArea: document.getElementById('visual-area'),
      asciiArt: document.getElementById('ascii-art'),
      logDisplay: document.getElementById('log-display'),
      purchaseLogDisplay: document.getElementById('purchase-log-display'),
      logColumn: document.getElementById('log-column'), // Added
      controlsArea: document.getElementById('controls-area'),
      navStrip: document.getElementById('nav-strip')
    };

    this.currentView = 'main'; // main, upgrades, research, jobs
    this.currentLogTab = 'system'; // system, transactions
    this.lastControlsHTML = '';
    this.lastNavHTML = '';
    this.lastResourceHTML = '';
    this.asciiBrain = `
      .---.
    .'     '.
   /   o  o  \\
  |    __    |
   \\  (  )  /
    '.____.'
        `;
  }

  init() {
    this.elements.asciiArt.textContent = ""; // Start empty
    this.elements.clickFeedback = document.getElementById('click-feedback');
    this.elements.brainWrapper = document.getElementById('brain-wrapper');

    // Click handler on the wrapper for better usability
    this.elements.brainWrapper.onclick = () => {
      this.game.clickBrain();

      // Show feedback
      const immunityMult = 100 / Math.max(1, this.game.resources.immunity || 100);
      const gain = this.game.clickValue.braindead * immunityMult;
      const caps = this.game.calculateCaps();

      const fb = this.elements.clickFeedback;

      if (this.game.resources.braindead >= caps.braindead) {
        fb.textContent = `+0 (MAX)`;
        fb.style.color = '#ff4444';
      } else {
        const displayGain = gain % 1 === 0 ? gain : gain.toFixed(1);
        fb.textContent = `+${displayGain} Bd`;
        fb.style.color = ''; // Reset color
      }

      fb.classList.remove('visible');
      void fb.offsetWidth; // Trigger reflow
      fb.classList.add('visible');

      if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);

      this.feedbackTimeout = setTimeout(() => {
        fb.classList.remove('visible');
      }, 100); // Start fading out quickly
    };

    // Prevent double-click selection
    this.elements.brainWrapper.addEventListener('mousedown', (e) => e.preventDefault());

    this.elements.brainWrapper.addEventListener('mousedown', (e) => e.preventDefault());

    this.feedbackTimeout = null;

    // Global Tooltip
    this.elements.tooltip = document.getElementById('global-tooltip');
    document.addEventListener('mousemove', (e) => this.updateTooltipPosition(e));
  }

  update(game) {
    this.updateResources(game);
    this.updateControls(game);
    this.updateNav(game);
    this.checkProgression(game);
  }

  revealBrain() {
    if (!this.elements.asciiArt.textContent) {
      this.elements.asciiArt.textContent = this.asciiBrain;
    }
  }

  checkProgression(game) {
    // Phase 1: Brain appears
    if ((game.resources.braindead > 0 || game.tabUnlocks.upgrades) && !this.elements.asciiArt.textContent) {
      this.revealBrain();
      if (game.resources.braindead > 0) { // Only log if it's a fresh discovery
        this.log("A shape forms in the void.");
      }
    }


    // Phase 2: Resources appear
    if (game.resources.braindead > 0 || game.tabUnlocks.upgrades) {
      this.elements.resourceStrip.style.display = 'flex';

      // Trigger animations after a slight delay to ensure display:flex is applied
      setTimeout(() => {
        this.elements.resourceStrip.classList.add('visible-border');
        this.elements.resourceStrip.classList.add('visible-content');
        this.elements.controlsArea.parentElement.classList.add('visible-border');
        this.elements.controlsArea.classList.add('visible-content'); // Add fade-in for controls
        // document.getElementById('log-column').classList.add('visible-border'); // Moved to Phase 3
      }, 100);
    }

    // Phase 3: Nav appears
    if (game.resources.braindead >= 10 || game.tabUnlocks.upgrades) {
      this.elements.navStrip.style.display = 'flex';
      setTimeout(() => {
        this.elements.navStrip.classList.add('visible-border');
        this.elements.navStrip.classList.add('visible-content'); // Trigger fade-in
      }, 100);
    }
  }

  formatNumber(num) {
    return num % 1 === 0 ? num : num.toFixed(1);
  }

  updateResources(game) {
    if (this.elements.resourceStrip.style.display === 'none') return;

    const res = game.resources;
    const caps = game.calculateCaps();
    let html = '';

    // Calculate rates
    const immunityMult = 100 / Math.max(1, res.immunity || 100);
    const bdRate = game.production.braindead * game.productionMultipliers.braindead * immunityMult;
    let ideasRate = game.production.ideas * game.productionMultipliers.ideas;
    if (res.ideas > caps.ideas.soft) {
      ideasRate = ideasRate / Math.pow(game.scalingMulti, (res.ideas - caps.ideas.soft));
    }

    // Braindead (Always show if strip is visible)
    if (true) {
      const bdTooltip = `Base: ${this.formatNumber(game.caps.braindead)} x Brain Size: ${game.brainSize}`;
      html += `<div class="res-item" onmouseenter="game.ui.showTooltip('${bdTooltip}')" onmouseleave="game.ui.hideTooltip()">Braindead: <span class="res-val">${this.formatNumber(res.braindead)}</span>`;
      if (res.braindead >= caps.braindead) {
        html += `<span class="res-capped">(MAX)</span>`;
      } else if (bdRate > 0) {
        html += `<span class="res-rate">(+${bdRate.toFixed(1)}/s)</span>`;
      }
      html += `</div>`;
    }

    // Ideas (Show if we have any, or if we have production, or if research is unlocked)
    if (res.ideas > 0 || game.production.ideas > 0 || game.tabUnlocks.research) {
      html += `<div class="res-item">Ideas: <span class="res-val">${res.ideas.toFixed(2)}</span>`;
      if (res.ideas >= caps.ideas.hard) {
        html += `<span class="res-capped">(MAX)</span>`;
      } else if (ideasRate > 0) {
        html += `<span class="res-rate">(+${ideasRate.toFixed(2)}/s)</span>`;
      }
      // Show softcap warning if above soft cap but below hard cap
      if (res.ideas > caps.ideas.soft && res.ideas < caps.ideas.hard) {
        html += `<span class="res-softcapped">[SOFTCAPPED at ${caps.ideas.soft.toFixed(0)}]</span>`;
      }
      html += `</div>`;
    }

    // Decimal place manipulation
    if (res.immunity < 100) html += `<div class="res-item">Immunity: <span class="res-val">${this.formatNumber(res.immunity)}</span></div>`;

    // Currency (Show if we have any, or if jobs are unlocked)
    if (res.currency > 0 || game.tabUnlocks.jobs) {
      html += `<div class="res-item">Currency: <span class="res-val">${res.currency.toFixed(2)}</span></div>`;
    }

    if (this.lastResourceHTML !== html) {
      this.elements.resourceStrip.innerHTML = html;
      this.lastResourceHTML = html;
    }
  }

  hasNotifications(view, game) {
    if (view === 'upgrades') {
      return Object.values(game.upgrades).some(u => u.newlyUnlocked);
    }
    if (view === 'research') {
      return Object.values(game.research).some(r => r.newlyUnlocked);
    }
    if (view === 'vaccines') {
      return Object.values(game.vaccines).some(v => v.newlyUnlocked);
    }
    return false;
  }

  updateNav(game) {
    if (this.elements.navStrip.style.display === 'none') return;

    const views = ['main'];
    if (game.tabUnlocks.upgrades) views.push('upgrades');
    if (game.tabUnlocks.research) views.push('research');
    if (game.tabUnlocks.vaccines) views.push('vaccines');
    if (game.tabUnlocks.jobs) views.push('jobs');
    if (game.tabUnlocks.business) views.push('business');

    // Always add settings
    views.push('settings');

    // Helper to get existing link
    const getLink = (view) => this.elements.navStrip.querySelector(`[data-view="${view}"]`);

    // 1. Add new views
    views.forEach(view => {
      let link = getLink(view);
      if (!link) {
        link = document.createElement('a');
        link.href = "#";
        link.className = 'nav-link';
        link.dataset.view = view;
        link.textContent = `[ ${view.toUpperCase()} ]`;
        link.onclick = (e) => {
          e.preventDefault();
          this.game.ui.switchView(view);
        };

        // Add fade-in animation for new items
        link.style.animation = 'fadeIn 2s ease forwards';

        // Insert in correct order? 
        // Simple append works if views are always added in order or at end.
        // But 'settings' is always last. 
        // If we unlock 'upgrades' (index 1), and 'settings' (index 2) exists...
        // We need to insertBefore.

        // Find the next view in the list that already exists
        const myIndex = views.indexOf(view);
        let nextSibling = null;
        for (let i = myIndex + 1; i < views.length; i++) {
          const nextView = views[i];
          const nextLink = getLink(nextView);
          if (nextLink) {
            nextSibling = nextLink;
            break;
          }
        }

        if (nextSibling) {
          this.elements.navStrip.insertBefore(link, nextSibling);
        } else {
          this.elements.navStrip.appendChild(link);
        }
      }

      // 2. Update State (Active / Notify)
      const isActive = this.currentView === view;
      const hasNotify = this.hasNotifications(view, game);

      if (isActive && !link.classList.contains('active')) link.classList.add('active');
      if (!isActive && link.classList.contains('active')) link.classList.remove('active');

      if (hasNotify && !link.classList.contains('nav-notify')) link.classList.add('nav-notify');
      if (!hasNotify && link.classList.contains('nav-notify')) link.classList.remove('nav-notify');
    });

    // 3. Remove old views (if re-locking is possible, though unlikely)
    Array.from(this.elements.navStrip.children).forEach(child => {
      if (child.tagName === 'A' && !views.includes(child.dataset.view)) {
        this.elements.navStrip.removeChild(child);
      }
    });
  }

  switchView(view) {
    this.currentView = view;

    // Clear notifications for this view
    if (view === 'upgrades') {
      Object.values(this.game.upgrades).forEach(u => u.newlyUnlocked = false);
    } else if (view === 'research') {
      Object.values(this.game.research).forEach(r => r.newlyUnlocked = false);
    } else if (view === 'vaccines') {
      Object.values(this.game.vaccines).forEach(v => v.newlyUnlocked = false);
    }

    this.update(this.game); // Immediate update
  }

  updateControls(game) {
    const container = this.elements.controlsArea;
    let html = '';

    if (this.currentView === 'main') {
      // Main view
    } else if (this.currentView === 'upgrades') {
      html = this.getUpgradesHTML(game);
    } else if (this.currentView === 'research') {
      html = this.getResearchHTML(game);
    } else if (this.currentView === 'vaccines') {
      html = this.getVaccinesHTML(game);
    } else if (this.currentView === 'jobs') {
      html = this.getJobsHTML(game);
    } else if (this.currentView === 'business') {
      html = this.getBusinessHTML(game);
    } else if (this.currentView === 'settings') {
      html = game.settings.getHTML();
    }

    if (this.lastControlsHTML !== html) {
      container.innerHTML = html;
      this.lastControlsHTML = html;
    }
  }

  getUpgradesHTML(game) {
    let html = '';

    // Check for Biomatter Lab Unlock
    const biomatterUnlocked = game.research.studyBiomatter && game.research.studyBiomatter.purchased;

    if (biomatterUnlocked) {
      // Render Subtabs
      const activeGeneral = game.currentUpgradeTab === 'general' ? 'active' : '';
      const activeBio = game.currentUpgradeTab === 'biomatter' ? 'active' : '';

      html += `
            <div class="sub-tab-container">
                <button class="sub-tab-btn ${activeGeneral}" onclick="game.ui.switchUpgradeTab('general')">General</button>
                <div style="color: var(--dim-text);">|</div>
                <button class="sub-tab-btn ${activeBio}" onclick="game.ui.switchUpgradeTab('biomatter')">Biomatter Lab</button>
            </div>
            `;
    }

    Object.values(game.upgrades).forEach(u => {
      if (!u.visible) return;

      // Filter based on tab
      const type = u.type || 'general';
      if (biomatterUnlocked) {
        if (game.currentUpgradeTab !== type) return;
      } else {
        // If not unlocked, only show general (or everything if we want, but 'biomatter' type implies hidden-ish until unlock? 
        // Actually, existing logic hides them via 'visible' anyway until unlockCondition met.
        // But for organization, if biomatter IS unlocked, we strict filter.
        // If NOT unlocked, we just show whatever is visible (which theoretically shouldn't include biomatter ones if their unlock condition requires the research).
        // Wait, their unlock condition IS the research. So they won't be visible unless unlocked. 
        // So this filter is safe.
      }

      const cost = game.upgradeManager.getCost(u);
      const canAfford = game.resources[u.currency] >= cost;
      const disabled = canAfford ? '' : 'disabled';

      // Only show orange on FIRST purchase
      const progressionClass = (u.progressionRequired && u.count === 0) ? 'progression-required' : '';

      let text = `buy ${u.name.toLowerCase()} (${Math.floor(cost)} ${u.currency === 'braindead' ? 'bd' : (u.currency === 'ideas' ? 'id' : 'curr')})`;
      if (u.count > 0) text += ` [owned: ${u.count}]`;

      // Escape description for attribute
      const desc = u.description.replace(/'/g, "&apos;");

      html += `
            <button class="cmd-btn ${progressionClass}" ${disabled}
                onclick="game.buyUpgrade('${u.id}')"
                onmouseenter="game.ui.showTooltip('${desc}')"
                onmouseleave="game.ui.hideTooltip()"
            >${text}</button>`;
    });
    return html;
  }

  getResearchHTML(game) {
    let html = '';
    const availableResearch = Object.values(game.research).filter(r => {
      if (r.purchased) return false; // Hide purchased
      if (r.visible) return true;
      return false;
    });

    if (availableResearch.length === 0) {
      html += `<div style="color: var(--dim-text);">No research available.</div>`;
    } else {
      availableResearch.forEach(r => {
        const canAfford = game.resources[r.currency] >= r.cost;
        const prereqMet = !r.prereq || game.research[r.prereq].purchased;
        const disabled = (!canAfford || !prereqMet) ? 'disabled' : '';

        let text = `research ${r.name.toLowerCase()} (${r.cost} ${r.currency})`;

        const desc = r.description.replace(/'/g, "&apos;");

        html += `
                <button class="cmd-btn" ${disabled} 
                    onclick="game.buyResearch('${r.id}')"
                    onmouseenter="game.ui.showTooltip('${desc}')"
                    onmouseleave="game.ui.hideTooltip()"
                >${text}</button>`;
      });
    }
    return html;
  }

  getVaccinesHTML(game) {
    let html = '';
    const availableVaccines = Object.values(game.vaccines).filter(v => {
      if (v.purchased) return false; // Hide purchased
      if (v.visible) return true;
      return false;
    });

    if (availableVaccines.length === 0) {
      html += `<div style="color: var(--dim-text);">No vaccines available.</div>`;
    } else {
      availableVaccines.forEach(v => {
        const canAfford = game.resources[v.currency] >= v.cost;
        const prereqMet = !v.prereq || game.vaccines[v.prereq].purchased;
        const disabled = (!canAfford || !prereqMet) ? 'disabled' : '';

        let text = `buy ${v.name.toLowerCase()} (${v.cost} ${v.currency})`;

        const desc = v.description.replace(/'/g, "&apos;");

        html += `
                <button class="cmd-btn" ${disabled} 
                    onclick="game.buyVaccine('${v.id}')"
                    onmouseenter="game.ui.showTooltip('${desc}')"
                    onmouseleave="game.ui.hideTooltip()"
                >${text}</button>`;
      });
    }
    return html;
  }

  getJobsHTML(game) {
    let html = '';
    // Job Info
    const job = game.jobs[game.currentJob];
    const stats = game.jobStats;

    html += `<div style="margin-button: 15px; color: #888;">
      <div>Current Job: <span style="color: var(--text-color);">${job.name}</span> (Salary: $${job.salary})</div>
      <div>Successful Works: ${stats.successfulWorks} | Total Earned: $${stats.totalEarned.toFixed(2)}</div>
    </div>`;
    html += `<div style="margin-bottom: 10px; color: #888;">Current Job: ${job.name} (Salary: ${job.salary})</div>`;

    // Actions
    const cooldown = game.jobCooldown > 0;
    const btnText = cooldown ? `resting... (${Math.ceil(game.jobCooldown)})` : `work shift`;
    const disabled = cooldown ? 'disabled' : '';

    html += `<button class="cmd-btn" ${disabled} onclick="game.work()">${btnText}</button>`;

    const autoText = stats.autoWorkEnabled ? 'disable auto-work' : 'enable auto-work (50% pay)';
    const autoClass = stats.autoWorkEnabled ? 'style="color: #88ff88;"' : '';
    html += `<button class="cmd-btn" $autoClass} onclick ="game.jobManager.toggleAutowork()">${autoText}</button>`;

    html += `<div style="margin-top: 20px; border-top: 1px solid var(--dimm-text); padding-top: 15px;">`;
    html += `<div style="color: #888; marign-bottom: 10px;">Available Jobs:</div>`;

    const availbleJobs = game.jobManager.getAvailableJobs();
    availbleJobs.foreaceh(j => {
      const isCurrentJob = j.id === game.currentJob;
      const jobClass = isCurrentJob ? 'style="color: #88ff88:"' : '';
      const prefix = isCurrentJob ? '▶ ' : '';

      let reqText = '';
      if (j.reqWorks > 0 || j.reqCurrency > 0) {
        reqText = ` [req: ${j.reqWorks} works, $${j.reqCurrency}]`;
      }

      html += `<button class="cmd-btn" ${jobClass} onclick ="game.promote('${j.id}')">${prefix}${j.name.toLowerCase()} - $${j.salary}/shift${reqText}</button>`;
    });

    const allJobs = Object.values(game.jobs);
    const nextLocked = allJobs.find(j => !game.jobManager.canUnlockJob(j.id) && j.tier <= 4);
    if (nextLocked) {
      const worksNeeded = Math.max(0, nextLocked.reqWorks - stats.successfulWorks);
      const currencyNeeded = Math.max(0, nextLocked.reqCurrency - game.resources.currency);
      html += `<div style = "color: var(--dim-text); margin-top: 10px; font-size: 0.9em;">
          Next: ${nextLocked.name} (need ${worksNeeded} more works, $${currencyNeeded.toFixed(0)} more)
      </div>`;
    }

    html += `</div>`;
    return html;
  }

  getBusinessHTML(game) {
    let html = '';
    const city = game.cities[game.currentCity];
    const stats = game.businessStats;

    // City Info
    html += `<div style="margin-bottom: 15px; color: #888;">
            <div>Location: <span style="color: var(--text-color);">${city.name}</span> (Pop: ${city.population.toLocaleString()})</div>
            <div>Demand Multiplier: ${city.demandMultiplier}x | Total Revenue: $${stats.totalRevenue.toFixed(2)}</div>
        </div>`;

    // Owned Businesses
    if (game.ownedBusinesses.length > 0) {
      html += `<div style="border-bottom: 1px solid var(--dim-text); padding-bottom: 10px; margin-bottom: 10px;">`;
      html += `<div style="color: #888; margin-bottom: 10px;">Your Businesses:</div>`;

      game.ownedBusinesses.forEach((biz, idx) => {
        const types = game.businessManager.getBusinessTypes();
        const type = types[biz.type];
        const totalEmp = game.businessManager.getTotalEmployees(biz);

        html += `<div style="margin-bottom: 15px; padding: 10px; border: 1px solid var(--dim-text);">`;
        html += `<div style="color: var(--text-color); font-weight: bold;">${biz.name}</div>`;
        html += `<div style="color: #888; font-size: 0.9em;">Employees: ${totalEmp}/${city.hardCap} | Skill: ${biz.averageSkill.toFixed(2)}x</div>`;

        // Progress bars
        html += `<div style="display: flex; gap: 10px; margin: 5px 0;">`;
        html += `<div style="flex: 1;"><span style="color: #88ff88;">Prod:</span> ${Math.floor(biz.productionBar)}%</div>`;
        html += `<div style="flex: 1;"><span style="color: #8888ff;">Demand:</span> ${Math.floor(biz.demandBar)}%</div>`;
        html += `<div style="flex: 1;"><span style="color: #ffff88;">Stock:</span> ${Math.floor(biz.inventory)}</div>`;
        html += `</div>`;

        // Hire buttons
        const empCost = game.businessManager.getEmployeeCost(biz);
        const canHire = game.businessManager.canHire(biz, 'operations');
        html += `<div style="margin-top: 8px; font-size: 0.85em;">`;
        html += `<div style="color: #888;">Hire ($${empCost} each):</div>`;

        const empTypes = ['operations', 'logistics', 'marketing', 'sales', 'hr', 'management'];
        empTypes.forEach(et => {
          const count = biz.employees[et];
          const disabled = canHire ? '' : 'disabled';
          html += `<button class="cmd-btn" style="font-size: 0.8em; padding: 2px 6px;" ${disabled} onclick="game.businessManager.hire(game.ownedBusinesses[${idx}], '${et}')">${et.substr(0, 3)} (${count})</button> `;
        });
        html += `</div>`;

        html += `<div style="color: #888; margin-top: 5px;">Revenue: $${biz.totalRevenue.toFixed(2)}</div>`;
        html += `</div>`;
      });

      html += `</div>`;
    }

    // Available Businesses to Purchase
    html += `<div style="color: #888; margin-bottom: 10px;">Start a Business:</div>`;

    const availableTypes = game.businessManager.getAvailableBusinessTypes();
    if (availableTypes.length === 0) {
      html += `<div style="color: var(--dim-text);">No businesses available yet. Complete job research first.</div>`;
    } else {
      availableTypes.forEach(type => {
        const cost = game.businessManager.getBusinessCost(type.id);
        const canAfford = game.resources.currency >= cost;
        const disabled = canAfford ? '' : 'disabled';

        html += `<button class="cmd-btn" ${disabled} 
                    onclick="game.businessManager.createBusiness('${type.id}')"
                    onmouseenter="game.ui.showTooltip('${type.description}')"
                    onmouseleave="game.ui.hideTooltip()"
                >buy ${type.name.toLowerCase()} ($${cost.toLocaleString()})</button>`;
      });
    }

    return html;
  }
  // Settings methods moved to settings.js

  log(message, type = 'general') {
    const entry = document.createElement('div');
    entry.className = 'log-line new';
    entry.textContent = `> ${message}`;

    let targetDisplay = this.elements.logDisplay;

    if (type === 'upgrade' || type === 'unlock') {
      targetDisplay = this.elements.purchaseLogDisplay;

      // Notify if not on transactions tab
      if (this.currentLogTab !== 'transactions') {
        const tab = document.getElementById('tab-transactions');
        if (tab) tab.classList.add('has-new');
      }

      // Ensure Log Column is visible (if it wasn't already)
      const sysLog = document.getElementById('log-column');
      if (sysLog && getComputedStyle(sysLog).opacity === '0') {
        sysLog.style.opacity = '1';
        sysLog.classList.add('visible-content');
        sysLog.classList.add('visible-border');
      }
    }

    targetDisplay.appendChild(entry);

    // Cap at 50 entries
    while (targetDisplay.children.length > 50) {
      targetDisplay.removeChild(targetDisplay.firstChild);
    }

    targetDisplay.scrollTop = targetDisplay.scrollHeight;

    // Remove 'new' class after animation
    setTimeout(() => entry.classList.remove('new'), 500);
  }

  // Helper for game.js to call
  addLog(entry) {
    this.log(entry.message, entry.type);
  }

  hideAll() {
    // Reset to initial state
    this.elements.resourceStrip.style.display = 'none';
    this.elements.navStrip.style.display = 'none';
    this.elements.logColumn.style.opacity = '0'; // Ensure hidden
    this.elements.asciiArt.textContent = "";
  }

  playIntroSequence(onComplete) {
    this.log("Initializing...");
    setTimeout(() => {
      this.log("Subject: Kyle.");
      setTimeout(() => {
        this.log("Status: Dormant.");
        setTimeout(() => {
          this.log("Wake up.");
          // Reveal the brain
          this.revealBrain();
          if (onComplete) onComplete();
        }, 1500);
      }, 1500);
    }, 1500);
  }

  showTooltip(text) {
    if (!this.elements.tooltip) return;
    this.elements.tooltip.innerHTML = text;
    this.elements.tooltip.classList.add('visible');
  }

  hideTooltip() {
    if (!this.elements.tooltip) return;
    this.elements.tooltip.classList.remove('visible');
  }

  updateTooltipPosition(e) {
    if (!this.elements.tooltip || !this.elements.tooltip.classList.contains('visible')) return;

    const offset = 15;
    let left = e.clientX + offset;
    let top = e.clientY + offset;

    // Prevent going off screen
    const rect = this.elements.tooltip.getBoundingClientRect();
    if (left + rect.width > window.innerWidth) {
      left = e.clientX - rect.width - offset;
    }
    if (top + rect.height > window.innerHeight) {
      top = e.clientY - rect.height - offset;
    }

    this.elements.tooltip.style.left = `${left}px`;
    this.elements.tooltip.style.top = `${top}px`;
  }

  switchLogTab(tab) {
    this.currentLogTab = tab;

    // Toggle Display
    const sysDisplay = this.elements.logDisplay;
    const transDisplay = this.elements.purchaseLogDisplay;
    const sysTab = document.getElementById('tab-system');
    const transTab = document.getElementById('tab-transactions');

    if (tab === 'system') {
      sysDisplay.style.display = 'flex';
      transDisplay.style.display = 'none';
      sysTab.classList.add('active');
      transTab.classList.remove('active');
    } else {
      sysDisplay.style.display = 'none';
      transDisplay.style.display = 'flex';
      sysTab.classList.remove('active');
      transTab.classList.add('active');
      // Remove notification
      transTab.classList.remove('has-new');

      // Auto scroll to bottom when switching
      transDisplay.scrollTop = transDisplay.scrollHeight;
    }
  }
  switchUpgradeTab(tab) {
    this.game.currentUpgradeTab = tab;
    this.update(this.game);
  }
}
