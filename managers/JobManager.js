class JobManager {
  constructor(game) {
    this.game = game;
    this.minigame = null;
  }

  init() {
    this.game.jobs = getInitialJobs();
    this.game.currentJob = 'intern';
    this.game.jobCooldown = 0;
    this.game.jobStats = this.game.jobStats || {
      successfulWorks: 0,
      totalWorks: 0,
      totalEarned: 0,
      autoWorkEnabled: false
    };
  }

  work() {
    if (this.game.jobCooldown > 0) return;

    // Start the minigame
    if (!this.minigame) {
      this.minigame = new PushSquareMinigame(this.game, this);
    }
    this.minigame.start();
  }

  autowork() {
    if (this.game.jobCooldown > 0) return;

    const job = this.game.jobs[this.game.currentJob];
    const earnings = job.salary * 0.1; //50% efficiency for autowork?

    this.game.resouces.currency += earnings;
    this.gamejobStats.successfulWorks++;
    this.game.jobStats.totalWorks++;
    this.game.jobStats.totalEarned += earnings;

    this.game.jobCooldown = job.cooldown || 5;
    this.game.log(`Auto-work complete! +${earnings.toFixed(2)} currency`, "upgrade");

    // Suspicion check  
    if (Math.random() * 100 < job.suspicionRate) {
      this.game.log("You were fired for suspicious behaviour!", "warning");
      this.game.currentJob = 'intern';
      this.game.resouurces.suspicion = 0;
    }
    this.game.updateUI();
  }

  toggleAutoWork() {
    this.game.jobStats.autoWorkEnabled = !this.game.jobStats.autoWorkEnabled;
    this.game.updateUI();
  }

  completeWork(success) {
    const job = this.game.jobs[this.game.currentJob];
    this.game.jobStats.totalWorks++;

    if (success) {
      this.game.resources.currency += job.salary;
      this.game.jobStats.successfulWorks++;
      this.game.jobStats.totalEarned += job.salary;
      this.game.log(`Work complete! +${job.salary} currency`, "upgrade");
    } else {
      this.game.log("Work failed. No payment.", "warning");
    }

    this.game.jobCooldown = job.cooldown || 5;

    // Suspicion check (only if successful)
    if (success && Math.random() * 100 < job.suspicionRate) {
      this.game.log("You were fired for suspicious behavior!", "warning");
      this.game.currentJob = 'intern';
      this.game.resources.suspicion = 0;
    }

    this.game.updateUI();
  }

  canUnlockJob(jobID) {
    const job = this.game.jobs[jobId];
    if (!job) return false;

    const hasWorks = this.game.jobStats.successfulWorks >= job.reqWorks;
    const hasCurrency = this.game.resouces.currency >= job.reqCurrenncy;
    const hasVaccine = !job.reqVaccine || (this.game.vaccines[job.reqVaccine] && this.game.vaccines[job.reqVaccine].purchased);

    return hasWorks && hasCurrency && hasVaccine;
  }

  getAvailableJobs() {
    return Object.values(this.game.jobs).filter(job => this.canUnlockJob(job.id));
  }

  steal() {
    if (this.game.jobCooldown > 0) return;

    const job = this.game.jobs[this.game.currentJob];
    this.game.resources.suspicion += 1;
    this.game.resources.currency += job.maxCurrency * 0.05;
    this.game.jobCooldown = 5;

    this.game.updateUI();
  }

  promote(jobId) {
    if (this.game.jobs[jobId]) {
      this.game.currentJob = jobId;
      this.game.updateUI();
    }
  }

  tick(dt) {
    if (this.game.jobCooldown > 0) {
      this.game.jobCooldown -= dt;
    }

    if (this.game.jobStats.autoWorkEnabled && this.game.jobCooldown <= 0) this.autoWork();
  }
}

// Push the Square Minigame
class PushSquareMinigame {
  constructor(game, jobManager) {
    this.game = game;
    this.jobManager = jobManager;
    this.active = false;
    this.gridSize = 5;
    this.timeLimit = 30; // 30 seconds
    this.moveLimit = 20; // 20 moves max
    this.initialized = false;
  }

  initializeDOM() {
    if (this.initialized) return;

    // Create minigame overlay
    const overlay = document.createElement('div');
    overlay.id = 'minigame-overlay';
    overlay.innerHTML = `
            <div id="minigame-container">
                <div id="minigame-header">
                    <div id="minigame-title">PUSH THE SQUARE</div>
                    <div id="minigame-stats">
                        <span id="moves-counter">Moves: 0/${this.moveLimit}</span>
                        <span id="time-counter">Time: ${this.timeLimit}s</span>
                    </div>
                </div>
                <div id="minigame-grid"></div>
                <div id="minigame-instructions">
                    Use WASD or Arrow Keys to move<br>
                    Push the box (■) to the target (◯)
                </div>
                <button id="minigame-quit" class="cmd-btn">Give Up</button>
            </div>
        `;
    document.body.appendChild(overlay);

    // Add event listener for quit button
    document.getElementById('minigame-quit').onclick = () => this.quit();

    this.initialized = true;
  }

  generateLevel() {
    // Generate a random puzzle
    this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));

    // Predefined level patterns for variety
    const levels = [
      // Level 1: Simple horizontal push
      { player: { x: 0, y: 2 }, box: { x: 1, y: 2 }, target: { x: 4, y: 2 } },
      // Level 2: L-shape path
      { player: { x: 0, y: 0 }, box: { x: 1, y: 0 }, target: { x: 4, y: 4 } },
      // Level 3: Diagonal-ish
      { player: { x: 0, y: 4 }, box: { x: 1, y: 3 }, target: { x: 3, y: 1 } },
      // Level 4: Center target
      { player: { x: 0, y: 2 }, box: { x: 1, y: 2 }, target: { x: 2, y: 2 } },
      // Level 5: Corner to corner
      { player: { x: 0, y: 0 }, box: { x: 0, y: 1 }, target: { x: 4, y: 4 } },
      // Level 6: Vertical push
      { player: { x: 2, y: 0 }, box: { x: 2, y: 1 }, target: { x: 2, y: 4 } },
    ];

    const level = levels[Math.floor(Math.random() * levels.length)];
    this.playerPos = { ...level.player };
    this.boxPos = { ...level.box };
    this.targetPos = { ...level.target };

    this.moves = 0;
    this.timeRemaining = this.timeLimit;
  }

  start() {
    this.initializeDOM();
    this.active = true;
    this.generateLevel();
    this.render();

    const overlay = document.getElementById('minigame-overlay');
    overlay.style.display = 'flex';

    // Add keyboard listener
    this.keyHandler = (e) => this.handleKey(e);
    document.addEventListener('keydown', this.keyHandler);

    // Start timer
    this.timerInterval = setInterval(() => {
      this.timeRemaining -= 0.1;
      if (this.timeRemaining <= 0) {
        this.fail();
      }
      this.updateStats();
    }, 100);
  }

  handleKey(e) {
    if (!this.active) return;

    let dx = 0, dy = 0;

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      dy = -1;
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      dy = 1;
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      dx = -1;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      dx = 1;
    } else {
      return;
    }

    e.preventDefault();
    this.move(dx, dy);
  }

  move(dx, dy) {
    const newX = this.playerPos.x + dx;
    const newY = this.playerPos.y + dy;

    // Check bounds
    if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
      return;
    }

    // Check if moving into box
    if (newX === this.boxPos.x && newY === this.boxPos.y) {
      // Try to push box
      const boxNewX = this.boxPos.x + dx;
      const boxNewY = this.boxPos.y + dy;

      // Check if box can be pushed
      if (boxNewX < 0 || boxNewX >= this.gridSize || boxNewY < 0 || boxNewY >= this.gridSize) {
        return; // Can't push box out of bounds
      }

      // Push box
      this.boxPos.x = boxNewX;
      this.boxPos.y = boxNewY;
    }

    // Move player
    this.playerPos.x = newX;
    this.playerPos.y = newY;
    this.moves++;

    // Check win condition
    if (this.boxPos.x === this.targetPos.x && this.boxPos.y === this.targetPos.y) {
      this.win();
      return;
    }

    // Check move limit
    if (this.moves >= this.moveLimit) {
      this.fail();
      return;
    }

    this.render();
    this.updateStats();
  }

  render() {
    const grid = document.getElementById('minigame-grid');
    grid.innerHTML = '';

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = document.createElement('div');
        cell.className = 'minigame-cell';

        // Check what's in this cell
        if (x === this.playerPos.x && y === this.playerPos.y) {
          cell.textContent = '☺';
          cell.classList.add('player');
        } else if (x === this.boxPos.x && y === this.boxPos.y) {
          cell.textContent = '■';
          cell.classList.add('box');
          if (x === this.targetPos.x && y === this.targetPos.y) {
            cell.classList.add('on-target');
          }
        } else if (x === this.targetPos.x && y === this.targetPos.y) {
          cell.textContent = '◯';
          cell.classList.add('target');
        }

        grid.appendChild(cell);
      }
    }
  }

  updateStats() {
    document.getElementById('moves-counter').textContent = `Moves: ${this.moves}/${this.moveLimit}`;
    document.getElementById('time-counter').textContent = `Time: ${Math.ceil(this.timeRemaining)}s`;
  }

  win() {
    // Show success message
    const container = document.getElementById('minigame-container');
    const overlay = document.getElementById('minigame-overlay');

    container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 2em; color: #4CAF50; margin-bottom: 20px;">SUCCESS!</div>
                <div style="color: var(--dim-text);">You completed the task!</div>
            </div>
        `;

    setTimeout(() => {
      this.cleanup();
      this.jobManager.completeWork(true);
    }, 1500);
  }

  fail() {
    // Show failure message
    const container = document.getElementById('minigame-container');
    const overlay = document.getElementById('minigame-overlay');

    container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 2em; color: #ff4444; margin-bottom: 20px;">FAILED</div>
                <div style="color: var(--dim-text);">Out of ${this.moves >= this.moveLimit ? 'moves' : 'time'}!</div>
            </div>
        `;

    setTimeout(() => {
      this.cleanup();
      this.jobManager.completeWork(false);
    }, 1500);
  }

  quit() {
    this.cleanup();
    this.jobManager.completeWork(false);
  }

  cleanup() {
    this.active = false;
    document.getElementById('minigame-overlay').style.display = 'none';
    document.removeEventListener('keydown', this.keyHandler);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
