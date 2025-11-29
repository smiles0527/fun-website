(function() {
    // 1. CSS Injection
    const style = document.createElement('style');
    style.innerHTML = `
        #troll-network-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255,255,255,0.8); z-index: 10000;
            display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 15vh;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #333;
            backdrop-filter: blur(10px);
        }
        .tn-modal {
            background: white;
            border: none;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
            border-radius: 20px;
            max-width: 400px;
            width: 90%;
        }
        #troll-network-feed {
            position: fixed; bottom: 20px; right: 20px; width: 320px; height: auto; max-height: 200px;
            background: rgba(255,255,255,0.9); border: none;
            color: #333; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px;
            z-index: 9999; overflow: hidden; display: flex; flex-direction: column;
            pointer-events: none;
            border-radius: 12px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .feed-header {
            background: #fff; color: #888; padding: 10px 15px; font-weight: 600; font-size: 11px; letter-spacing: 1px;
            display: flex; justify-content: space-between; border-bottom: 1px solid #eee;
            text-transform: uppercase;
        }
        .feed-content {
            padding: 10px 15px; overflow-y: hidden; flex: 1; display: flex; flex-direction: column; justify-content: flex-end;
        }
        .feed-item {
            margin-bottom: 6px; opacity: 0; animation: fadeIn 0.3s forwards;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            color: #444;
        }
        .feed-item b { color: #000; font-weight: 600; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .tn-input {
            background: #f5f7fa; border: 2px solid transparent; color: #333; padding: 15px;
            font-size: 16px; font-family: inherit; outline: none; text-align: center;
            margin-bottom: 20px; border-radius: 12px; width: 100%; box-sizing: border-box;
            transition: all 0.2s;
        }
        .tn-input:focus { background: white; border-color: #6c5ce7; box-shadow: 0 0 0 4px rgba(108, 92, 231, 0.1); }
        .tn-btn {
            background: #6c5ce7; color: white; border: none; padding: 12px 25px;
            font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit;
            border-radius: 10px; transition: all 0.2s; box-shadow: 0 4px 10px rgba(108, 92, 231, 0.3);
        }
        .tn-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(108, 92, 231, 0.4); }
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
    // Only show if no username is saved
    if (!username) {
        const overlay = document.createElement('div');
        overlay.id = 'troll-network-overlay';
        overlay.innerHTML = `
            <div class="tn-modal">
                <h1 style="margin-top:0; font-size: 24px; margin-bottom: 10px;">Access Trollverse</h1>
                <p style="color:#666; margin-bottom: 25px; font-size: 14px;">Please identify yourself to proceed.</p>
                <input type="text" class="tn-input" placeholder="Enter Username" maxlength="15">
                <br>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="tn-btn" id="tn-login">Connect</button>
                    <button class="tn-btn" id="tn-guest" style="background:#e0e0e0; color:#555; box-shadow:none;">Guest</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = overlay.querySelector('input');
        const btnLogin = overlay.querySelector('#tn-login');
        const btnGuest = overlay.querySelector('#tn-guest');

        const setSession = (name) => {
            username = name;
            try {
                localStorage.setItem('trollUsername', username);
            } catch(e) {
                console.error("Storage failed", e);
            }
            overlay.remove();
            initFeed();
            broadcast(`${username} has joined the chaos`);
        };

        const login = () => {
            const val = input.value.trim();
            if (val) setSession(val);
        };

        const guest = () => {
            setSession("Anonymous");
        };

        btnLogin.onclick = login;
        btnGuest.onclick = guest;
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
        div.innerHTML = `<span style="color: #6c5ce7; font-weight:bold;">●</span> <b>${user}</b> ${action}`;
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

