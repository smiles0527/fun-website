(function() {
    // 1. CSS Injection
    const style = document.createElement('style');
    style.innerHTML = `
        #troll-network-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.95); z-index: 10000;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-family: 'Courier New', monospace; color: #0f0;
        }
        #troll-network-feed {
            position: fixed; bottom: 10px; right: 10px; width: 300px; height: 150px;
            background: rgba(0,0,0,0.8); border: 1px solid #0f0;
            color: #0f0; font-family: monospace; font-size: 12px;
            z-index: 9999; overflow: hidden; display: flex; flex-direction: column;
            pointer-events: none;
        }
        .feed-header {
            background: #0f0; color: black; padding: 2px 5px; font-weight: bold;
            display: flex; justify-content: space-between;
        }
        .feed-content {
            padding: 5px; overflow-y: hidden; flex: 1; display: flex; flex-direction: column; justify-content: flex-end;
        }
        .feed-item {
            margin-bottom: 2px; opacity: 0; animation: fadeIn 0.3s forwards;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        @keyframes fadeIn { to { opacity: 1; } }
        .tn-input {
            background: black; border: 2px solid #0f0; color: #0f0; padding: 10px;
            font-size: 20px; font-family: monospace; outline: none; text-align: center;
            margin-bottom: 20px;
        }
        .tn-btn {
            background: #0f0; color: black; border: none; padding: 10px 30px;
            font-size: 18px; font-weight: bold; cursor: pointer; font-family: monospace;
        }
        .tn-btn:hover { background: white; }
    `;
    document.head.appendChild(style);

    // 2. State
    let username = localStorage.getItem('trollUsername');
    const fakeUsers = ["xX_Dragon_Xx", "NoobMaster69", "Guest_123", "TrollFace", "RickRoller", "Hackerman", "SysAdmin", "Karen", "Bot_9000", "Mom"];
    const activities = [
        "fell for the Free Money trap",
        "is still waiting for the page to load",
        "tried to download RAM",
        "is arguing with the Chat Support",
        "scored -50 on IQ Test",
        "is stuck in the Infinite Scroll",
        "clicked the unclickable button",
        "is reading the Terms of Service",
        "got insulted by the Ugly Meter",
        "is shaking their mouse for Battery"
    ];

    // 3. Login Overlay
    if (!username && !window.location.pathname.includes('login.html')) {
        const overlay = document.createElement('div');
        overlay.id = 'troll-network-overlay';
        overlay.innerHTML = `
            <h1>ACCESS RESTRICTED</h1>
            <p>IDENTIFICATION REQUIRED</p>
            <input type="text" class="tn-input" placeholder="ENTER ALIAS" maxlength="15">
            <button class="tn-btn">CONNECT</button>
        `;
        document.body.appendChild(overlay);

        const input = overlay.querySelector('input');
        const btn = overlay.querySelector('button');

        const login = () => {
            if (input.value.trim()) {
                username = input.value.trim();
                localStorage.setItem('trollUsername', username);
                overlay.remove();
                initFeed();
                broadcast(`${username} has joined the chaos`);
            }
        };

        btn.onclick = login;
        input.onkeypress = (e) => { if(e.key === 'Enter') login(); };
    } else {
        initFeed();
    }

    // 4. Live Feed
    let feedContent;
    
    function initFeed() {
        const feed = document.createElement('div');
        feed.id = 'troll-network-feed';
        feed.innerHTML = `
            <div class="feed-header">
                <span>LIVE ACTIVITY</span>
                <span>● ON</span>
            </div>
            <div class="feed-content" id="feed-items"></div>
        `;
        document.body.appendChild(feed);
        feedContent = document.getElementById('feed-items');
        
        // Start fake traffic
        setInterval(() => {
            if (Math.random() > 0.6) {
                const user = fakeUsers[Math.floor(Math.random() * fakeUsers.length)];
                const act = activities[Math.floor(Math.random() * activities.length)];
                addLog(user, act);
            }
        }, 2000);
    }

    function addLog(user, action) {
        if (!feedContent) return;
        const div = document.createElement('div');
        div.className = 'feed-item';
        div.innerHTML = `<span style="color: #00ff00">&gt;</span> <b>${user}</b> ${action}`;
        feedContent.appendChild(div);
        
        if (feedContent.children.length > 6) {
            feedContent.removeChild(feedContent.firstChild);
        }
    }

    function broadcast(msg) {
        // Send to "server" (local simulation)
        setTimeout(() => addLog(username, msg), 100);
    }

    // 5. Expose API
    window.TrollNetwork = {
        log: function(action) {
            if (username) broadcast(action);
        },
        getUser: function() {
            return username || "Anonymous";
        }
    };

})();

