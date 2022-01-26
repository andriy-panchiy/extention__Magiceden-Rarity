if (document.readyState == 'complete') {
    MainScript();
} else {
    window.addEventListener("load", MainScript, false);
}

function addJS_Node(text, s_URL, funcToRun, runOnLoad) {
    var D = document;
    var scriptNode = D.createElement('script');
    if (runOnLoad) {
        scriptNode.addEventListener("load", runOnLoad, false);
    }
    scriptNode.type = "text/javascript";
    if (text) scriptNode.textContent = text;
    if (s_URL) scriptNode.src = s_URL;
    if (funcToRun) scriptNode.textContent = '(' + funcToRun.toString() + ')()';

    var targ = D.getElementsByTagName('head')[0] || D.body || D.documentElement;
    targ.appendChild(scriptNode);
}

localStorage.extensionID = chrome.runtime.id;

window.addEventListener('message', function(e) {
    if (e.data.type == 'loadInfo') {
        chrome.runtime.sendMessage(chrome.runtime.id, {
            type: "loadInfo",
            short_name: e.data.short_name
        }, function(body) {
            window.postMessage({
                type: 'loadInfo_loaded',
                body: body
            }, '*');
        });
    }
});

function MainScript() {
    function init() {
        func = {
            init: async function() {
                let self = this;
                if (!self.url || self.url != window.location.href && (self.isDetails() || self.isMarketplace())) {
                    self.collection = await self.getCollection();
                    self.base = await self.loadBase(self.collection);
                    self.MythicPercsMAX = self.getMythicPercsMax();
                    setInterval(() => { self.buildRares() }, 200);
                }
                self.url = window.location.href;
            },
            getMythicPercsMax: function() {
                let self = this;
                if (!self.base) return;
                let Mythic = self.base.filter(mint => mint.rank < self.base.length / 100 * 1);
                let MythicValuePerc = Mythic.map(r => r.rank_explain[0].value_perc).sort();
                return MythicValuePerc[MythicValuePerc.length - 1];
            },
            getCollection: async function(){
                let self = this;
                if (self.isDetails()) {
                    let res = await fetch('https://api-mainnet.magiceden.io/rpc/getNFTByMintAddress/' + self.getMintFromUrl(window.location.href)).then((response) => response.json());
                    return await res.results.collectionName;
                }
                return self.getMintFromUrl(window.location.href);
            },
            loadBase: async function(collection){
                let self = this;
                if (!collection) return;
                window.postMessage({ type: 'loadInfo', short_name: collection }, '*');
                return await new Promise((resolve, reject) => {
                    window.addEventListener('message', function(e) {
                        if (e.data.type === 'loadInfo_loaded'){
                            resolve(e.data.body.mints);
                        }
                    });
                });
            },
            buildRares: function(){
                let self = this;
                if (!self.base) return;
                if (self.isMarketplace()) {
                    document.querySelectorAll(".grid-card__main").forEach(item => {
                        let href = item.querySelector("a")?.href;
                        if (href) {
                            let info = self.getInfoFromMint(self.getMintFromUrl(href));
                            self.addOptions(info, item);
                        }
                    });
                }
                if (self.isDetails()) {
                    let info = self.getInfoFromMint(self.getMintFromUrl(window.location.href));
                    self.addOptions(info, document.querySelector(".item-thumb"));
                }
            },
            addOptions: function(info, item){
                let self = this;
                if (item && !item.querySelector(".options") && info?.rank) {
                    let options = document.createElement("a");
                    let rarity = self.getRarity(info.rank, self.base.length);
                    let rank_explain = 0;
                    options.classList.add("options", rarity);
                    options.innerHTML = `<span class="rarity">${rarity}</span><span class="rank">#${info.rank}</span>`
                    info.rank_explain.filter(explain => explain.value_perc <= self.MythicPercsMAX).forEach(explain => {
                        options.innerHTML += `<span class="explain">${explain.attribute}: ${explain.value || '∅'}</span>`
                        rank_explain++;
                    });
                    item.appendChild(options);
                    item.dataset.rarity = rarity;
                    item.dataset.rank_explain = rank_explain;
                }
            },
            getRarity: function(rank, total){
                let Rare = total / 100 * 35,
                    Epic = total / 100 * 15,
                    Legendary = total / 100 * 5,
                    Mythic = total / 100 * 1,
                    Uncommon = total - Rare - Epic - Legendary - Mythic;
                if (Mythic >= rank) return "Mythic"
                if (Legendary >= rank && rank > Mythic) return "Legendary"
                if (Epic >= rank && rank > Legendary) return "Epic"
                if (Rare >= rank && rank > Epic) return "Rare"
                if (Uncommon >= rank && rank > Rare) return "Uncommon"
                return "Common"
            },
            getMintFromUrl: function(link){
                return link.split("/")[link.split("/").length - 1];
            },
            getInfoFromMint: function(mint){
                let self = this;
                return self.base.filter(item => item.mint == mint)[0];
            },
            isMarketplace: function() {
                return /^\/(marketplace)/.test(window.location.pathname);
            },
            isDetails: function() {
                return /^\/(item-details)/.test(window.location.pathname);
            },
        }
        func.init();
        setInterval(async () => {
            func.init();
        }, 200);
    }
    addJS_Node(init);
    addJS_Node("init();");
}