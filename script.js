// ==========================================
// ★ 遊戲狀態管理與進度讀取
// ==========================================
const savedLevel = localStorage.getItem('unlockLostArtLevel');
const initialLevel = savedLevel ? parseInt(savedLevel) : 1;
const savedNotebook = localStorage.getItem('unlockLostArtNotebook');
const initialNotebook = savedNotebook ? JSON.parse(savedNotebook) : [];
const savedInventory = localStorage.getItem('unlockLostArtInventory');
const initialInventory = savedInventory ? JSON.parse(savedInventory) : [];
const savedTime = localStorage.getItem('unlockLostArtTime');
const initialTime = savedTime ? parseInt(savedTime) : 3600; // 預設 60 分鐘
const savedHints = localStorage.getItem('unlockLostArtHints');
const initialHints = savedHints ? JSON.parse(savedHints) : {}; 

const state = {
    notebook: initialNotebook,
    inventory: initialInventory,
    unlockedHints: initialHints,
    currentDialogSeq: [],
    dialogIndex: 0,
    isTyping: false,
    typingTimeout: null,
    inspectingItem: null,
    sceneHistory: [],
    currentScene: 'scene-home',
    unlockedLevel: initialLevel,
    timeRemaining: initialTime,
    timerInterval: null,
    sourceModal: null,
    onDialogEnd: null
};

// ==========================================
// ★ 對話重點關鍵字高亮 & 物品章節分類工具
// ==========================================
const highlightKeywords = [
    '艋舺第一花魁', '我們的竹東', '蕃仔酒矸', '劍樓書塾', '赤城花榜', '艋舺花魁',
    '王罔市', '董阿治', '董仔治', '王子鶴', '趙一山', 
    '朝鮮樓', '藝旦間', '壓煙盤', '飲墨水', '寶美樓', '藝旦戲', '連雅堂',
    '羅秀惠', '謝介石', '鄭肇基', '咖啡店', '多那之咖啡廳', '江山樓', 
   '二次會', '酌婦', '遊廓', '鑑札', '檢番', '藝閣', '連橫',
    '女給', '藝旦', '藝妲', '藝娼', '咖啡廳','女給','南管'
].sort((a, b) => b.length - a.length);

function getHighlightedTextHTML(text) {
    const escaped = highlightKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'g');
    return text.replace(/\n/g, '<br>').replace(
        regex,
        '<span class="font-black text-amber-300 underline decoration-amber-500/70 underline-offset-4">$1</span>'
    );
}

function buildHighlightCharTokens(text) {
    const tokens = [];
    let i = 0;
    while (i < text.length) {
        let matched = null;
        for (const kw of highlightKeywords) {
            if (text.startsWith(kw, i)) {
                matched = kw;
                break;
            }
        }
        if (matched) {
            for (const ch of matched) tokens.push({ ch, hl: true });
            i += matched.length;
        } else {
            tokens.push({ ch: text[i], hl: false });
            i++;
        }
    }
    return tokens;
}

function hasCollected(name) {
    return !!(
        state.notebook.find(i => i.name === name) ||
        state.inventory.find(i => i.name === name)
    );
}

function getItemChapter(name) {
    if (name.includes('2018舊照片')) return '序章：時空交錯';
    if (['連雅堂', '羅秀惠', '謝介石', 'RU;_', 'G0_', 'X.6'].some(k => name.includes(k))) {
        return '第一章：寶美樓';
    }
    if (['江山樓', '菜單', '菜色', '乞食', '殘缺史料', '屋上庭園', '宴會廳', '浴廁'].some(k => name.includes(k))) {
        return '第二章：江山樓';
    }
    if (['小調拳', '三國拳', '官話拳', '卡片1', '卡片2', '卡片3', '二進宮', '三娘教子', '祭江', '鑑札', '琵琶', '銅鏡', '名詞解釋冊', '藝旦小故事史料'].some(k => name.includes(k))) {
        return '第三章：藝旦間';
    
    }
    return '其他資料';
}

// ==========================================
// ★ 音樂與音效控制系統
// ==========================================
let isMusicPlaying = false;
let hasUserInteracted = false; 

function playBgMusic() {
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic && !isMusicPlaying) {
        bgMusic.volume = 0.2;
        bgMusic.play().then(() => {
            isMusicPlaying = true;
            const icon = document.getElementById('music-icon');
            if (icon) icon.className = 'fas fa-volume-up';
        }).catch(err => {
            console.warn("自動播放遭瀏覽器攔截，需等待使用者互動", err);
        });
    }
}

function toggleMusic() {
    const bgMusic = document.getElementById('bg-music');
    const icon = document.getElementById('music-icon');
    
    if (isMusicPlaying) {
        bgMusic.pause();
        isMusicPlaying = false;
        if (icon) icon.className = 'fas fa-volume-mute';
    } else {
        bgMusic.play();
        isMusicPlaying = true;
        if (icon) icon.className = 'fas fa-volume-up';
    }
}

function changeBGM(filename) {
    const bgMusic = document.getElementById('bg-music');
    if (!bgMusic) return;
    
    const currentSrc = bgMusic.currentSrc || bgMusic.src;
    if (!currentSrc.includes(encodeURIComponent(filename)) && !currentSrc.includes(filename)) {
        const wasPlaying = !bgMusic.paused && isMusicPlaying;
        bgMusic.src = filename;
        if (wasPlaying) {
            bgMusic.play().catch(e => console.warn(e));
        }
    }
}

function playSFX(id) {
    const sfx = document.getElementById(id);
    if (sfx) { 
        sfx.currentTime = 0; 
        if (id === 'sfx-tick' || id === 'sfx-warning60') {
            sfx.volume = 1.0; 
        } else {
            sfx.volume = 0.6; 
        }
        sfx.play().catch(() => {});
    }
}

function playTypewriter() {
    const sfx = document.getElementById('sfx-typewriter');
    if (sfx) {
        sfx.volume = 0.4;
        sfx.play().catch(()=>{});
    }
}

function stopTypewriter() {
    const sfx = document.getElementById('sfx-typewriter');
    if (sfx) {
        sfx.pause();
        sfx.currentTime = 0;
    }
}

document.addEventListener('click', (e) => {
    if (!hasUserInteracted) {
        hasUserInteracted = true;
        playBgMusic();
    }
}, { capture: true });

document.addEventListener('mousedown', (e) => {
    const isInteractive = e.target.closest('button, .interactable, .level-card, .passport-item, .bingo-interactable, .bingo-cell, .dish-btn, .tetris-piece, input, .dialog-text');
    if (isInteractive) {
        if (isInteractive.tagName === 'BUTTON' && isInteractive.disabled) return;
        playSFX('sfx-click');
    }
});

// ==========================================
// ★ 遊戲初始化
// ==========================================
window.onload = () => {
    buildDynamicUI(); 
    updateModals();
    playBgMusic();
};

// ==========================================
// ★ 遊戲雙路徑模式控制
// ==========================================
let isChapterSelectMode = false;

function startFullGame() {
    if (state.unlockedLevel > 1 || state.notebook.length > 0 || state.inventory.length > 0) {
        document.getElementById('path-selection').classList.add('hidden');
        document.getElementById('save-options').classList.remove('hidden');
        document.getElementById('save-options').classList.add('flex');
    } else {
        isChapterSelectMode = false;
      
        startLevel(1);
    }
}

function startChapterSelect() {
    isChapterSelectMode = true; 
    
    localStorage.removeItem('unlockLostArtNotebook');
    localStorage.removeItem('unlockLostArtInventory');
    localStorage.removeItem('unlockLostArtTime');
    localStorage.removeItem('unlockLostArtHints');
    localStorage.removeItem('unlockLostArtA1'); 
    localStorage.removeItem('unlockLostArtA2'); 
    localStorage.removeItem('unlockLostArtA3'); 
    localStorage.removeItem('unlockLostArtFistStage'); 
    
    state.notebook = [];
    state.inventory = [];
    state.unlockedHints = {};
    state.timeRemaining = 3600;
    
    assessment1Progress = 0;
    assessment2Progress = 0;
    assessment3Progress = 0;
    currentFistStage = 1;
    isYidanLightOn = false;
    
    updateModals();
    const timerUI = document.getElementById('timer-container');
    if (timerUI) timerUI.classList.add('hidden'); 
    
    if (state.timerInterval) clearInterval(state.timerInterval); 
    
    state.unlockedLevel = 5; 
    enterLevelSelect();
}

function backToPathSelection() {
    document.getElementById('save-options').classList.add('hidden');
    document.getElementById('save-options').classList.remove('flex');
    document.getElementById('path-selection').classList.remove('hidden');
}

// ==========================================
// ★ 分章節體驗：進度與道具重置系統
// ==========================================
function resetChapterState(level) {
    state.notebook = [];
    state.inventory = [];
    state.unlockedHints = {};
    
    poemPuzzleInitialized = false;
    isPoemSolved = false;
    lockedPieces.clear();
    
    state.luoPuzzleInitialized = false;
    isLuoSolved = false;
    luoSelected = [];
    hideLuoInput();
    
    xiePuzzleInitialized = false;
    isXieSolved = false;
    xiePlacements = { 1: null, 2: null, 3: null, 4: null, 5: null };
    xieSlotOccupants = { 0: null, 1: null, 2: null, 3: null, 4: null };

    servingPuzzleInitialized = false;
    currentServingSequence = [];
    resetTableSpots();
    
    if (level > 2) {
        state.inventory.push({ name: '2018舊照片', desc: '日曆掉出的照片，背面似乎有某種建築物的輪廓。' });
        state.inventory.push({ name: '字卡(RU;_)', desc: '木板底層暗格彈出的字卡。' });
        state.inventory.push({ name: '字卡(G0_)', desc: '從羅秀惠詩箋機關獲得的字卡。' });
        state.inventory.push({ name: '字卡(X.6)', desc: '從謝介石護照機關獲得的字卡。' });
        state.notebook.push({ name: '連雅堂(關係:故友)', desc: '台灣通史作者/台南新報漢文部主筆/南社創辦人/發起赤城花榜活動' });
        state.notebook.push({ name: '羅秀惠(關係:惡緣)', desc: '花花世界生/曾任《臺灣日日新報》編輯/赤崁女使蔡碧吟之夫。' });
        state.notebook.push({ name: '謝介石(關係:丈夫)', desc: '一生換過五個國籍/新竹二石之稱/曾任滿州國外交總長。' });
    }
    if (level > 3) {
        state.inventory.push({ name: '江山樓簡介', desc: '一份記錄著江山樓各樓層設施分布的文字介紹。' });
        state.inventory.push({ name: '江山樓舊照', desc: '江山樓建築外觀的老照片。' });
        state.inventory.push({ name: '江山樓史料1', desc: '記載江山樓宴席桌數與價格變化的文獻。' });
        state.inventory.push({ name: '江山樓史料2', desc: '記載江山樓台灣料理菜色與桌面擺設的文獻。' });
        state.inventory.push({ name: '江山樓史料3', desc: '記載江山樓食器與家具材質的文獻。' });
        state.inventory.push({ name: '江山樓菜單', desc: '江山樓筵席的十二道菜與甜點清單。' });
        state.inventory.push({ name: '菜色作法解謎', desc: '記載著隱去關鍵字的菜色作法。' });
        state.inventory.push({ name: '《乞食開藝旦歌》', desc: '記錄著當時社會風氣與勸世內容的古老歌謠。' });
    }
    if (level === 5) {
        state.notebook.push({ name: '卡片1(師從趙一山、楊印堂)', desc: '艋舺詩人王子鶴見她頗有詩才，便介紹她到大稻埕的「劍樓書塾」學習作詩。此外也與平樂遊創辦人楊印堂學習唱曲' });
        state.notebook.push({ name: '卡片2(王罔市)', desc: '從小就被送給龍山寺婦人董仔治(董阿治)旗下。' });
        state.notebook.push({ name: '卡片3(艋舺第一花魁)', desc: '藝旦的最高榮譽，見證了她在風月場中的絕代風華。' });
        state.inventory.push({ name: '鑑札', desc: '官設檢番核發之藝旦執業執照，通過三項考核的證明。' });
    }
    
    if (level === 4) {
        isYidanLightOn = false;
        assessment1Progress = 0;
        assessment2Progress = 0;
        assessment3Progress = 0;
        currentFistStage = 1;
        localStorage.setItem('unlockLostArtA1', 0);
        localStorage.setItem('unlockLostArtA2', 0);
        localStorage.setItem('unlockLostArtA3', 0);
        localStorage.setItem('unlockLostArtFistStage', 1);
        
        const fistContainer = document.getElementById('fist-game-container');
        if (fistContainer) fistContainer.classList.add('hidden');
        const a2Container = document.getElementById('assessment2-puzzle-container');
        if (a2Container) a2Container.classList.add('hidden');
        const a3Container = document.getElementById('assessment3-puzzle-container');
        if (a3Container) a3Container.classList.add('hidden');
        
        const box = document.getElementById('obj-jewelry-box');
        if (box) box.classList.remove('hidden');

        const doorBtn = document.getElementById('btn-enter-final-door');
        if (doorBtn) doorBtn.remove();
    }

    localStorage.setItem('unlockLostArtNotebook', JSON.stringify(state.notebook));
    localStorage.setItem('unlockLostArtInventory', JSON.stringify(state.inventory));
    
    updateModals();
    syncCollectedDots();
}

// ==========================================
// ★ 動態建立 UI 
// ==========================================
function buildDynamicUI() {
    const room2 = document.getElementById('scene-room2');
    if (room2) {
        let oldTable = document.getElementById('jiangshan-table-container');
        if (oldTable) oldTable.remove();
        
        const tableContainer = document.createElement('div');
        tableContainer.id = 'jiangshan-table-container';
        tableContainer.className = 'absolute bottom-[35%] left-[50%] transform -translate-x-1/2 hidden z-10 interactable hover:scale-105 transition-transform duration-300';
        tableContainer.onclick = () => enterServingPuzzle();
        tableContainer.innerHTML = `
            <div class="relative">
                <img src="餐具.png" alt="江山樓餐桌" class="w-72 h-auto drop-shadow-2xl">
                <div class="absolute -top-4 right-0 w-12 h-12 bg-green-600/80 border-2 border-green-200 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_15px_rgba(22,163,74,0.8)] text-white text-xl">
                    <i class="fa-solid fa-utensils"></i>
                </div>
                <div class="mt-2 text-sm font-bold text-[#e2cda6] bg-black/70 px-4 py-1 rounded-full border border-[#a37c4d] text-center shadow-lg mx-auto w-3/4 tracking-widest">
                    點擊上菜
                </div>
            </div>
        `;
        room2.appendChild(tableContainer);

        let oldYidanTrigger = document.getElementById('obj-yidan-trigger');
        if (oldYidanTrigger) oldYidanTrigger.remove();

        const yidanTrigger = document.createElement('div');
        yidanTrigger.id = 'obj-yidan-trigger';
        yidanTrigger.className = 'interactable absolute top-[20%] left-[10%] hidden flex-col items-center cursor-pointer hover:scale-110 transition-transform duration-300 z-10';
        yidanTrigger.onclick = () => triggerYidanUnlock();
        yidanTrigger.innerHTML = `
            <div class="w-14 h-14 bg-purple-700/80 border-2 border-purple-200 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(126,34,206,0.8)] text-white text-2xl">
                <i class="fa-solid fa-door-open"></i>
            </div>
            <div class="mt-2 text-sm font-bold text-purple-100 bg-black/80 px-3 py-1 rounded-full border border-purple-900/50 shadow-lg tracking-widest">
                神秘房間
            </div>
        `;
        room2.appendChild(yidanTrigger);
    }

    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        let oldServing = document.getElementById('scene-serving');
        if (oldServing) oldServing.remove();
        
        const servingScene = document.createElement('div');
        servingScene.id = 'scene-serving';
        servingScene.className = 'scene';
        servingScene.style.backgroundColor = '#1a1311';
        servingScene.style.backgroundImage = 'radial-gradient(circle, #3a251c 0%, #150d0a 100%)';
        servingScene.innerHTML = `
            <div class="absolute top-4 left-4 text-2xl font-bold text-amber-100 tracking-widest bg-stone-900/80 px-4 py-2 rounded border border-amber-900 z-20 shadow-lg">
                【 筵席上菜中 】
            </div>
            <div class="absolute inset-0 flex pt-20 pb-6 px-6 gap-6 z-0">
                <div class="w-1/3 flex flex-col gap-4 h-full overflow-y-auto pr-2" style="scrollbar-width: thin; scrollbar-color: #5a3c28 transparent;">
                    <div id="on-screen-menu" class="bg-[#e6d3af] bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] rounded border-2 border-[#5a3c28] p-4 shadow-lg text-sm text-[#3e2723]"></div>
                    <div id="on-screen-recipe" class="bg-[#e6d3af] bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] rounded border-2 border-[#5a3c28] p-4 shadow-lg text-sm text-[#3e2723]"></div>
                </div>
                <div class="w-2/3 flex flex-col h-full gap-4">
                    <div class="flex-1 flex items-center justify-center relative">
                        <div class="relative w-[380px] h-[380px] md:w-[450px] md:h-[450px] bg-[#2a1b12] rounded-full border-[10px] border-[#4a2e1b] shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex items-center justify-center">
                            <div class="absolute inset-4 rounded-full border-2 border-dashed border-[#7d593c] opacity-40"></div>
                            <div id="table-dish-1" class="absolute top-[5%] left-[50%] transform -translate-x-1/2 w-24 h-24 rounded-full bg-black/40 border-2 border-amber-600 flex items-center justify-center opacity-0 transition-all duration-500 shadow-xl overflow-hidden bg-cover bg-center"></div>
                            <div id="table-dish-2" class="absolute top-[25%] right-[5%] w-24 h-24 rounded-full bg-black/40 border-2 border-amber-600 flex items-center justify-center opacity-0 transition-all duration-500 shadow-xl overflow-hidden bg-cover bg-center"></div>
                            <div id="table-dish-3" class="absolute bottom-[25%] right-[5%] w-24 h-24 rounded-full bg-black/40 border-2 border-amber-600 flex items-center justify-center opacity-0 transition-all duration-500 shadow-xl overflow-hidden bg-cover bg-center"></div>
                            <div id="table-dish-4" class="absolute bottom-[5%] left-[50%] transform -translate-x-1/2 w-24 h-24 rounded-full bg-black/40 border-2 border-amber-600 flex items-center justify-center opacity-0 transition-all duration-500 shadow-xl overflow-hidden bg-cover bg-center"></div>
                            <div id="table-dish-5" class="absolute bottom-[25%] left-[5%] w-24 h-24 rounded-full bg-black/40 border-2 border-amber-600 flex items-center justify-center opacity-0 transition-all duration-500 shadow-xl overflow-hidden bg-cover bg-center"></div>
                            <div id="table-dish-6" class="absolute top-[25%] left-[5%] w-24 h-24 rounded-full bg-black/40 border-2 border-amber-600 flex items-center justify-center opacity-0 transition-all duration-500 shadow-xl overflow-hidden bg-cover bg-center"></div>
                        </div>
                    </div>
                    <div class="h-36 bg-stone-900/90 border-4 border-[#5a3c28] rounded-xl flex flex-col shadow-2xl shrink-0 overflow-hidden">
                        <div class="bg-[#4a2e1b] text-[#e2cda6] font-bold text-center py-1.5 border-b-2 border-[#2b1b12] text-sm tracking-widest flex justify-between px-4 items-center shadow-inner">
                            <span>請點擊下方菜色依序上桌 (14選6)</span>
                            <button onclick="resetServingPuzzle()" class="bg-red-900 hover:bg-red-700 border border-red-500 text-white px-3 py-0.5 rounded text-xs transition shadow">重置</button>
                        </div>
                        <div id="dish-selection-container" class="flex-1 flex gap-3 p-3 overflow-x-auto items-center justify-start" style="scrollbar-width: thin; scrollbar-color: #5a3c28 transparent;"></div>
                    </div>
                </div>
            </div>
        `;
        gameContainer.insertBefore(servingScene, document.getElementById('notification'));
    }

    const yidanScene = document.getElementById('scene-yidan');
    if (yidanScene) {
        let a2Player = document.getElementById('a2-player');
        if (!a2Player) {
            a2Player = document.createElement('audio');
            a2Player.id = 'a2-player';
            document.body.appendChild(a2Player);
        }
        
        let a3Container = document.getElementById('assessment3-puzzle-container');
        if (!a3Container) {
            a3Container = document.createElement('div');
            a3Container.id = 'assessment3-puzzle-container';
            a3Container.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] hidden bg-stone-900/95 border-2 border-[#a37c4d] p-6 rounded-xl shadow-2xl w-11/12 md:w-[750px] flex-col gap-6 transition-all';
            
            a3Container.innerHTML = `
                <button onclick="hideAssessment3Puzzle()" class="absolute -top-4 -right-4 bg-red-800 text-white rounded-full w-10 h-10 flex items-center justify-center border-2 border-[#e2cda6] hover:bg-red-600 shadow-lg text-xl z-[80] transition-transform hover:scale-110">
                    <i class="fas fa-times"></i>
                </button>
                
                <!-- 階段一：完整擬真琵琶 -->
                <div id="pipa-step1" class="flex flex-col items-center justify-center w-full h-[55vh]">
                    <h4 class="text-amber-200 font-bold mb-4 text-center text-2xl tracking-widest drop-shadow">請點擊琵琶一品位放大</h4>
                    <div class="relative w-64 h-[450px] bg-stone-900 rounded-lg flex justify-center items-end pb-2 cursor-pointer overflow-hidden shadow-2xl hover:scale-105 transition-transform border-4 border-stone-700" onclick="showPipaStep2()">
                        <div class="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]"></div>
                        <div class="absolute top-0 right-0 w-3/4 h-[55%] bg-gradient-to-br from-[#1b3d32] to-[#0d1a15] opacity-50 shadow-[inset_0_0_20px_rgba(0,0,0,1)]"></div>
                        <div class="absolute bottom-0 w-full h-[35%] bg-[#1c0f0a] border-t-8 border-[#0a0502] shadow-[inset_0_15px_30px_rgba(0,0,0,1)]"></div>
                        
                        <div class="relative flex flex-col items-center h-full pt-8 z-10 transform scale-95">
                            <div class="w-12 h-16 bg-gradient-to-b from-[#4a2613] to-[#2a1308] rounded-t-full border-2 border-[#0a0502] relative shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
                                <div class="absolute top-1.5 -left-3.5 w-4 h-2.5 bg-[#140905] rounded border border-black shadow"></div>
                                <div class="absolute top-6 -left-3.5 w-4 h-2.5 bg-[#140905] rounded border border-black shadow"></div>
                                <div class="absolute top-1.5 -right-3.5 w-4 h-2.5 bg-[#140905] rounded border border-black shadow"></div>
                                <div class="absolute top-6 -right-3.5 w-4 h-2.5 bg-[#140905] rounded border border-black shadow"></div>
                            </div>
                            <div class="w-8 h-[100px] bg-gradient-to-r from-[#2a1308] via-[#633a20] to-[#140905] border-x-2 border-[#0a0502] flex flex-col justify-evenly items-center shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] relative z-10">
                                <div class="w-full h-1.5 bg-[#d4b886] border-y border-[#3d1e10] shadow-sm"></div>
                                <div class="w-full h-1.5 bg-[#d4b886] border-y border-[#3d1e10] shadow-sm"></div>
                                <div class="w-full h-1.5 bg-[#d4b886] border-y border-[#3d1e10] shadow-sm"></div>
                                <div class="w-full h-1.5 bg-[#d4b886] border-y border-[#3d1e10] shadow-sm"></div>
                            </div>
                            <div class="w-52 h-[260px] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-[#8b5e34] bg-blend-overlay border-2 border-[#140905] -mt-2 flex flex-col items-center pt-8 pb-4 relative shadow-[inset_-20px_-15px_40px_rgba(0,0,0,0.8),_15px_15px_25px_rgba(0,0,0,0.9)]" style="border-radius: 50% 50% 40% 40% / 65% 65% 35% 35%; background-image: linear-gradient(135deg, #a67b4b 0%, #6e4123 40%, #1a0a05 100%);">
                                ${Array(14).fill(0).map((_, i) => `<div style="width: ${25 + i * 3.5}%; height: 3px;" class="bg-[#140905] mb-1.5 opacity-80 rounded-full shadow-sm"></div>`).join('')}
                                <div class="absolute bottom-6 w-24 h-6 bg-gradient-to-b from-[#2a1308] to-[#0a0502] rounded-t-lg border-2 border-black shadow-[0_5px_10px_rgba(0,0,0,0.9)] flex justify-center items-end pb-1">
                                    <div class="w-16 h-1 bg-black rounded-full opacity-60"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="absolute top-[21%] left-1/2 transform -translate-x-1/2 w-16 h-20 border-4 border-red-500 animate-pulse bg-red-500/20 rounded z-20 shadow-[0_0_20px_rgba(239,68,68,1)]"></div>
                    </div>
                </div>

                <!-- 階段二：指法與彈奏 -->
                <div id="pipa-step2" class="hidden flex-col md:flex-row gap-6 w-full h-full animate-fade-in">
                    <div class="w-full md:w-1/2 flex flex-col">
                        <h4 class="text-amber-200 font-bold mb-3 text-center text-lg border-b border-amber-800 pb-1">指法參考圖</h4>
                        <div class="relative w-full aspect-square bg-[#d3d3d3] border-4 border-stone-600 rounded flex items-center justify-center shadow-inner overflow-hidden">
                            <div class="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>
                            <div class="absolute inset-0 flex flex-col justify-between py-[12%]">
                                <div class="w-full h-0.5 bg-black"></div><div class="w-full h-0.5 bg-black"></div>
                                <div class="w-full h-0.5 bg-black"></div><div class="w-full h-0.5 bg-black"></div>
                                <div class="w-full h-0.5 bg-black"></div><div class="w-full h-0.5 bg-black"></div>
                            </div>
                            <div class="absolute inset-0 flex justify-between px-[12%]">
                                <div class="w-0.5 h-full bg-black"></div><div class="w-0.5 h-full bg-black"></div>
                                <div class="w-0.5 h-full bg-black"></div><div class="w-0.5 h-full bg-black"></div>
                            </div>
                            <div class="absolute w-10 h-10 md:w-12 md:h-12 bg-blue-600/90 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md transform -translate-x-1/2 -translate-y-1/2" style="top: 12%; left: 62.6%;">羽</div>
                            <div class="absolute w-10 h-10 md:w-12 md:h-12 bg-blue-600/90 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md transform -translate-x-1/2 -translate-y-1/2" style="top: 12%; left: 88%;">商</div>
                            <div class="absolute w-10 h-10 md:w-12 md:h-12 bg-blue-600/90 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md transform -translate-x-1/2 -translate-y-1/2" style="top: 42.4%; left: 88%;">角</div>
                            <div class="absolute w-10 h-10 md:w-12 md:h-12 bg-blue-600/90 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md transform -translate-x-1/2 -translate-y-1/2" style="top: 57.6%; left: 62.6%;">宮</div>
                            <div class="absolute w-10 h-10 md:w-12 md:h-12 bg-blue-600/90 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md transform -translate-x-1/2 -translate-y-1/2" style="top: 57.6%; left: 88%;">4</div>
                            <div class="absolute w-10 h-10 md:w-12 md:h-12 bg-blue-600/90 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md transform -translate-x-1/2 -translate-y-1/2" style="top: 88%; left: 88%;">徵</div>
                        </div>
                    </div>

                    <div class="w-full md:w-1/2 flex flex-col">
                        <h4 class="text-amber-200 font-bold mb-3 text-center text-lg border-b border-amber-800 pb-1">琵琶一品位 (請彈奏小蜜蜂)</h4>
                        <p class="text-[11px] text-stone-300 text-center mb-1">先點擊選擇按弦位(圓鈕)，再點對應琴弦(垂直線)撥弦</p>
                        <div class="relative w-full aspect-square bg-[#7a4820] border-4 border-[#3e2723] rounded flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden">
                            <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
                            <div class="absolute inset-0 flex justify-between px-[12%] py-[5%] pointer-events-none">
                                <div class="w-1 h-full bg-[#d4c3b3] shadow-sm"></div><div class="w-1 h-full bg-[#d4c3b3] shadow-sm"></div>
                                <div class="w-1 h-full bg-[#d4c3b3] shadow-sm"></div><div class="w-1 h-full bg-[#d4c3b3] shadow-sm"></div>
                            </div>
                            <div class="absolute inset-0 flex flex-col justify-between py-[12%] pointer-events-none">
                                <div class="w-full h-1.5 bg-[#d4b886] border-y border-[#a37c4d] shadow-sm"></div>
                                <div class="w-full h-1.5 bg-[#d4b886] border-y border-[#a37c4d] shadow-sm"></div>
                                <div class="w-full h-1.5 bg-[#d4b886] border-y border-[#a37c4d] shadow-sm"></div>
                                <div class="w-full h-1.5 bg-[#d4b886] border-y border-[#a37c4d] shadow-sm"></div>
                                <div class="w-full h-1.5 bg-[#d4b886] border-y border-[#a37c4d] shadow-sm"></div>
                                <div class="w-full h-1.5 bg-[#d4b886] border-y border-[#a37c4d] shadow-sm"></div>
                            </div>

                            <div onclick="pluckString(4)" class="absolute w-[14%] h-full top-0 cursor-pointer hover:bg-white/15 z-10 transform -translate-x-1/2 transition-colors" style="left: 12%"></div>
                            <div onclick="pluckString(3)" class="absolute w-[14%] h-full top-0 cursor-pointer hover:bg-white/15 z-10 transform -translate-x-1/2 transition-colors" style="left: 37.3%"></div>
                            <div onclick="pluckString(2)" class="absolute w-[14%] h-full top-0 cursor-pointer hover:bg-white/15 z-10 transform -translate-x-1/2 transition-colors" style="left: 62.6%"></div>
                            <div onclick="pluckString(1)" class="absolute w-[14%] h-full top-0 cursor-pointer hover:bg-white/15 z-10 transform -translate-x-1/2 transition-colors" style="left: 88%"></div>
                            
                            <button id="fret-yu" onclick="selectFret('羽', 2)" class="fret-node absolute w-10 h-10 md:w-12 md:h-12 rounded-full border-4 border-blue-500/80 bg-blue-500/30 hover:bg-blue-500/60 transition-all transform -translate-x-1/2 -translate-y-1/2 focus:outline-none z-20" style="top: 12%; left: 62.6%;"></button>
                            <button id="fret-shang" onclick="selectFret('商', 1)" class="fret-node absolute w-10 h-10 md:w-12 md:h-12 rounded-full border-4 border-blue-500/80 bg-blue-500/30 hover:bg-blue-500/60 transition-all transform -translate-x-1/2 -translate-y-1/2 focus:outline-none z-20" style="top: 12%; left: 88%;"></button>
                            <button id="fret-jiao" onclick="selectFret('角', 1)" class="fret-node absolute w-10 h-10 md:w-12 md:h-12 rounded-full border-4 border-blue-500/80 bg-blue-500/30 hover:bg-blue-500/60 transition-all transform -translate-x-1/2 -translate-y-1/2 focus:outline-none z-20" style="top: 42.4%; left: 88%;"></button>
                            <button id="fret-gong" onclick="selectFret('宮', 2)" class="fret-node absolute w-10 h-10 md:w-12 md:h-12 rounded-full border-4 border-blue-500/80 bg-blue-500/30 hover:bg-blue-500/60 transition-all transform -translate-x-1/2 -translate-y-1/2 focus:outline-none z-20" style="top: 57.6%; left: 62.6%;"></button>
                            <button id="fret-4" onclick="selectFret('4', 1)" class="fret-node absolute w-10 h-10 md:w-12 md:h-12 rounded-full border-4 border-blue-500/80 bg-blue-500/30 hover:bg-blue-500/60 transition-all transform -translate-x-1/2 -translate-y-1/2 focus:outline-none z-20" style="top: 57.6%; left: 88%;"></button>
                            <button id="fret-zhi" onclick="selectFret('徵', 1)" class="fret-node absolute w-10 h-10 md:w-12 md:h-12 rounded-full border-4 border-blue-500/80 bg-blue-500/30 hover:bg-blue-500/60 transition-all transform -translate-x-1/2 -translate-y-1/2 focus:outline-none z-20" style="top: 88%; left: 88%;"></button>
                        </div>
                        
                        <div id="pipa-sequence-display" class="mt-2 px-2 py-1 bg-black/70 text-amber-300 font-bold text-[13px] md:text-sm tracking-widest text-left rounded-lg border border-amber-900 shadow-inner h-[85px] overflow-y-auto whitespace-pre-wrap leading-relaxed"></div>
                    </div>
                </div>
            `;
            yidanScene.appendChild(a3Container);
        }
    }
}

function syncCollectedDots() {
    // --- 第一章：寶美樓觸擊點 ---
    const el1 = document.getElementById('obj-photo1');
    if (el1) {
        if (state.inventory.find(i => i.name === '字卡(RU;_)')) el1.classList.add('hidden');
        else el1.classList.remove('hidden');
    }
    
    const el2 = document.getElementById('obj-poem');
    if (el2) {
        if (state.inventory.find(i => i.name === '字卡(G0_)')) el2.classList.add('hidden');
        else el2.classList.remove('hidden');
    }
    
    const el3 = document.getElementById('obj-photo2');
    if (el3) {
        if (state.inventory.find(i => i.name === '字卡(X.6)')) el3.classList.add('hidden');
        else el3.classList.remove('hidden');
    }

    // --- 第二章：江山樓觸擊點 ---
    const hasJiangshanDoc = hasCollected('江山樓簡介');
    const hasJiangshanPhoto = hasCollected('江山樓舊照');
    const hasMenu = hasCollected('裕仁皇太子來臺御宴菜單') || hasCollected('江山樓菜單');
    const hasYidanSong = hasCollected('《乞強開藝旦歌》') || hasCollected('《乞食開藝旦歌》');
    
    const elDoc = document.getElementById('obj-jiangshan-doc');
    if (elDoc) {
        if (hasJiangshanDoc) elDoc.classList.add('hidden');
        else elDoc.classList.remove('hidden');
    }
    
    const elPhoto = document.getElementById('obj-jiangshan-photo');
    if (elPhoto) {
        if (hasJiangshanPhoto) elPhoto.classList.add('hidden');
        else elPhoto.classList.remove('hidden');
    }
    
    const roofPhoto = document.getElementById('jiangshan-roof-photo');
    if (roofPhoto) {
        if (hasJiangshanDoc && hasJiangshanPhoto && !hasMenu) {
            roofPhoto.classList.remove('hidden');
        } else {
            roofPhoto.classList.add('hidden');
        }
    }

    const roofDoc = hasCollected('江山樓史料1');
    const elRoofDoc = document.getElementById('obj-roof-doc');
    if (elRoofDoc) {
        if (roofDoc) elRoofDoc.classList.add('hidden');
        else elRoofDoc.classList.remove('hidden');
    }
    
    const banquetDoc = hasCollected('江山樓史料2');
    const elBanquetDoc = document.getElementById('obj-banquet-doc');
    if (elBanquetDoc) {
        if (banquetDoc) elBanquetDoc.classList.add('hidden');
        else elBanquetDoc.classList.remove('hidden');
    }
    
    const bathEquipDoc = hasCollected('江山樓史料3');
    const elBathEquipDoc = document.getElementById('obj-bath-equip-doc');
    if (elBathEquipDoc) {
        if (bathEquipDoc) elBathEquipDoc.classList.add('hidden');
        else elBathEquipDoc.classList.remove('hidden');
    }
    
    const tableContainer = document.getElementById('jiangshan-table-container');
    if (tableContainer) {
        if (hasMenu && !hasYidanSong) tableContainer.classList.remove('hidden');
        else tableContainer.classList.add('hidden');
    }

    const yidanTrigger = document.getElementById('obj-yidan-trigger');
    if (yidanTrigger) {
        if (hasYidanSong) {
            yidanTrigger.classList.remove('hidden');
            yidanTrigger.classList.add('flex');
        } else {
            yidanTrigger.classList.add('hidden');
            yidanTrigger.classList.remove('flex');
        }
    }
    
    // --- 第三章：藝旦間考核圖樣 ---
    const scroll1 = document.getElementById('obj-scroll-1');
    if (scroll1) {
        scroll1.style.left = '20%'; scroll1.style.right = 'auto'; scroll1.style.top = '50%'; scroll1.style.transform = 'translate(-50%, -50%)'; scroll1.style.zIndex = '40';
        scroll1.classList.remove('hidden'); scroll1.classList.add('flex'); scroll1.style.display = 'flex';
        
        if (assessment1Progress >= 3) {
            scroll1.classList.add('pointer-events-none');
            scroll1.innerHTML = `<div class="w-16 h-16 bg-green-700/90 border-2 border-green-300 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(22,163,74,1)] text-white text-3xl"><i class="fa-solid fa-check"></i></div><div class="mt-3 text-lg font-bold text-green-100 bg-black/80 px-5 py-1.5 rounded-full border border-green-500 shadow-lg tracking-widest">考核一 完成</div>`;
        } else {
            scroll1.classList.remove('pointer-events-none');
            scroll1.innerHTML = `<div class="w-16 h-16 bg-amber-700/90 border-2 border-amber-300 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(217,119,6,1)] text-white text-3xl"><i class="fa-solid fa-hand-fist"></i></div><div class="mt-3 text-lg font-bold text-amber-100 bg-black/80 px-5 py-1.5 rounded-full border border-amber-500 shadow-lg tracking-widest">考核一</div>`;
        }
    }

    const scroll2 = document.getElementById('obj-scroll-2');
    if (scroll2) {
        scroll2.style.left = '50%'; scroll2.style.right = 'auto'; scroll2.style.top = '50%'; scroll2.style.transform = 'translate(-50%, -50%)'; scroll2.style.zIndex = '40';
        scroll2.classList.remove('hidden'); scroll2.classList.add('flex'); scroll2.style.display = 'flex'; 
        
        if (assessment2Progress >= 2) {
            scroll2.classList.add('pointer-events-none');
            scroll2.innerHTML = `<div class="w-16 h-16 bg-green-700/90 border-2 border-green-300 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(22,163,74,1)] text-white text-3xl"><i class="fa-solid fa-check"></i></div><div class="mt-3 text-lg font-bold text-green-100 bg-black/80 px-5 py-1.5 rounded-full border border-green-500 shadow-lg tracking-widest">考核二 完成</div>`;
        } else {
            scroll2.classList.remove('pointer-events-none');
            scroll2.innerHTML = `<div class="w-16 h-16 bg-blue-700/90 border-2 border-blue-300 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(29,78,216,1)] text-white text-3xl"><i class="fa-solid fa-music"></i></div><div class="mt-3 text-lg font-bold text-blue-100 bg-black/80 px-5 py-1.5 rounded-full border border-blue-500 shadow-lg tracking-widest">考核二</div>`;
        }
    }
    
    const scroll3 = document.getElementById('obj-scroll-3');
    if (scroll3) {
        scroll3.style.left = '80%'; scroll3.style.right = 'auto'; scroll3.style.top = '50%'; scroll3.style.transform = 'translate(-50%, -50%)'; scroll3.style.zIndex = '40';
        scroll3.classList.remove('hidden'); scroll3.classList.add('flex'); scroll3.style.display = 'flex'; 

        if (assessment3Progress >= 2) {
            scroll3.classList.add('pointer-events-none');
            scroll3.innerHTML = `<div class="w-16 h-16 bg-green-700/90 border-2 border-green-300 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(22,163,74,1)] text-white text-3xl"><i class="fa-solid fa-check"></i></div><div class="mt-3 text-lg font-bold text-green-100 bg-black/80 px-5 py-1.5 rounded-full border border-green-500 shadow-lg tracking-widest">考核三 完成</div>`;
        } else {
            scroll3.classList.remove('pointer-events-none');
            scroll3.innerHTML = `
                <div class="w-16 h-16 bg-purple-700/90 border-2 border-purple-300 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(147,51,234,1)] text-white">
                    <svg viewBox="0 0 64 64" class="w-9 h-9 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M35 6h-6v4h-3v3h3v3h-3v3h3v7.5C22.5 29 18 36 18 44c0 8.5 6 14 14 14s14-5.5 14-14c0-8-4.5-15-11-18.5V19h3v-3h-3v-3h3v-3h-3V6zm-3 46c-5.5 0-9-3.5-9-8.5 0-6 3.5-11.5 9-14 5.5 2.5 9 8 9 14 0 5-3.5 8.5-9 8.5z"/>
                        <rect x="27" y="45" width="10" height="2.5" rx="1"/>
                        <line x1="30.5" y1="12" x2="30.5" y2="45" stroke="currentColor" stroke-width="1"/>
                        <line x1="33.5" y1="12" x2="33.5" y2="45" stroke="currentColor" stroke-width="1"/>
                    </svg>
                </div>
                <div class="mt-3 text-lg font-bold text-purple-100 bg-black/80 px-5 py-1.5 rounded-full border border-purple-500 shadow-lg tracking-widest">考核三</div>
            `;
        }
    }

    renderFinalChapterDoor();
}

function startTimer() {
    const timerUI = document.getElementById('timer-container');
    if (timerUI) timerUI.classList.remove('hidden');

    if (state.timerInterval) clearInterval(state.timerInterval);
    updateTimerUI();
    state.timerInterval = setInterval(() => {
        if (state.timeRemaining > 0) {
            state.timeRemaining--;
            updateTimerUI();
            localStorage.setItem('unlockLostArtTime', state.timeRemaining);
            playSFX('sfx-tick');
            if (state.timeRemaining === 60) {
                playSFX('sfx-warning60'); 
                showNotification("⚠️ 警告：時間只剩下最後 60 秒！");
            }
       } else {
         clearInterval(state.timerInterval);
         state.timerInterval = null;
         triggerGameOver();
     }
    }, 1000);
}
function triggerGameOver() {
    stopTypewriter();
    closeAllModals();
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) bgMusic.pause();
    playSFX('sfx-fail');
    const modal = document.getElementById('modal-game-over');
    if (modal) modal.classList.remove('hidden');
}
function updateTimerUI() {
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;
    document.getElementById('timer-text').innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const percentage = (state.timeRemaining / 3600) * 100;
    const bar = document.getElementById('timer-bar');
    bar.style.width = `${percentage}%`;
    
    if (percentage < 20) {
        bar.classList.replace('bg-amber-600', 'bg-red-600');
    } else {
        bar.classList.replace('bg-red-600', 'bg-amber-600');
    }
}

function deductTime(seconds) {
    if (isChapterSelectMode) return; 

    state.timeRemaining -= seconds;
    if (state.timeRemaining < 0) state.timeRemaining = 0;
    updateTimerUI();
    localStorage.setItem('unlockLostArtTime', state.timeRemaining);
    showNotification(`已扣除 ${seconds} 秒`);
}

function showHint(puzzleType) {
    const hintModal = document.getElementById('hint-modal');
    const hintContent = document.getElementById('hint-content');
    
    const renderHintContent = () => {
        if (puzzleType === 'luo') {
            hintContent.innerHTML = `
                <ol class="list-decimal list-inside space-y-3 ml-2 text-xl">
                    <li>兩個數字相減的差值</li>
                    <li>差值 / 平方</li>
                    <li>相加相乘</li>
                </ol>
            `;
        } else if (puzzleType === 'xie') {
            hintContent.innerHTML = `
                <p class="indent-8 mb-2">光緒四年(1878)出生於竹塹南門。1916年，由台灣籍轉入中國籍，1931年九偽「滿洲國」建國後，任外交總長，「偽滿」協和會事務局長，同年日本1945年，抗戰勝利，國軍進駐北京後，即以漢奸罪名繫於南京監獄，訊息斷絕，莫知所終。</p>
            `;
        }
        hintModal.classList.remove('hidden');
    };

    if (state.unlockedHints[puzzleType]) {
        renderHintContent();
    } else {
        if (isChapterSelectMode) {
            state.unlockedHints[puzzleType] = true;
            renderHintContent();
        } else {
            if (confirm("查看提示將會扣除 30 秒，確定要查看嗎？")) {
                deductTime(30);
                state.unlockedHints[puzzleType] = true;
                localStorage.setItem('unlockLostArtHints', JSON.stringify(state.unlockedHints));
                renderHintContent();
            }
        }
    }
}

function closeHint() {
    document.getElementById('hint-modal').classList.add('hidden');
}

// ==========================================
// ★ 對話腳本
// ==========================================
const scripts = {
    prologue: [
        { speaker: "系統", text: "你走進台南中西區西門路一間「多那之咖啡廳」，打算待上一整個下午複習期末考。", action: () => showCharacter('角色.png') },
        { speaker: "系統", text: "耳邊是店裡若有似無的談笑聲，鼻尖縈繞著陣陣咖啡香，你逐漸感到一陣睡意襲來，講義上的字跡也漸漸糊成一片模糊的黑影......" },
        { speaker: "系統", text: "「叩！」額頭撞上桌面的瞬間，你猛然驚醒！抬起頭，迎面而來的，是一對穿著白紗與西裝的新人。", action: () => { switchScene('scene-wedding'); showCharacter('新郎新娘.png'); } },
        { speaker: "新郎", text: "「咦，你是......新來的攝影助理？」" },
        { speaker: "你", text: "「呃......我只是在咖啡廳讀書。」" },
        { speaker: "新娘", text: "新娘愣了一下，狐疑地打量四周：「咖啡廳？這裡是『法國台北婚紗店』耶！」" },
        { speaker: "系統", text: "三人面面相覷。新郎新娘交換了一個「這人有點奇怪」的眼神，決定不再理會你，轉身繼續低頭挑選婚紗款式。", action: () => hideCharacter() },
        { speaker: "系統", text: "你轉頭看向牆上的日曆，發現上頭的日期是 2018 年。正當你困惑是否是自己看錯了，日曆掉出一張照片。", action: () => { showCharacter('角色.png'); dropLetter(); } },
        { speaker: "系統", text: "【獲得道具：2018舊照片】", action: () => collectItem('item', '2018舊照片', '日曆掉出的照片，背面似乎有某種建築物的輪廓。', 'falling-letter', false) },
        { speaker: "系統", text: "請點開道具欄中的圖片。" } 
    ],
    inspectPhoto: [
        { speaker: "系統", text: "你用手機打開google以圖搜圖，找到這棟建築物。" }
    ],
    room1Intro: [
      
        { speaker: "NPC", text: "你現在聽到的這首歌，據說是作詞家陳達儒在寶美樓飲宴時，聽見陪酒女侍談論傳說中清代安平買辦商人的女兒與荷蘭船醫的相戀，生下金髮女兒的故事，因深受觸動而寫下的歌詞。" },
        { speaker: "NPC", text: "這首膾炙人口的歌，也成為台南人時代記憶。" },
        { speaker: "NPC", text: "日治初期，各城市的酒樓在短短數年間數量大幅增加。酒樓，是風月軼聞悄然滋生之地，也是文人雅士流連唱和之處。" },
        { speaker: "NPC", text: "他們以報刊為筆，以詩句為墨，將一段段動人故事娓娓寫下，既留文也留情......" },
        { speaker: "NPC", text: "請在寶美樓中尋找線索。" }
    ],
    room2Intro: [
        { speaker: "系統", text: "解鎖成功！順利潛入江山樓大廳......", action: () => { 
            showCharacter('NPC1.png');
        }},
        { speaker: "NPC", text: "江山樓位於大稻埕，於1917年創立，與「東薈芳」、「春風樓」、「蓬萊閣」並稱為四大酒家。" },
        { speaker: "NPC", text: "樓主吳江山退股創建江山樓，成為當時最大最豪華的台菜餐廳代表。國內外名人、歷代總督都曾登樓開宴..." },
        { speaker: "NPC", text: "「她」似乎與酒樓有很密切的關係......" },
        { speaker: "系統", text: "尋找通往其他樓層的路徑，先在附近搜查看看吧。", action: () => { 
            hideCharacter();
            document.getElementById('obj-jiangshan-doc').classList.remove('hidden');
            document.getElementById('obj-jiangshan-photo').classList.remove('hidden');
        }}
    ],
    bathPuzzleSolved: [
        { speaker: "系統", text: "你帶著江山樓菜單回到了大廳，接下來，請依順序將菜餚上到酒桌上......", action: () => {
            const tableContainer = document.getElementById('jiangshan-table-container');
            if (tableContainer) tableContainer.classList.remove('hidden');
            hideCharacter();
        }}
    ],
    servingComplete: [
        { speaker: "系統", text: "你拿到《乞食開□□歌》文本的其中一頁，全文內容大致講述：" },
        { speaker: "系統", text: "一對原本舊識的男女，在外地相遇，女子為□□，男子原為富人，但為了她花光積蓄，後來男子被女子輕視而氣憤不已。" },
        { speaker: "系統", text: "遂請來乞丐偽裝富貴人家，讓乞丐穿上西裝皮鞋，教他如何佯裝富戶。乞丐成功騙了老闆與□□，讓□□以為他有錢而百般奉承，愉快地飲酒作樂，享受一番。" },
        { speaker: "系統", text: "末勸世人勿做□□，也不要誤入聲色場所。", action: () => {
            document.getElementById('dialog-box').style.zIndex = '50';
        }}
    ],
    yidanIntro: [
        { speaker: "NPC", text: "藝旦若成名(出師)就有一藝旦間，藝旦間背後有一個鴇母主持。藝旦間差不多有九尺長八尺寬，有一張床、八仙桌、椅子，床不是新式的，有雕刻和繡花，古色古香。", action: () => showCharacter('NPC1.png') },
        { speaker: "NPC", text: "藝旦在藝旦間時多以斜抱琵琶自彈自唱為主。當時流行「二次會」，客人召藝旦在江山樓或蓬萊閣宴飲後，再到藝旦間去吃輕粥或重整杯盤繼續宴飲。" },
        { speaker: "NPC", text: "日治時期，政府將當時風月場所的女子區分為三個等級：「藝妲」（賣藝不賣身）；「藝娼」（賣藝也賣身）；「酌婦」（陪酒女子），藝旦陪酒的價碼最高，不論在家陪酒或出局到酒樓，每次要五元。" },
        { speaker: "NPC", text: "而藝旦，須先在公學校完成六年義務教育，之後才正式拜師習藝，稱為「請先生教曲」，內容包括北管、南管、亂彈、京劇等曲種；同時也需入私塾接受詩詞訓練。" },
        { speaker: "NPC", text: "考核合格、取得「鑑札」後，藝旦才能正式執業，並受官設「檢番」管轄，負責工作調度與稅務管理。" },
        { speaker: "NPC", text: "「鑑札」是日本殖民政府藉由執照制度，對特定行業進行社會控制、稅收管理與衛生監督的具體展現。而評鑑標準，除了校書先生的專業鑑定外，也讓各方往來的客人參與評分，針對準藝妲的歌喉、容貌、琴藝（即「聲色藝」）以及酒量、交際應對、猜拳等能力進行綜合考核。" },
        { speaker: "NPC", text: "現在你將接受考核，通過考核才能獲得更多關於...的線索", action: () => hideCharacter() }
    ],
    yidanFinalSolved: [
        { speaker: "系統", text: "「喀噠」一聲，珠寶盒緩緩打開，裡面靜靜躺著一封信與一張泛黃的照片。" },
        { speaker: "王香禪", text: "「故友、惡緣、丈夫......這便是我一生的寫照。感謝你，讓我飄搖的記憶得以安息。」" },
        { speaker: "系統", text: "周圍的景象開始扭曲、閃爍......你感覺自己正在脫離這個時空。", action: () => {
            hideCharacter();
            unlockNextLevel(5, "🔓 解鎖新章節：最終章 未完待續！");
            setTimeout(() => { switchScene('scene-level-select'); }, 3000);
        }}
    ],
    assessment1Intro: [
        { speaker: "系統", text: "「拳」在本土語中稱為「猜拳」或「喝拳（豁拳）」，就像日本內地的「本拳」一樣由兩個人進行。" },
        { speaker: "系統", text: "大多在酒席上舉行，規定敗者要罰酒乾杯，或者敗者要伸出手讓勝者打一下。" },
        { speaker: "系統", text: "方法是雙方互相伸出一隻手，預測對方出的數字（也就是五根手指中會出幾根），加上自己要出的手指數，將合計的數字喊出來的同時，雙方將手指伸出。" },
        { speaker: "系統", text: "這時猜中數字的人獲勝，沒猜中的人算輸。如果雙方都沒猜中，就繼續划拳。" },
        { speaker: "系統", text: "如果雙方喊出同樣的數字，且出的手指合計也是該數字時，就稱為「對手（平手）」，不分勝負並重新再來一次。" },
        { speaker: "系統", text: "各種拳都有稱為「起語」的起手式用語，這主要是為了讓雙方互相對好節奏（氣勢）所必需的。", action: () => { showAssessment1Puzzle(); } }
    ],
    assessment2Intro: [
        { speaker: "系統", text: "藝旦的恩客多為當時的商賈、地主與文人雅士，這群人的品味喜好往往左右著藝旦的學藝方向，因而造就出不同時期的學藝風潮。" },
        { speaker: "系統", text: "清末來台移民以流行南管樂曲的漳泉族群為主，南管遂成為藝旦習藝的重點；到了移民潮後期，福州籍人口漸增，也帶動藝旦轉而學習京劇的風氣。" },
        { speaker: "系統", text: "日治時期，大批日本歌舞伎藝人進入台灣市場，本地藝旦亦從其舞蹈身段中汲取靈感。" },
        { speaker: "系統", text: "加上京劇當時幾乎已是上流社會共通的娛樂項目，藝旦便將原有的京劇唱腔功底，結合新學的身段動作，與梨園子弟同台粉墨登場，逐漸建立起「藝旦戲」的規模與樣貌。" },
        { speaker: "系統", text: "藝旦所組成的藝旦戲一經興起，便迅速風靡台灣各地戲院，深受大眾喜愛，在短時間內達到全盛，也因此進一步發展出全由女性演出的「查某戲」。" },
        { speaker: "系統", text: "而在當時女性風氣仍相對保守的年代，台灣早期的電影界與唱片界，也都留下了藝旦們勇於嘗試、走在時代尖端的足跡。" },
		{ speaker: "系統", text: "直到戰時政策以及咖啡廳與女給的興起，才逐漸走入歷史......" },
        { speaker: "系統", text: "這位藝旦師承京劇名家楊印堂，曾南下前往台南府城的寶美樓獻藝，以《二進宮》、《三娘教子》、《祭江》等京劇劇目風靡一時，令當地不少士紳為之傾倒。", action: () => { showAssessment2Puzzle(); } }
    ],
    assessment3Intro: [
        { speaker: "系統", text: "藝旦能詩擅曲，琵琶彈奏技能的學習，是藝旦養成的必經歷程。\n現在請參考指法圖，在琵琶一品位音階彈奏『小蜜蜂』。", action: () => { showAssessment3Puzzle(); } }
    ]
};

// ==========================================
// ★ 考核進度管理 
// ==========================================
let currentFistStage = parseInt(localStorage.getItem('unlockLostArtFistStage') || '1'); 
const fistStages = ['小調拳', '三國拳'];
let assessment1Progress = parseInt(localStorage.getItem('unlockLostArtA1') || '0');
let assessment2Progress = parseInt(localStorage.getItem('unlockLostArtA2') || '0');
let assessment3Progress = parseInt(localStorage.getItem('unlockLostArtA3') || '0');

function unlockNextLevel(targetLevel, unlockMsg) {
    if (state.unlockedLevel < targetLevel) {
        state.unlockedLevel = targetLevel;
        localStorage.setItem('unlockLostArtLevel', state.unlockedLevel);
        showNotification(unlockMsg);
    }
}

function switchScene(sceneId, isBack = false) {
    const targetScene = document.getElementById(sceneId);
    if (!targetScene) return;
    if (!isBack && state.currentScene !== sceneId) state.sceneHistory.push(state.currentScene);
    document.querySelectorAll('.scene').forEach(el => el.classList.remove('active'));
    targetScene.classList.add('active');
    state.currentScene = sceneId;
    
    if (sceneId === 'scene-yidan') {
        document.getElementById('fist-game-container').classList.add('hidden');
        if (assessment1Progress === 2) {
            preparePlayerTurn();
        }
    }
    
    updateUIButtons();
    syncCollectedDots();
    updatePortraitProgress(); // ★ 加入這行

    if (sceneId === 'scene-home' || sceneId === 'scene-level-select' || sceneId === 'scene-cafe' || sceneId === 'scene-wedding' || sceneId === 'scene-map-puzzle' || sceneId === 'scene-yidan' || sceneId === 'scene-final') {
        changeBGM('背景音樂.mp3');
    } else if (sceneId === 'scene-poem-puzzle' || sceneId === 'scene-luo-puzzle' || sceneId === 'scene-xie-puzzle') {
        changeBGM('安平追想曲.mp3');
    } else if (sceneId === 'scene-room2' || sceneId === 'scene-roof' || sceneId === 'scene-banquet' || sceneId === 'scene-bath' || sceneId === 'scene-serving') {
        changeBGM('藝旦唱曲.mp3'); 
    }

    if (isBack) {
        if (sceneId === 'scene-room1') changeBGM('安平追想曲.mp3');
    }
}

function enterLevelSelect(isBack = false) {
    for(let i=1; i<=5; i++) {
        let btn = document.getElementById('btn-level-' + i);
        let roomSpan = document.getElementById('room-name-' + i);
        if (btn) {
            if (i <= state.unlockedLevel) {
                btn.classList.remove('locked');
                if (roomSpan) roomSpan.classList.remove('hidden');
            } else {
                btn.classList.add('locked');
                if (roomSpan) roomSpan.classList.add('hidden');
            }
        }
    }
    switchScene('scene-level-select', isBack);
}

function continueGame() {
    isChapterSelectMode = false;
    if (state.timeRemaining < 3600) {
        startTimer();
    }
    enterLevelSelect();
}

function startGame() { 
    isChapterSelectMode = false;
  
    startLevel(1); 
}

function restartGame() {
    if(confirm("確定要重新開始嗎？這會清除所有解鎖進度與收集的物品。")) {
        isChapterSelectMode = false;
        localStorage.removeItem('unlockLostArtLevel');
        localStorage.removeItem('unlockLostArtNotebook');
        localStorage.removeItem('unlockLostArtInventory');
        localStorage.removeItem('unlockLostArtTime');
        localStorage.removeItem('unlockLostArtHints');
        localStorage.removeItem('unlockLostArtA1'); 
        localStorage.removeItem('unlockLostArtA2'); 
        localStorage.removeItem('unlockLostArtA3'); 
        localStorage.removeItem('unlockLostArtFistStage'); 
        
        state.unlockedLevel = 1;
        state.notebook = [];
        state.inventory = [];
        state.unlockedHints = {};
        state.timeRemaining = 3600;
        
        assessment1Progress = 0;
        assessment2Progress = 0;
        assessment3Progress = 0;
        currentFistStage = 1;
        isYidanLightOn = false;
        
        updateModals();
        updateTimerUI();
        
        poemPuzzleInitialized = false;
        document.querySelectorAll('.tetris-piece').forEach(p => p.remove());
        
        state.luoPuzzleInitialized = false;
        luoSelected = [];
        hideLuoInput();
        
        xiePuzzleInitialized = false;
        document.querySelectorAll('.passport-item').forEach(p => p.remove());

        document.getElementById('obj-jiangshan-doc').classList.add('hidden');
        document.getElementById('obj-jiangshan-photo').classList.add('hidden');
        document.getElementById('jiangshan-roof-photo').classList.add('hidden');
        
        const tableContainer = document.getElementById('jiangshan-table-container');
        if (tableContainer) tableContainer.classList.add('hidden');

        const doorBtn = document.getElementById('btn-enter-final-door');
        if (doorBtn) doorBtn.remove();

        const saveOptions = document.getElementById('save-options');
        const pathSelection = document.getElementById('path-selection');
        if (saveOptions) {
            saveOptions.classList.add('hidden');
            saveOptions.classList.remove('flex');
        }
        if (pathSelection) {
            pathSelection.classList.remove('hidden');
        }

        if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
}
const timerUI = document.getElementById('timer-container');
if (timerUI) timerUI.classList.add('hidden');
        startLevel(1);
    }
}

function startLevel(level) {
    state.sceneHistory = ['scene-level-select'];
    document.getElementById('ui-layer').classList.remove('hidden');
    
    if (isChapterSelectMode) {
        resetChapterState(level);
    }

    if (level === 1) { switchScene('scene-cafe'); startDialog('prologue'); } 
    else if (level === 2) { enterRoom1(); } 
    else if (level === 3) { switchScene('scene-room2'); startDialog('room2Intro'); } 
    else if (level === 4) { enterYidanRoom(); }
    else if (level === 5) { enterFinalChapter(); }
}

function goHome() {
    stopTypewriter();
    clearTimeout(state.typingTimeout);
    state.isTyping = false;
    state.onDialogEnd = null;
    document.getElementById('dialog-box').style.display = 'none';
    hideCharacter(); closeAllModals(); hidePuzzle(); hideLuoInput(); 
    
    const letter = document.getElementById('falling-letter');
    if (letter) { letter.classList.add('hidden'); letter.classList.remove('animate-fall'); }
    state.sceneHistory = []; 
    enterLevelSelect();
}

function goBack() {
    stopTypewriter();
    if (state.sceneHistory.length > 0) {
        const previousScene = state.sceneHistory.pop(); 
        clearTimeout(state.typingTimeout);
        state.isTyping = false;
        state.onDialogEnd = null;
        document.getElementById('dialog-box').style.display = 'none';
        hideCharacter(); closeAllModals(); hidePuzzle(); hideLuoInput(); hideGeneralInput();
        
        const letter = document.getElementById('falling-letter');
        if (letter) { letter.classList.add('hidden'); letter.classList.remove('animate-fall'); }

        switch(previousScene) {
            case 'scene-home': switchScene('scene-home', true); break;
            case 'scene-level-select': enterLevelSelect(true); break;
            case 'scene-cafe': switchScene('scene-cafe', true); startDialog('prologue'); break;
            case 'scene-wedding':
                switchScene('scene-wedding', true);
                showCharacter('新郎新娘.png');
                state.currentDialogSeq = scripts['prologue'];
                state.dialogIndex = 2; 
                document.getElementById('dialog-box').style.display = 'flex';
                showCurrentDialog();
                break;
            case 'scene-map-puzzle': enterMapPuzzle(true); break;
            case 'scene-room1': switchScene('scene-room1', true); break;
            case 'scene-poem-puzzle': enterPoemPuzzle(true); break;
            case 'scene-luo-puzzle': enterLuoPuzzle(true); break;
            case 'scene-xie-puzzle': enterXiePuzzle(true); break;
            case 'scene-room2': switchScene('scene-room2', true); break;
            case 'scene-roof': switchScene('scene-roof', true); break;
            case 'scene-banquet': switchScene('scene-banquet', true); break;
            case 'scene-bath': switchScene('scene-bath', true); break;
            case 'scene-serving': enterServingPuzzle(true); break;
            default: switchScene(previousScene, true); break;
        }
    }
}

function getCurrentChapterLevel(sceneId) {
    if (['scene-cafe', 'scene-wedding', 'scene-map-puzzle'].includes(sceneId)) return 1;
    if (['scene-room1', 'scene-poem-puzzle', 'scene-luo-puzzle', 'scene-xie-puzzle'].includes(sceneId)) return 2;
    if (['scene-room2', 'scene-roof', 'scene-banquet', 'scene-bath', 'scene-serving'].includes(sceneId)) return 3;
    if (sceneId === 'scene-yidan') return 4;
    if (sceneId === 'scene-final') return 5;
    return 0;
}

function updateUIButtons() {
    const uiLayer = document.getElementById('ui-layer');
    const backBtn = document.getElementById('btn-back');
    const homeBtn = document.getElementById('btn-home');
    const nextBtn = document.getElementById('btn-next-chapter');

    if (state.currentScene === 'scene-home' || state.currentScene === 'scene-level-select') {
        uiLayer.classList.add('hidden');
    } else {
        uiLayer.classList.remove('hidden');
    }

    if (backBtn) {
        if (state.sceneHistory.length > 0 && state.currentScene !== 'scene-home' && state.currentScene !== 'scene-level-select') {
            backBtn.classList.remove('hidden');
        } else {
            backBtn.classList.add('hidden');
        }
    }

    if (homeBtn) {
        if (state.currentScene !== 'scene-home' && state.currentScene !== 'scene-level-select') {
            homeBtn.classList.remove('hidden');
        } else {
            homeBtn.classList.add('hidden');
        }
    }

    // 只要「下一章已解鎖」，就顯示「下一章」按鈕
    if (nextBtn) {
        const currentChapter = getCurrentChapterLevel(state.currentScene);
        if (currentChapter >= 1 && currentChapter < 5 && state.unlockedLevel > currentChapter) {
            nextBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.add('hidden');
        }
    }
}

function goNextChapter() {
    stopTypewriter();
    clearTimeout(state.typingTimeout);
    state.isTyping = false;
    state.onDialogEnd = null;
    document.getElementById('dialog-box').style.display = 'none';
    hideCharacter();
    closeAllModals();
    hidePuzzle();
    hideLuoInput();
    hideGeneralInput();

    const currentChapter = getCurrentChapterLevel(state.currentScene);
    if (currentChapter === 1) {
        switchScene('scene-room1');
    } else if (currentChapter === 2) {
        switchScene('scene-room2');
    } else if (currentChapter === 3) {
        if (isYidanLightOn) switchScene('scene-yidan');
        else enterYidanRoom();
    } else if (currentChapter === 4) {
        enterFinalChapter();
    }
}
function showCharacter(imgSrc) {
    const container = document.getElementById('character-container');
    const posClass = (imgSrc === '角色.png') 
        ? "absolute bottom-[28%] right-10 max-h-[60vh]" 
        : "absolute bottom-[28%] left-1/2 transform -translate-x-1/2 max-h-[65vh]";
    container.innerHTML = `<img src="${imgSrc}" alt="立繪" class="${posClass} drop-shadow-2xl">`;
    container.style.opacity = 1;
}

function hideCharacter() {
    const container = document.getElementById('character-container');
    container.style.opacity = 0;
    setTimeout(() => { container.innerHTML = ''; }, 500);
}

function dropLetter() {
    const letter = document.getElementById('falling-letter');
    if (letter) { letter.classList.remove('hidden'); letter.classList.add('animate-fall'); }
}

function startDialog(seqName, onEndCallback = null) {
    state.currentDialogSeq = scripts[seqName];
    state.dialogIndex = 0;
    state.onDialogEnd = onEndCallback;
    document.getElementById('dialog-box').style.display = 'flex';
    showCurrentDialog();
}

function showCurrentDialog() {
    if (state.dialogIndex >= state.currentDialogSeq.length) {
        document.getElementById('dialog-box').style.display = 'none';
        if (typeof state.onDialogEnd === 'function') {
            const cb = state.onDialogEnd;
            state.onDialogEnd = null;
            cb();
        }
        return;
    }
    const dialog = state.currentDialogSeq[state.dialogIndex];
    const contentEl = document.getElementById('dialog-content');
    const nextBtn = document.getElementById('dialog-next-btn');
    
    contentEl.innerHTML = `<span class="text-[#a37c4d] font-bold">[${dialog.speaker}]</span><br>`;
    nextBtn.style.visibility = 'hidden';
    state.isTyping = true;
    
    const tokens = buildHighlightCharTokens(dialog.text);
    let charIndex = 0;
    
    playTypewriter();

    function typeChar() {
        if (charIndex < tokens.length) {
            const { ch, hl } = tokens[charIndex];
            if (ch === '\n') {
                contentEl.innerHTML += '<br>';
            } else if (hl) {
                contentEl.innerHTML += `<span class="font-black text-amber-300">${ch}</span>`;
            } else {
                contentEl.innerHTML += ch;
            }
            charIndex++;
            state.typingTimeout = setTimeout(typeChar, 30);
        } else {
            contentEl.innerHTML = `<span class="text-[#a37c4d] font-bold">[${dialog.speaker}]</span><br>` + getHighlightedTextHTML(dialog.text);
            state.isTyping = false;
            stopTypewriter();
            nextBtn.style.visibility = 'visible';
            if (dialog.action) dialog.action();
        }
    }
    typeChar();
}

function advanceDialog() {
    if (state.isTyping) {
        clearTimeout(state.typingTimeout);
        stopTypewriter();
        const dialog = state.currentDialogSeq[state.dialogIndex];
        const contentEl = document.getElementById('dialog-content');
        contentEl.innerHTML = `<span class="text-[#a37c4d] font-bold">[${dialog.speaker}]</span><br>` + getHighlightedTextHTML(dialog.text);
        state.isTyping = false;
        document.getElementById('dialog-next-btn').style.visibility = 'visible';
        if (dialog.action) dialog.action();
    } else {
        state.dialogIndex++;
        showCurrentDialog();
    }
}

function showNotification(msg) {
    const notif = document.getElementById('notification');
    notif.innerText = msg;
    notif.style.opacity = 1;
    setTimeout(() => { notif.style.opacity = 0; }, 2000);
}

// ==========================================
// ★ 獲得線索／道具 領取佇列系統
// ==========================================
let claimQueue = [];
let currentClaimItem = null;

function collectItem(type, name, desc, elementId = null, showUI = true) {
    if (elementId) {
        const el = document.getElementById(elementId);
        if (el) el.classList.add('hidden');
    }

    // 避免重複領取或重複排隊
    const targetList = state[type === 'clue' ? 'notebook' : 'inventory'];
    if (targetList.find(i => i.name === name)) return;
    if (currentClaimItem && currentClaimItem.name === name) return;
    if (claimQueue.find(i => i.name === name)) return;

    claimQueue.push({ type, name, desc, showUI });

    // 若目前沒有正在顯示的領取視窗，立刻顯示第一個
    if (!currentClaimItem) {
        showNextClaimModal();
    }
}

function showNextClaimModal() {
    if (claimQueue.length === 0) {
        currentClaimItem = null;
        const modal = document.getElementById('claim-modal');
        if (modal) modal.classList.add('hidden');
        return;
    }

    currentClaimItem = claimQueue.shift();
    const isClue = currentClaimItem.type === 'clue';

    const modal = document.getElementById('claim-modal');
    const badge = document.getElementById('claim-badge');
    const icon = document.getElementById('claim-icon');
    const nameEl = document.getElementById('claim-name');
    const descEl = document.getElementById('claim-desc');
    const btnText = document.getElementById('claim-btn-text');

    if (badge) badge.innerText = isClue ? '📝 發現新線索' : '🎒 獲得新道具';
    if (icon) icon.className = isClue ? 'fas fa-book-open text-3xl text-[#5a3c28]' : 'fas fa-box-open text-3xl text-[#5a3c28]';
    if (nameEl) nameEl.innerText = currentClaimItem.name;
    if (descEl) descEl.innerText = currentClaimItem.desc;
    if (btnText) btnText.innerText = isClue ? '領取並記入筆記本' : '領取並收入道具欄';

    if (modal) modal.classList.remove('hidden');
}

function confirmClaimItem() {
    if (!currentClaimItem) return;
    playSFX('sfx-click');

    const { type, name, desc, showUI } = currentClaimItem;

    if (type === 'clue') {
        state.notebook.push({ name, desc });
        localStorage.setItem('unlockLostArtNotebook', JSON.stringify(state.notebook));
        showNotification(`📝 已收錄至筆記本：${name}`);
    } else {
        state.inventory.push({ name, desc });
        localStorage.setItem('unlockLostArtInventory', JSON.stringify(state.inventory));
        showNotification(`🎒 已收錄至道具欄：${name}`);
    }

    updateModals();
    syncCollectedDots();
    if (showUI) document.getElementById('ui-layer').classList.remove('hidden');

    currentClaimItem = null;
    showNextClaimModal();
}
function renameClue(oldName, newName) {
    const clue = state.notebook.find(i => i.name === oldName);
    if (clue) {
        clue.name = newName;
        localStorage.setItem('unlockLostArtNotebook', JSON.stringify(state.notebook));
        updateModals();
    }
}

function inspectNode(itemName, elementId) {
    let imgSrc = '';
    let puzzleTarget = null; 
    let clueData = null;
    let textContent = '';
    
    if (itemName === '連雅堂(照片)') {
        imgSrc = '連雅堂.jpg';
        puzzleTarget = 'lian';
        clueData = { type: 'clue', name: itemName, desc: '台灣通史作者/台南新報漢文部主筆/南社創辦人/發起赤城花榜活動' };
    } else if (itemName === '羅秀惠(照片)') {
        imgSrc = '羅秀惠.jpg';
        puzzleTarget = 'luo';
        clueData = { type: 'clue', name: itemName, desc: '花花世界生/曾任《臺灣日日新報》編輯/赤崁女使蔡碧吟之夫。' };
    } else if (itemName === '謝介石(照片)') {
        imgSrc = '謝介石.jpeg';
        puzzleTarget = 'xie';
        clueData = { type: 'clue', name: itemName, desc: '一生換過五個國籍/新竹二石之稱/曾任滿州國外交總長。' };
    } 
    else if (itemName === '江山樓簡介') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">江山樓簡介</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                地坪一百八十坪、四層樓、磚造。<br>
                二、三樓各有七間精緻的宴廳，屋上四樓另闢特別應接室一間，洋式洗澡房十房、理髮室、屋頂庭園可容五七十人的大理石圓石卓座，四、五樓展望台，各樓梯裝鈤美術玻璃鏡一樓充作辦公廳、廚房、作業地等。<br>
                宴廳每間以木板門屏隔開，各間均懸掛當時文人墨客名流的筆墨一二十幅。
            </p>
        `;
        clueData = { type: 'item', name: itemName, desc: '一份記錄著江山樓各樓層設施分布的文字介紹。' };
    } else if (itemName === '江山樓舊照') {
        imgSrc = '江山樓.png';
        clueData = { type: 'item', name: itemName, desc: '江山樓建築外觀的老照片。' };
    }
    else if (itemName === '浴廁史料') {
        imgSrc = 'Fig 4.jpg';
        clueData = { type: 'clue', name: '殘缺史料', desc: '在浴廁發現的文件碎片。' };
    }
    else if (itemName === '江山樓史料1') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">江山樓 宴席紀錄</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                江山樓平日有十至二十桌酒菜，最多的時候是紀念日本始政四十周年開博覽會時，每日可達一百二十桌。初時，江山樓的台灣料理，辦一桌有十元、十二元、十六元等個等級，後來隨物價變動改為十八元、二十元、三十元一桌。<br><br>
                <span class="text-sm text-stone-500 font-bold">——《台北文物》，第七卷：第二期</span>
            </p>
        `;
        clueData = { type: 'item', name: itemName, desc: '記載江山樓宴席桌數與價格變化的文獻。' };
    }
    else if (itemName === '江山樓史料2') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">江山樓 料理考究</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                江山樓的台灣料理，一席平常是四冷盤，六湯盤共十菜，桌面排圓形的立碟，即蜜餞四盤，花碟四盤，西瓜子或水果四盤等。<br><br>
                <span class="text-sm text-stone-500 font-bold">——《台北文物》，第七卷：第二期</span>
            </p>
        `;
        clueData = { type: 'item', name: itemName, desc: '記載江山樓台灣料理菜色與桌面擺設的文獻。' };
    }
    else if (itemName === '江山樓史料3') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">江山樓 設備考究</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                江山樓除了使用銀器為食器，其餘食器均用國內的江西瓷器美人碗一類，到中日戰爭發生後江西瓷器無法運過來，才用日本有名的清水燒瓷器代替。椅桌全部用烏心木石。<br><br>
                <span class="text-sm text-stone-500 font-bold">——《台北文物》，第七卷：第二期</span>
            </p>
        `;
        clueData = { type: 'item', name: itemName, desc: '記載江山樓食器與家具材質的文獻。' };
    }
    else if (itemName === '螺鈿琵琶') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">螺鈿琵琶</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                琴身上刻著一行娟秀的小字：「秋水雁來聲，情難堪」。<br><br>
                這把琵琶似乎曾陪伴主人度過無數個在寶美樓與江山樓賣藝不賣身的夜晚，琴弦上還留有常年彈奏的磨損痕跡。
            </p>
        `;
        clueData = { type: 'clue', name: itemName, desc: '刻有詩句的舊琵琶，見證了藝旦的歲月。' };
    } 
    else if (itemName === '梳妝銅鏡') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">梳妝銅鏡與名片</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                鏡前放著一盒精緻的水粉，旁邊壓著一張泛黃的名片。<br><br>
                名片上隱約可見字跡：<br>
                <span class="font-bold tracking-widest text-[#8b0000]">「臺灣第一女詩人 —— 香禪」</span>
            </p>
        `;
        clueData = { type: 'clue', name: itemName, desc: '梳妝台上的名片，寫著「臺灣第一女詩人 —— 香禪」。' };
    }

    if (imgSrc !== '' || textContent !== '') {
        document.getElementById('modal-overlay').classList.add('active');
        document.getElementById('photo-modal').classList.add('active');
        
        const yidanBtn = document.getElementById('btn-enter-yidan');
        if (yidanBtn) {
            if (itemName === '《乞食開藝旦歌》') {
                yidanBtn.classList.remove('hidden');
            } else {
                yidanBtn.classList.add('hidden');
            }
        }

        const imgEl = document.getElementById('inspected-photo');
        const textEl = document.getElementById('inspected-text');
        
        if (textContent !== '') {
            imgEl.classList.add('hidden');
            textEl.classList.remove('hidden');
            textEl.innerHTML = textContent;
        } else {
            textEl.classList.add('hidden');
            imgEl.classList.remove('hidden');
            imgEl.src = imgSrc;
            
            if (itemName === '《乞食開藝旦歌》') {
                imgEl.className = "max-w-[95vw] max-h-[80vh] w-auto h-[80vh] border-8 border-white shadow-2xl rounded-sm mb-16";
            } else {
                imgEl.className = "max-w-full max-h-[70vh] border-8 border-white shadow-2xl rounded-sm";
            }
        }
        
        const enterBtn = document.getElementById('btn-enter-puzzle');
        if (puzzleTarget) {
            enterBtn.classList.remove('hidden');
            enterBtn.onclick = () => triggerPhotoPuzzle(puzzleTarget);
            if (clueData) collectItem(clueData.type, clueData.name, clueData.desc, null, true);
        } else {
            enterBtn.classList.add('hidden');
            if (clueData) collectItem(clueData.type, clueData.name, clueData.desc, elementId, true);
        }
        state.inspectingItem = itemName;
        state.sourceModal = null; 
        
        syncCollectedDots();
    }
}

function inspectItem(itemName, source) {
    let imgSrc = '';
    let textContent = '';
    
    if (itemName === '2018舊照片') imgSrc = '寶美樓.jpg';
    else if (itemName === '連雅堂(照片)' || itemName === '連雅堂(關係:故友)') { imgSrc = '連雅堂.jpg'; }
    else if (itemName === '羅秀惠(照片)' || itemName === '羅秀惠(關係:惡緣)') { imgSrc = '羅秀惠.jpg'; }
    else if (itemName === '謝介石(照片)' || itemName === '謝介石(關係:丈夫)') { imgSrc = '謝介石.jpeg'; }
    else if (itemName === '字卡(RU;_)') imgSrc = '連雅堂.jpg';
    else if (itemName === '字卡(G0_)') imgSrc = '羅秀惠.jpg';
    else if (itemName === '字卡(X.6)') imgSrc = '謝介石.jpeg';
    else if (itemName === '江山樓舊照') imgSrc = '江山樓.png';
    else if (itemName === '史料：小調拳') imgSrc = '小調曲拳.png';
    else if (itemName === '史料：三國拳') imgSrc = '三國拳.png';
    else if (itemName === '史料：官話拳') imgSrc = '官話拳.png'; 
    else if (itemName === '江山樓史料' || itemName === '江山樓簡介') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">江山樓簡介</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                地坪一百八十坪、四層樓、磚造。<br>
                二、三樓各有七間精緻的宴廳，屋上四樓另闢特別應接室一間，洋式洗澡房十房、理髮室、屋頂庭園可容五七十人的大理石圓石卓座，四、五樓展望台，各樓梯裝鈤美術玻璃鏡一樓充作辦公廳、廚房、作業地等。<br>
                宴廳每間以木板門屏隔開，各間均懸掛當時文人墨客名流的筆墨一二十幅。
            </p>
        `;
    }
    else if (itemName === '殘缺史料') {
        imgSrc = 'Fig 4.jpg';
    }
    else if (itemName === '謝介石史料') { 
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">史料記載：世紀婚禮</h3>
            <p class="indent-8 text-justify">
                台灣始政40年時，謝介石風光返鄉，帶著光宗耀祖的期待回到了老家新竹，並安排兒子謝喆生在祖宗的故鄉迎娶有權有勢的鄭肇基女兒——鄭臻臻。
            </p>
            <p class="indent-8 text-justify mt-2">
                一個官場紅人、一個地方勢力，兩個家族的世紀婚禮在鄭德宣的轉述下，重現世人眼前：「這都是八十年前的事了，據說開了六十桌，連續吃了三個晚上的囍宴。當時的社會都說這場婚禮像世紀婚禮，因為我們附的嫁妝非常的豐厚，有一個一公尺金打的棺材，以前一定要送棺材，我們認為送一般棺材太沒面子了，因為謝介石當時是外交部長，那在大陸風光一時，尤其在日本人面前，有一定的社會地位，那不能失禮、我們也要面子，所以就盡量的鋪張。」
            </p>
        `;
    }
    else if (itemName === '羅秀惠紙條') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">羅秀惠紙條</h3>
            <p class="text-left text-lg md:text-xl leading-relaxed font-serif font-bold">
                台南有句諺語：「蔡姑娘仔嫁尪——加羅（勞）的」<br><br>
                時人撰聯挖苦說：「一父二夫三舉人，四妻五妾六娼妓。」<br><br>
                撰寫這段三角關係。
            </p>
        `;
    }
    else if (itemName === '屋上庭園史料' || itemName === '江山樓史料1') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">江山樓 宴席紀錄</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                江山樓平日有十至二十桌酒菜，最多的時候是紀念日本始政四十周年開博覽會時，每日可達一百二十桌。初時，江山樓的台灣料理，辦一桌有十元、十二元、十六元等個等級，後來隨物價變動改為十八元、二十元、三十元一桌。<br><br>
                <span class="text-sm text-stone-500 font-bold">——《台北文物》，第七卷：第二期</span>
            </p>
        `;
    }
    else if (itemName === '宴會廳史料' || itemName === '江山樓史料2') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">江山樓 料理考究</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                江山樓的台灣料理，一席平常是四冷盤，六湯盤共十菜，桌面排圓形的立碟，即蜜餞四盤，花碟四盤，西瓜子或水果四盤等。<br><br>
                <span class="text-sm text-stone-500 font-bold">——《台北文物》，第七卷：第二期</span>
            </p>
        `;
    }
    else if (itemName === '浴廁設備史料' || itemName === '江山樓史料3') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">江山樓 設備考究</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                江山樓除了使用銀器為食器，其餘食器均用國內的江西瓷器美人碗一類，到中日戰爭發生後江西瓷器無法運過來，才用日本有名的清水燒瓷器代替。椅桌全部用烏心木石。<br><br>
                <span class="text-sm text-stone-500 font-bold">——《台北文物》，第七卷：第二期</span>
            </p>
        `;
    }
    else if (itemName === '江山樓菜單' || itemName === '裕仁皇太子來臺御宴菜單') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-6 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">江山樓筵席菜單</h3>
            <div class="text-left text-lg leading-relaxed font-serif text-[#3e2723] flex flex-col md:flex-row justify-between gap-6 px-4">
                <div class="flex-1">
                    <h4 class="font-bold text-[#8b0000] mb-2">【上半席】</h4>
                    <ol class="list-none space-y-1 ml-2">
                        <li>1. 雪白官燕</li>
                        <li>2. 金錢火雞</li>
                        <li>3. 水晶鴿蛋</li>
                        <li>4. 紅燒火翅</li>
                        <li>5. 八寶焗蟳</li>
                        <li>6. 雪白木耳</li>
                    </ol>
                    <h4 class="font-bold text-[#8b0000] mb-2 mt-4">【前、後半席間的鹹點】</h4>
                    <ol class="list-none space-y-1 ml-2">
                        <li>7. 炸春捲</li>
                    </ol>
                </div>
                <div class="flex-1">
                    <h4 class="font-bold text-[#8b0000] mb-2 md:mt-0">【下半席】</h4>
                    <ol class="list-none space-y-1 ml-2">
                        <li>8. 紅燒水魚</li>
                        <li>9. 海參竹茹</li>
                        <li>10. 如意鰻魚</li>
                        <li>11. 火腿冬瓜</li>
                        <li>12. 八寶飯</li>
                        <li>13. 杏仁茶</li>
                    </ol>
                </div>
            </div>
        `;
    }
   else if (itemName === '菜色作法解謎' || itemName === '說菜單') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-6 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">菜色作法解謎</h3>
            <div class="text-left text-lg leading-relaxed font-serif text-[#3e2723] space-y-4 px-2">
                <p><span class="font-bold text-[#8b0000]">A</span> 將南洋產<span class="font-bold tracking-widest text-[#5a3c28]">□□</span>浸泡熱水，清洗後以冰糖水調製。</p>
                <p><span class="font-bold text-[#8b0000]">B</span> 豬肉薄切成兩片，均為一錢銅幣大小，中間夾蔥、荸薺及<span class="font-bold tracking-widest text-[#5a3c28]">□□</span>，外部裹以蛋汁及麵包粉後油炸。</p>
                <p><span class="font-bold text-[#8b0000]">C</span> <span class="font-bold tracking-widest text-[#5a3c28]">□□</span>與蔥、荸薺、豬肉及麵包粉混合放入<span class="font-bold tracking-widest text-[#5a3c28]">□□</span>內部，外部裹上麵粉蛋糊，再裹麵包粉後油炸。</p>
                <p><span class="font-bold text-[#8b0000]">D</span> 將熱水倒入中國甘肅省產<span class="font-bold tracking-widest text-[#5a3c28]">□□</span>果實中，去皮、磨粉，以布過濾，再加入冰糖調製而成。</p>
                <p><span class="font-bold text-[#8b0000]">E</span> 本島產之<span class="font-bold tracking-widest text-[#5a3c28]">□□</span>去骨，<span class="font-bold tracking-widest text-[#5a3c28]">□□</span>切成長薄片，包入蛋、火腿及粉絲入鍋蒸。</p>
                <p><span class="font-bold text-[#8b0000]">F</span> 將雞肉、豬肉、蝦肉等主要材料切碎混合，外裹麵粉皮油炸。</p>
                <p class="text-sm text-stone-500 font-bold mt-4 pt-2 border-t border-stone-400/50">※ 空格不代表字數</p>
            </div>
        `;
    }
    else if (itemName === '《乞食開藝旦歌》') {
        imgSrc = '乞食開藝旦歌.png';
    }
    else if (itemName === '卡片1(師從趙一山 / 永樂座名旦)') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">師從趙一山 / 永樂座名旦</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                艋舺詩人王子鶴見她頗有詩才，便介紹她到大稻埕的「劍樓書塾」學習作詩。
            </p>
        `;
    }
    else if (itemName === '卡片2(王罔市)') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">王罔市</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                從小就被送給龍山寺婦人董仔治(董阿治)旗下。
            </p>
        `;
    }
    else if (itemName === '卡片3(艋舺第一花魁)') { 
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">艋舺第一花魁</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                藝旦的最高榮譽，見證了她在風月場中的絕代風華與滿腹才情。
            </p>
        `;
    }
    else if (itemName === '鑑札') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#8b0000] pb-2 text-[#8b0000]">藝旦鑑札</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723]">
                日治時期由官設「檢番」核發之正式執業執照。<br><br>
                此證代表持有人已通過聲、色、藝、酒令與樂曲的全面考核，得以解開最終的歷史謎團。
            </p>
        `;
    }
    else if (itemName === '史料：二進宮') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">《二進宮》</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723] text-justify">
                明代故事戲。敘明穆宗死後，太子年幼，李艷妃垂簾聽政，其父李良謀篡，初李妃亦欲讓帝位，後李良封鎖昭陽院，李妃始悟其奸，獨居悔嘆。徐彥昭、楊波二進宮進諫，李妃悟，遂以國事相託。後楊波領兵，誅斬李良。
            </p>
        `;
    }
    else if (itemName === '史料：三娘教子') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">《三娘教子》</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723] text-justify">
                明代故事戲。鋪演薛子羅出外遭友人誣陷佯稱已喪命，家道中落，元配與大妾紛紛改嫁，唯有三娘王春娥立誓守節，代為撫養二娘所生之子薛義。薛義貪玩不學，三娘責之，反被辱罵，哭拜夫靈後決意求去。義僕薛保對薛義曉以人倫大義，教他悔改請罪，終於勸回春娥。二娘改嫁不順，見子羅衣錦榮歸，求他收留，子羅遂於馬前潑水......薛子羅假意試探三娘貞節，三娘怒拒之，薛義高中狀元返家，一家團圓。
            </p>
        `;
    }
    else if (itemName === '史料：祭江') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">《祭江》</h3>
            <p class="text-left text-lg leading-relaxed font-serif text-[#3e2723] text-justify">
                青衣重頭唱功戲，後來多只演《祭江》一折。黃桂秋改編過全本《別宮・祭江》。《三國演義》第八十四回描寫關羽、張飛死後，劉備一心為關、張報仇，執意攻打東吳，結果大敗，逃到白帝城。當時其夫人孫尚香在東吳，聽說劉備已死，遂驅車至江邊，望西遙哭，投江而死。戲曲所演內容即本於此，但較之小說要豐富些。早年京劇往往連演《別宮》和《祭江》兩折，統稱《別宮・祭江》。
            </p>
        `;
    }
	else if (itemName === '名詞解釋冊') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">名詞解釋冊</h3>
            <div class="text-left text-sm md:text-base leading-relaxed font-serif text-[#3e2723] space-y-3 max-h-[60vh] overflow-y-auto pr-2 text-justify">
                <p><strong>飲墨水：</strong>藝旦到了14、15歲就會被帶到文風鼎盛的南部修習吸取經驗，再回到北部執業。</p>
                <p><strong>壓菸盤：</strong>藝旦出來分送菸，最後一根給的人就是其選定願意陪的人，而後因管制政策，將菸改為瓜子或蜜餞等等。</p>
                <p><strong>番仔酒矸：</strong>不賺日本人的錢。</p>
                <p><strong>檢番：</strong>檢查妓女身體狀況的機構，日本政府規定藝旦、藝伎要加入共同組織（娼妓不得參加），目的在為了保護男性健康。</p>
                <p><strong>朝鮮樓：</strong>1920年代帝國朝鮮境內的經濟在一戰後不斷惡化，貧苦家庭只得賣女為娼，這些女子再被朝鮮業者遠賣，臺灣即朝鮮婦女被販賣的海外目的地之一。每年被大量拐騙到海外的朝鮮婦女多是被當地的人口販運組織以「利誘」、「求職」等方法，販賣給海外的貸座敷業者，或「慰安所」內。</p>
                <p><strong>藝閣：</strong>早期藝閣多由民間挑選面容姣好的童男、童女，或由數名藝旦扮裝組成，規模較小，主要由四至八名壯漢以人力扛抬巡遊街市，進入日治時期後，主要集中於神明誕辰、迎神賽會與大型博覽會中展出。</p>
                <p><strong>藝旦戲：</strong>又稱「查某戲」，是指日治時期由藝旦擔綱、角色全由女性演員包辦反串的戲劇演出形式。</p>
                <p><strong>《我們的竹東》：</strong>據說為台灣第一本寫真集，當時的日籍竹東街長（鎮長）吉田三三郎，召集全鎮紅極一時的四十二位酒家女拍攝寫真，集結成冊，送往戰區，盼給出征戰士勇氣。</p>
            </div>
        `;
    }
	else if (itemName === '藝旦小故事史料') {
        textContent = `
            <h3 class="text-2xl font-bold text-center mb-4 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">藝旦小故事史料</h3>
            <div class="text-left text-sm md:text-base leading-relaxed font-serif text-[#3e2723] space-y-3 max-h-[60vh] overflow-y-auto pr-2 text-justify">
                <p><strong>阿珠：</strong>藝旦阿珠，三歲時，養於姑母家。時其姑丈王某，惑於蕩婦，鳩佔鵲巢，遂勒珠之姑母大歸。後王某因商業閉歇，珠采桑摘茶，猶一村娃耳，王某復惑於婦言，迫阿珠抱琵琶，學歌舞。不習，常遭摧折，及藝成，名噪遐邇。</p>
                <p><strong>小夜子：</strong>小夜子，芳年十九，命薄桃花，貌似芙蓉，工愁善病，頗有孝思。論其身世，代為淒其，該妓為寶琴苗媳。寶琴與其情郎，桃之夭夭，棄父母於不顧，又拋棄幼女，殘忍不堪。桂時年十歲，未諳世味，迫於家計，竟作雛妓，長抱琵琶，隨其老媽，漂泊東墩。嗟呼！嬌小不知離別苦，琵琶聲裡唱陽關。</p>
                <p><strong>小雲珍：</strong>家庭環境貧窮，日食難度，弟妹尚幼，一朝冷落，援手無人，世多錦上添花，孰是雪中送炭。環境如斯，人情冷暖，小雲珍年十三，憂感家道之蕭條，經濟之艱困，一家七人，將作餓鬼，固棄讀書弟子，自願下海為藝妓，兒願墜落汙泥，犧牲潔身，以救一家之命；且可補助弟妹學資，養成後秀，振起家聲，較為良策。</p>
                <p><strong>阿粉：</strong>早隸某班，善青衣，嗣該班既歇，遂樹幟。</p>
                <p><strong>保治：</strong>父郭某本崁城考棚口人，業商失敗，流落東墩，俄病殆，保治時十六歲，遂溺苦海。</p>
                <p><strong>寶卻：</strong>十四歲時畢業於蓬萊女學堂，就傭某郵便局，旋以重聽辭職。母施香原亦門戶中人，遂使學曲，以繼舊業，雖曰家學淵源，亦可謂紅顏薄命。</p>
                <p><strong>鳳嬌：</strong>父林某艱於家計，鬻身與稻江老阿香為苗媳，香有女名金滿，素營皮肉生涯，嬌入門，遂迫令學曲，不從則威以夏楚，嬌不堪其處，墜樓幾死，後乃屈從。</p>
                <p><strong>阿碧：</strong>父吳某，為北勢街人，家貧不能度活，不得已，使碧賣俏。</p>
            </div>
        `;
    }
	

    if (imgSrc !== '' || textContent !== '') {
        closeAllModals(); 
        document.getElementById('modal-overlay').classList.add('active');
        document.getElementById('photo-modal').classList.add('active');
        document.getElementById('btn-enter-puzzle').classList.add('hidden'); 
        
        const yidanBtn = document.getElementById('btn-enter-yidan');
        if (yidanBtn) {
            if (itemName === '《乞食開藝旦歌》') {
                yidanBtn.classList.remove('hidden');
            } else {
                yidanBtn.classList.add('hidden');
            }
        }
        
        const imgEl = document.getElementById('inspected-photo');
        const textEl = document.getElementById('inspected-text');
        
        if (textContent !== '') {
            imgEl.classList.add('hidden');
            textEl.classList.remove('hidden');
            textEl.innerHTML = textContent;
        } else {
            textEl.classList.add('hidden');
            imgEl.classList.remove('hidden');
            imgEl.src = imgSrc;
            
            if (itemName === '《乞食開藝旦歌》') {
                imgEl.className = "max-w-[95vw] max-h-[80vh] w-auto h-[80vh] border-8 border-white shadow-2xl rounded-sm mb-16";
            } else if (itemName.startsWith('史料：')) {
                imgEl.className = "max-w-[95vw] max-h-[85vh] w-auto border-8 border-[#e6d3af] shadow-2xl rounded-sm";
            } else {
                imgEl.className = "max-w-full max-h-[70vh] border-8 border-white shadow-2xl rounded-sm";
            }
        }
        
        const closeBtn = document.querySelector('#photo-modal button');
        if (itemName === '2018舊照片') {
            if(closeBtn) closeBtn.classList.remove('hidden'); 
            document.getElementById('dialog-box').style.zIndex = '350'; 
            startDialog('inspectPhoto');
        } else {
            if(closeBtn) closeBtn.classList.remove('hidden');
        }
        state.inspectingItem = itemName;
        state.sourceModal = source; 
    }
	
}

function closePhotoModal() {
    stopTypewriter();
    document.getElementById('photo-modal').classList.remove('active');
    const closedItem = state.inspectingItem;
    
    if (closedItem === '2018舊照片' || (closedItem === '《乞食開藝旦歌》' && state.sourceModal === 'system')) {
        document.getElementById('dialog-box').style.display = 'none';
        document.getElementById('dialog-box').style.zIndex = '50';
        clearTimeout(state.typingTimeout);
        state.isTyping = false;
        
        state.inspectingItem = null; 
        document.getElementById('modal-overlay').classList.remove('active');
        
      if (closedItem === '2018舊照片' && (state.unlockedLevel < 2 || state.currentScene === 'scene-wedding')) {
    enterMapPuzzle();
}
    } else {
        document.getElementById('dialog-box').style.zIndex = '50';
        state.inspectingItem = null;
        
        if (state.sourceModal === 'notebook') {
            document.getElementById('notebook-modal').classList.add('active');
        } else if (state.sourceModal === 'inventory') {
            document.getElementById('inventory-modal').classList.add('active');
        } else {
            document.getElementById('modal-overlay').classList.remove('active');
        }
    }
}

function triggerPhotoPuzzle(puzzleTarget) {
    closeAllModals();
    if (puzzleTarget === 'lian') enterPoemPuzzle();
    else if (puzzleTarget === 'luo') enterLuoPuzzle();
    else if (puzzleTarget === 'xie') enterXiePuzzle();
}

function triggerYidanUnlock() {
    closeAllModals();
    const container = document.getElementById('yidan-input-container');
    const input = document.getElementById('yidan-input');
    input.value = '';
    document.getElementById('yidan-input-error').classList.add('hidden');
    container.classList.remove('hidden');
}

function checkYidanInput() {
    const input = document.getElementById('yidan-input').value.trim();
    if (input === '藝旦') {
    document.getElementById('yidan-input-container').classList.add('hidden');
    playSFX('sfx-door'); // ★ 播放開門音效
    unlockNextLevel(4, "🔓 解鎖新章節：第三章 藝旦間！");
        
        const effect = document.getElementById('unlock-effect');
        effect.classList.remove('hidden');
        
        setTimeout(() => {
            effect.classList.remove('opacity-0');
            effect.classList.add('opacity-100');
        }, 50);

        setTimeout(() => { 
            effect.classList.remove('opacity-100');
            effect.classList.add('opacity-0');
            setTimeout(() => {
                effect.classList.add('hidden');
                enterYidanRoom();
            }, 1000); 
        }, 1500); 
    } else {
        document.getElementById('yidan-input-error').classList.remove('hidden');
    }
}

function updateModals() {
    const chapterOrder = ['序章：時空交錯', '第一章：寶美樓', '第二章：江山樓', '第三章：藝旦間', '其他資料'];

    const nbContent = document.getElementById('notebook-content');
    if (state.notebook.length > 0) {
        const groupedNb = {};
        state.notebook.forEach(item => {
            const ch = getItemChapter(item.name);
            if (!groupedNb[ch]) groupedNb[ch] = [];
            groupedNb[ch].push(item);
        });

        nbContent.innerHTML = chapterOrder
            .filter(ch => groupedNb[ch] && groupedNb[ch].length > 0)
            .map(ch => `
                <div class="col-span-1 md:col-span-2 bg-[#c7a974]/60 border-2 border-[#5a3c28] rounded-lg p-4 mb-2 shadow-inner">
                    <h3 class="text-lg font-black text-[#3e2723] mb-3 pb-1 border-b-2 border-[#8b5a2b] flex items-center">
                        <i class="fas fa-folder-open mr-2 text-[#8b0000]"></i>${ch}
                        <span class="ml-2 text-xs bg-[#5a3c28] text-[#e2cda6] px-2 py-0.5 rounded-full">${groupedNb[ch].length}</span>
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${groupedNb[ch].map(item => {
                            const nonClickable = ['連雅堂(關係:故友)', '羅秀惠(關係:惡緣)', '謝介石(關係:丈夫)'].includes(item.name);
                            const classes = nonClickable
                                ? "bg-white bg-opacity-50 p-3 border border-[#5a3c28] rounded shadow cursor-default"
                                : "bg-white bg-opacity-50 p-3 border border-[#5a3c28] rounded shadow cursor-pointer hover:bg-white hover:bg-opacity-80 transition";
                            const clickEvent = nonClickable ? "" : `onclick="inspectItem('${item.name}', 'notebook')"`;
                            return `
                                <div class="${classes}" ${clickEvent}>
                                    <h4 class="font-bold text-[#3e2723] mb-1 border-b border-[#a37c4d] pb-1">${item.name}</h4>
                                    <p class="text-sm text-gray-800">${item.desc}</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('');
    } else {
        nbContent.innerHTML = `<p class="text-gray-600 italic col-span-2">尚未收集到任何線索...</p>`;
    }

    const invContent = document.getElementById('inventory-content');
    if (state.inventory.length > 0) {
        const groupedInv = {};
        state.inventory.forEach(item => {
            const ch = getItemChapter(item.name);
            if (!groupedInv[ch]) groupedInv[ch] = [];
            groupedInv[ch].push(item);
        });

        invContent.innerHTML = chapterOrder
            .filter(ch => groupedInv[ch] && groupedInv[ch].length > 0)
            .map(ch => `
                <div class="col-span-2 md:col-span-4 bg-[#c7a974]/60 border-2 border-[#5a3c28] rounded-lg p-4 mb-2 shadow-inner">
                    <h3 class="text-lg font-black text-[#3e2723] mb-3 pb-1 border-b-2 border-[#8b5a2b] flex items-center">
                        <i class="fas fa-folder-open mr-2 text-[#8b0000]"></i>${ch}
                        <span class="ml-2 text-xs bg-[#5a3c28] text-[#e2cda6] px-2 py-0.5 rounded-full">${groupedInv[ch].length}</span>
                    </h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        ${groupedInv[ch].map(item => {
                            const isCard = item.name.includes('字卡');
                            const iconClass = isCard
                                ? 'fa-ticket-alt'
                                : (item.name.includes('史料') || item.name.includes('菜單') || item.name.includes('歌') || item.name.includes('菜色'))
                                    ? 'fa-scroll'
                                    : 'fa-box';
                            return `
                                <div class="bg-white bg-opacity-50 p-3 border border-[#5a3c28] rounded flex flex-col items-center text-center shadow transition ${isCard ? 'cursor-default' : 'cursor-pointer hover:bg-white hover:bg-opacity-80'}" ${isCard ? '' : `onclick="inspectItem('${item.name}', 'inventory')"`}>
                                    <i class="fas ${iconClass} text-3xl text-[#5a3c28] mb-2"></i>
                                    <span class="font-bold text-sm text-[#3e2723]">${item.name}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('');
    } else {
        invContent.innerHTML = `<p class="text-gray-600 italic col-span-4">道具欄是空的...</p>`;
    }
    
    document.getElementById('notebook-count').innerText = state.notebook.length;
    document.getElementById('inventory-count').innerText = state.inventory.length;
    updatePortraitProgress(); // ★ 加入這行

}

function toggleModal(modalId) {
    closeAllModals();
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById(modalId).classList.add('active');
}

function closeAllModals() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    
    if (state.inspectingItem === '2018舊照片') {
        document.getElementById('dialog-box').style.display = 'none';
        document.getElementById('dialog-box').style.zIndex = '50';
        clearTimeout(state.typingTimeout);
        state.isTyping = false;
        
        state.inspectingItem = null; 
        if (state.unlockedLevel < 2 || state.currentScene === 'scene-wedding') {
    enterMapPuzzle();
}

    } else {
        document.getElementById('dialog-box').style.zIndex = '50';
        state.inspectingItem = null;
        state.sourceModal = null;
    }
}

// ==========================================
// ★ 共用樓層切換與密碼輸入邏輯
// ==========================================
let currentTargetFloor = '';

function promptFloorSelect(targetScene, correctPassword) {
    currentTargetFloor = { scene: targetScene, pwd: correctPassword };
    
    const container = document.getElementById('general-input-container');
    const title = document.getElementById('general-input-title');
    const desc = document.getElementById('general-input-desc');
    const input = document.getElementById('general-input');
    
    title.innerText = '樓層選擇';
    desc.innerText = '你將前往......樓(請輸入數字1-10或頂樓)';
    input.value = '';
    document.getElementById('general-input-error').classList.add('hidden');
    
    document.getElementById('btn-general-submit').onclick = checkFloorSelect;
    
    container.style.display = 'block';
}

function checkFloorSelect() {
    const input = document.getElementById('general-input').value.trim();
    if (input === currentTargetFloor.pwd) {
        hideGeneralInput();
        showNotification("樓層切換成功！");
        switchScene(currentTargetFloor.scene);
    } else {
        document.getElementById('general-input-error').classList.remove('hidden');
    }
}

function showBathPuzzle() {
    const container = document.getElementById('general-input-container');
    const title = document.getElementById('general-input-title');
    const desc = document.getElementById('general-input-desc');
    const input = document.getElementById('general-input');
    
    title.innerText = '浴廁密碼鎖';
    desc.innerText = '請輸入三位數密碼以解開機關';
    input.value = '';
    document.getElementById('general-input-error').classList.add('hidden');
    
    document.getElementById('btn-general-submit').onclick = checkBathPuzzle;
    
    container.style.display = 'block';
}

function checkBathPuzzle() {
    const input = document.getElementById('general-input').value.trim();
    if (input === '331') {
        hideGeneralInput();
        showNotification("✅ 成功解開密碼鎖，獲得「江山樓裕仁皇太子來臺御宴菜單」與「說菜單」！");
        collectItem('item', '裕仁皇太子來臺御宴菜單', '江山樓筵席的十四道菜色清單。', null, false);
        collectItem('item', '說菜單', '記載著隱去關鍵字的說菜單。', null, false);
        
        switchScene('scene-room2');
        startDialog('bathPuzzleSolved');
    } else {
        document.getElementById('general-input-error').classList.remove('hidden');
    }
}

function hideGeneralInput() {
    document.getElementById('general-input-container').style.display = 'none';
}

// --- 寶美樓機關 ---
function showPuzzle() {
    if (state.notebook.length < 3) {
        showNotification("⚠️ 似乎還有些線索沒有找齊...");
        return;
    }
    document.getElementById('puzzle-input-container').style.display = 'block';
    document.getElementById('puzzle-input').value = '';
    document.getElementById('puzzle-error').classList.add('hidden');
}
function hidePuzzle() { document.getElementById('puzzle-input-container').style.display = 'none'; }

function checkPuzzle() {
    const input = document.getElementById('puzzle-input').value.trim();
   if (input === '江山樓') { 
    hidePuzzle();
    playSFX('sfx-door'); // ★ 播放開門音效
    unlockNextLevel(3, "🔓 解鎖新章節：第二章 江山樓！");
       
	   const effect = document.getElementById('unlock-effect');
        effect.classList.remove('hidden');
        
        setTimeout(() => {
            effect.classList.remove('opacity-0');
            effect.classList.add('opacity-100');
        }, 50);

        setTimeout(() => { 
            effect.classList.remove('opacity-100');
            effect.classList.add('opacity-0');
            setTimeout(() => {
                effect.classList.add('hidden');
                enterRoom2(); 
            }, 1000); 
        }, 1500); 
    } else {
        document.getElementById('puzzle-error').classList.remove('hidden');
    }
}

function enterRoom1(isBack = false) { 
    switchScene('scene-room1', isBack);
    changeBGM('安平追想曲.mp3');
    if (!isBack) {
        document.getElementById('dialog-box').style.display = 'none';
        showCharacter('NPC1.png');
        setTimeout(() => {
            startDialog('room1Intro', () => hideCharacter());
        }, 600);
    }
}
function enterRoom2() { 
    switchScene('scene-room2'); 
    startDialog('room2Intro'); 
}

// ==========================================
// ★ 羅秀惠詩箋 - 賓果解謎機制
// ==========================================
state.luoPuzzleInitialized = false;
let luoSelected = []; 
let isLuoSolved = false;

function enterLuoPuzzle(isBack = false) {
    switchScene('scene-luo-puzzle', isBack);
    if (!state.luoPuzzleInitialized) {
        luoSelected = [];
        isLuoSolved = false;
        document.getElementById("luo-status-hint").innerText = "點擊格子找出正確的數字密碼……";
        initLuoGrid();
        state.luoPuzzleInitialized = true;
    }
}

function initLuoGrid() {
    const poemGrid = document.getElementById("luo-poem-grid");
    poemGrid.innerHTML = "";
    const luoLines = [
        "惡緣錯認是良緣",
        "空自深閨鎮日嗔",
        "真個黃金為世界",
        "多姿畢竟遜多錢"
    ];
    luoLines.forEach((line, r) => {
        const rowEl = document.createElement("div");
        rowEl.className = "flex items-center gap-1";
        line.split("").forEach((char, c) => {
            const cell = document.createElement("div");
            cell.style.width = `36px`;
            cell.style.height = `36px`;
            cell.className = "flex items-center justify-center font-bold text-base rounded border border-stone-400/40 bg-[#f4e8d3]/60 text-stone-800 transition-colors select-none box-border";
            cell.innerText = char;
            cell.id = `luo-poem-${r}-${c}`;
            rowEl.appendChild(cell);
        });
        poemGrid.appendChild(rowEl);
    });

    const bingoGrid = document.getElementById("luo-bingo-grid");
    bingoGrid.innerHTML = "";
    const bingoNumbers = [
        [1, 10, 20, 27, 26, 19, 3],
        [15, 23, 11, 2, 6, 14, 22],
        [24, 4, 7, 16, 12, 25, 17],
        [8, 18, 13, 28, 5, 21, 9]
    ];
    
    const staticCircles = [20, 27, 26, 24, 7, 12, 25];
    const horizontalCross = [15, 23, 11, 2, 6, 14, 22, 8, 18, 13, 28, 5, 21, 9, 3, 17];
    const verticalCross = [3, 22, 17, 9];
    const interactable = [1, 4, 10, 16, 19];

    bingoNumbers.forEach(row => {
        const rowEl = document.createElement("div");
        rowEl.className = "flex";
        row.forEach(num => {
            const cell = document.createElement("div");
            cell.className = "bingo-cell border-r border-b border-[#5a3c28] relative";
            cell.id = `luo-bingo-${num}`;
            
            const spanNum = document.createElement("span");
            spanNum.innerText = num;
            spanNum.className = "z-10";
            cell.appendChild(spanNum);
            
            if (staticCircles.includes(num)) {
                cell.classList.add("bingo-circled"); 
            } else if (interactable.includes(num)) {
                cell.classList.add("bingo-interactable");
                cell.onclick = () => toggleLuoCircle(num);
            } else {
                if (horizontalCross.includes(num)) {
                    cell.classList.add("bingo-crossed");
                }
                if (verticalCross.includes(num)) {
                    const vLine = document.createElement("div");
                    vLine.className = "absolute top-[-2px] bottom-[-2px] left-1/2 w-[2px] bg-[#3e2723] -translate-x-1/2 z-0";
                    cell.appendChild(vLine);
                }
            }
            rowEl.appendChild(cell);
        });
        bingoGrid.appendChild(rowEl);
    });
}

function updateLuoUI() {
    const interactable = [1, 4, 10, 16, 19];
    interactable.forEach(num => {
        const cell = document.getElementById(`luo-bingo-${num}`);
        if (!cell) return;
        const badges = cell.querySelectorAll('.order-badge');
        badges.forEach(b => b.remove());
        const index = luoSelected.indexOf(num);
        if (index > -1) {
            cell.classList.add('bingo-circled');
            const badge = document.createElement('span');
            badge.className = "order-badge absolute -top-1 -right-1 bg-red-800 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center z-20 shadow";
            badge.innerText = index + 1;
            cell.appendChild(badge);
        } else {
            cell.classList.remove('bingo-circled');
        }
    });
}

function toggleLuoCircle(num) {
    if (isLuoSolved) return;
    const index = luoSelected.indexOf(num);
    if (index > -1) {
        luoSelected.splice(index, 1);
    } else {
        if (luoSelected.length >= 3) {
            showNotification("最多只能圈選 3 個數字！請先取消其他圈選。");
            return;
        }
        luoSelected.push(num);
    }
    updateLuoUI();
    
    if (luoSelected.length === 3) {
        setTimeout(checkLuoWin, 300);
    }
}

function checkLuoWin() {
    if (isLuoSolved) return;
    if (luoSelected.length !== 3) return;
    
    if (luoSelected[0] === 4 && luoSelected[1] === 19 && luoSelected[2] === 16) {
        document.getElementById('luo-input-container').style.display = 'block';
        document.getElementById('luo-puzzle-input').value = '';
        document.getElementById('luo-puzzle-error').classList.add('hidden');
    } else {
        deductTime(5);
        showNotification("數字或順序似乎不太對，扣除 5 秒！請重新思考...");
        resetLuoPuzzle(); 
    }
}

function checkLuoInput() {
    const input = document.getElementById('luo-puzzle-input').value.trim();
    if (input === '惡緣') {
        hideLuoInput();
        isLuoSolved = true;
        document.getElementById('luo-poem-0-0').classList.add('target-glow');
        document.getElementById('luo-poem-0-1').classList.add('target-glow');

        document.getElementById("luo-status-hint").innerHTML = `<span class="text-amber-400 font-bold"><i class="fa-solid fa-circle-check mr-1"></i> 謎題解開！獲得一張紙條。</span>`;
        setTimeout(() => { document.getElementById("modal-luo-clue").classList.remove("hidden"); }, 800);
    } else {
        deductTime(5);
        document.getElementById('luo-puzzle-error').classList.remove('hidden');
    }
}

function hideLuoInput() {
    const el = document.getElementById('luo-input-container');
    if (el) el.style.display = 'none';
}

function resetLuoPuzzle() {
    if (isLuoSolved) return;
    luoSelected = [];
    updateLuoUI();
}

function stepToLuoCardReward() {
    document.getElementById("modal-luo-clue").classList.add("hidden");
    setTimeout(() => { document.getElementById("modal-luo-card").classList.remove("hidden"); }, 300);
}

function storeLuoToInventory() {
    document.getElementById("modal-luo-clue").classList.add("hidden");
    collectItem('item', '字卡(G0_)', '從羅秀惠詩箋機關獲得的字卡。', null, false);
    collectItem('clue', '羅秀惠紙條', '記載著蔡姑娘三角關係的紙條。', null, false);
    renameClue('羅秀惠(照片)', '羅秀惠(關係:惡緣)');
    closeAllModals();
    
    goBack(); 
}

// ==========================================
// ★ 連雅堂詩箋 方塊拼圖機制
// ==========================================
const poemLines = [
    "白雲秋水雁來聲", "可記今宵月正明", "黃浦灘頭逢故友", "松花江畔話離情",
    "清尊評句推林叟", "雙葉題詩寄曼卿", "十載此懷消未得", "幾回翹首望蓬瀛"
];
const CELL_SIZE = 36;
const GAP = 4;
const pieceDefinitions = [
    { id: 1, coords: [{r:0,c:0}, {r:0,c:1}, {r:0,c:2}, {r:0,c:3}, {r:1,c:0}, {r:1,c:1}], trayPos: {x: 15, y: 15} },
    { id: 2, coords: [{r:0,c:4}, {r:0,c:5}, {r:0,c:6}, {r:1,c:4}, {r:1,c:5}, {r:1,c:6}], trayPos: {x: 180, y: 15} },
    { id: 3, coords: [{r:1,c:2}, {r:1,c:3}, {r:2,c:2}, {r:2,c:3}, {r:2,c:4}], trayPos: {x: 310, y: 15} },
    { id: 4, coords: [{r:2,c:0}, {r:2,c:1}, {r:3,c:0}, {r:3,c:1}, {r:3,c:2}, {r:3,c:3}], trayPos: {x: 15, y: 95} },
    { id: 5, coords: [{r:3,c:4}, {r:3,c:5}, {r:3,c:6}, {r:4,c:4}, {r:4,c:5}, {r:4,c:6}], trayPos: {x: 180, y: 95} },
    { id: 6, coords: [{r:4,c:0}, {r:4,c:1}, {r:5,c:0}, {r:5,c:1}, {r:5,c:2}], trayPos: {x: 310, y: 95} },
    { id: 7, coords: [{r:4,c:2}, {r:4,c:3}, {r:5,c:3}, {r:5,c:4}, {r:6,c:3}], trayPos: {x: 15, y: 185} },
    { id: 8, coords: [{r:5,c:5}, {r:5,c:6}, {r:6,c:4}, {r:6,c:5}, {r:6,c:6}], trayPos: {x: 180, y: 185} },
    { id: 9, coords: [{r:6,c:0}, {r:6,c:1}, {r:6,c:2}, {r:7,c:0}, {r:7,c:1}, {r:7,c:2}], trayPos: {x: 310, y: 185} },
    { id: 10, coords: [{r:7,c:3}, {r:7,c:4}, {r:7,c:5}, {r:7,c:6}], trayPos: {x: 120, y: 275} }
];

let targetChars = [];
let lockedPieces = new Set();
let isPoemSolved = false;
let poemPuzzleInitialized = false;

function enterPoemPuzzle(isBack = false) {
    switchScene('scene-poem-puzzle', isBack);
    if (!poemPuzzleInitialized) {
        targetChars = [];
        lockedPieces.clear();
        isPoemSolved = false;
        document.getElementById("piece-counter").innerText = `0 / 10`;
        document.getElementById("status-hint").innerText = "覆蓋方塊以探得線索……";
        
        initPoemGrid();
        setTimeout(() => { createPieces(); }, 100);
        poemPuzzleInitialized = true;
    } else {
        window.dispatchEvent(new Event('resize'));
    }
}

function initPoemGrid() {
    const grid = document.getElementById("poem-grid");
    grid.innerHTML = "";
    poemLines.forEach((line, r) => {
        const rowEl = document.createElement("div");
        rowEl.className = "flex items-center gap-1";
        line.split("").forEach((char, c) => {
            const cell = document.createElement("div");
            cell.style.width = `${CELL_SIZE}px`;
            cell.style.height = `${CELL_SIZE}px`;
            cell.className = "flex items-center justify-center font-bold text-base rounded border border-stone-400/40 bg-[#f4e8d3]/60 text-stone-800 transition-colors select-none box-border";
            cell.innerText = char;
            cell.id = `cell-${r}-${c}`;
            if (r === 2 && (c === 5 || c === 6)) { targetChars.push(cell); }
            rowEl.appendChild(cell);
        });
        grid.appendChild(rowEl);
    });
}

function createPieces() {
    pieceDefinitions.forEach(p => {
        const minR = Math.min(...p.coords.map(c => c.r));
        const maxR = Math.max(...p.coords.map(c => c.r));
        const minC = Math.min(...p.coords.map(c => c.c));
        const maxC = Math.max(...p.coords.map(c => c.c));
        const rows = maxR - minR + 1;
        const cols = maxC - minC + 1;
        p.minR = minR; p.minC = minC; p.rows = rows; p.cols = cols;

        const pieceEl = document.createElement("div");
        pieceEl.id = `piece-${p.id}`;
        pieceEl.className = "tetris-piece";
        pieceEl.style.gridTemplateRows = `repeat(${rows}, ${CELL_SIZE}px)`;
        pieceEl.style.gridTemplateColumns = `repeat(${cols}, ${CELL_SIZE}px)`;
        pieceEl.style.gap = `${GAP}px`;
        pieceEl.style.width = `${cols * CELL_SIZE + (cols - 1) * GAP}px`;
        pieceEl.style.height = `${rows * CELL_SIZE + (rows - 1) * GAP}px`;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hasBlock = p.coords.some(pt => (pt.r - minR) === r && (pt.c - minC) === c);
                const cellDiv = document.createElement("div");
                if (hasBlock) cellDiv.className = "block-cell rounded-sm";
                else cellDiv.style.visibility = "hidden";
                pieceEl.appendChild(cellDiv);
            }
        }
        document.getElementById("scene-poem-puzzle").appendChild(pieceEl);
        positionInTray(pieceEl, p, false);
        makeDraggable(pieceEl, p);
    });
}

function positionInTray(el, pieceDef, animated = true) {
    const tray = document.getElementById("tray-area");
    const scene = document.getElementById("scene-poem-puzzle");
    const tRect = tray.getBoundingClientRect();
    const sRect = scene.getBoundingClientRect();
    if (animated) el.style.transition = "left 0.25s ease-out, top 0.25s ease-out";
    else el.style.transition = "none";
    el.style.left = `${tRect.left - sRect.left + pieceDef.trayPos.x}px`;
    el.style.top = `${tRect.top - sRect.top + pieceDef.trayPos.y}px`;
    el.classList.remove("piece-docked");
    if (animated) setTimeout(() => { el.style.transition = "none"; }, 250);
}

function getTargetLocalPos(pieceDef) {
    const anchorCell = document.getElementById(`cell-${pieceDef.minR}-${pieceDef.minC}`);
    const scene = document.getElementById("scene-poem-puzzle");
    if (!anchorCell || !scene) return null;
    const aRect = anchorCell.getBoundingClientRect();
    const sRect = scene.getBoundingClientRect();
    return { x: aRect.left - sRect.left, y: aRect.top - sRect.top };
}

function makeDraggable(el, pieceDef) {
    let isDragging = false;
    let startClientX, startClientY, initialLeft, initialTop;
    function onStart(e) {
        if (isPoemSolved) return;
        if (lockedPieces.has(pieceDef.id)) {
            lockedPieces.delete(pieceDef.id);
            el.classList.remove("piece-docked");
            document.getElementById("piece-counter").innerText = `${lockedPieces.size} / 10`;
        }
        isDragging = true;
        el.style.transition = "none";
        el.style.zIndex = 100;
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        startClientX = clientX; startClientY = clientY;
        initialLeft = el.offsetLeft; initialTop = el.offsetTop;
        window.addEventListener('mousemove', onMove, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onEnd);
    }
    function onMove(e) {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        el.style.left = `${initialLeft + (clientX - startClientX)}px`;
        el.style.top = `${initialTop + (clientY - startClientY)}px`;
    }
    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        el.style.zIndex = 40;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchend', onEnd);
        window.removeEventListener('touchcancel', onEnd);
        checkSnap(el, pieceDef);
    }
    el.addEventListener('mousedown', onStart);
    el.addEventListener('touchstart', onStart, { passive: false });
}

function checkSnap(el, pieceDef) {
    const targetPos = getTargetLocalPos(pieceDef);
    if (!targetPos) { positionInTray(el, pieceDef, true); return; }
    const curLeft = el.offsetLeft;
    const curTop = el.offsetTop;
    const dist = Math.hypot(curLeft - targetPos.x, curTop - targetPos.y);
    if (dist < 32) { 
        lockedPieces.add(pieceDef.id);
        el.style.transition = "left 0.15s ease-out, top 0.15s ease-out";
        el.style.left = `${targetPos.x}px`;
        el.style.top = `${targetPos.y}px`;
        el.classList.add("piece-docked");
        setTimeout(() => { el.style.transition = "none"; }, 150);
        document.getElementById("piece-counter").innerText = `${lockedPieces.size} / 10`;
        if (lockedPieces.size === 10) triggerPoemComplete();
    } else {
        positionInTray(el, pieceDef, true);
    }
}

function triggerPoemComplete() {
    isPoemSolved = true;
    targetChars.forEach(el => el.classList.add("target-glow"));
    document.getElementById("status-hint").innerHTML = `<span class="text-amber-400 font-bold"><i class="fa-solid fa-circle-check mr-1"></i> 印版合璧！「故友」亮起金色光芒！</span>`;
    
    setTimeout(() => { 
        collectItem('item', '字卡(RU;_)', '木板底層暗格彈出的字卡。', null, false);
        renameClue('連雅堂(照片)', '連雅堂(關係:故友)');
        closeAllModals();
        goBack();
    }, 1500);
}

function resetPoemPuzzle() {
    if (isPoemSolved) return;
    lockedPieces.clear();
    document.getElementById("piece-counter").innerText = `0 / 10`;
    targetChars.forEach(el => el.classList.remove("target-glow"));
    document.getElementById("status-hint").innerText = "覆蓋方塊以探得線索……";
    pieceDefinitions.forEach(p => {
        const el = document.getElementById(`piece-${p.id}`);
        positionInTray(el, p, true);
    });
}

window.onresize = () => {
    if (state.currentScene === 'scene-poem-puzzle' && poemPuzzleInitialized) {
        pieceDefinitions.forEach(p => {
            const el = document.getElementById(`piece-${p.id}`);
            if (!el) return;
            if (lockedPieces.has(p.id)) {
                const targetPos = getTargetLocalPos(p);
                if (targetPos) { el.style.left = `${targetPos.x}px`; el.style.top = `${targetPos.y}px`; }
            } else {
                positionInTray(el, p, false);
            }
        });
    }
    if (state.currentScene === 'scene-xie-puzzle' && xiePuzzleInitialized) {
        for(let i=1; i<=5; i++) {
            const el = document.getElementById(`passport-${i}`);
            if (!el) continue;
            if (xiePlacements[i] !== null) {
                const targetPos = getXieTargetLocalPos(xiePlacements[i]);
                if (targetPos) {
                    el.style.left = `${targetPos.x}px`;
                    el.style.top = `${targetPos.y}px`;
                }
            } else {
                const orderIndex = xieInitialOrder.indexOf(i);
                positionXieInTray(el, orderIndex, false);
            }
        }
    }
};

// ==========================================
// ★ 謝介石護照排序解謎機制
// ==========================================
let xiePuzzleInitialized = false;
let isXieSolved = false;
let xiePlacements = { 1: null, 2: null, 3: null, 4: null, 5: null };
let xieSlotOccupants = { 0: null, 1: null, 2: null, 3: null, 4: null };
let xieInitialOrder = []; 

function enterXiePuzzle(isBack = false) {
    switchScene('scene-xie-puzzle', isBack);
    if (!xiePuzzleInitialized) {
        isXieSolved = false;
        xiePlacements = { 1: null, 2: null, 3: null, 4: null, 5: null };
        xieSlotOccupants = { 0: null, 1: null, 2: null, 3: null, 4: null };
        
        xieInitialOrder = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
        
        createPassports();
        xiePuzzleInitialized = true;
    } else {
        window.dispatchEvent(new Event('resize'));
    }
}

function createPassports() {
    const scene = document.getElementById("scene-xie-puzzle");
    
    for (let i = 1; i <= 5; i++) {
        const passEl = document.createElement("div");
        passEl.id = `passport-${i}`;
        passEl.className = "passport-item bg-stone-200 border-4 border-stone-800 flex flex-col justify-center items-center text-stone-800 font-bold overflow-hidden cursor-pointer";
        passEl.innerHTML = `
            <img src="護照${i}.png" alt="護照${i}" class="w-full h-full object-cover absolute inset-0 z-0 opacity-80" onerror="this.style.display='none'">
        `;
        scene.appendChild(passEl);
        
        const orderIndex = xieInitialOrder.indexOf(i);
        positionXieInTray(passEl, orderIndex, false);
        makeXieDraggable(passEl, i);
    }
}

function positionXieInTray(el, orderIndex, animated = true) {
    const tray = document.getElementById("xie-tray");
    const scene = document.getElementById("scene-xie-puzzle");
    const tRect = tray.getBoundingClientRect();
    const sRect = scene.getBoundingClientRect();

    const itemW = el.offsetWidth || 80;
    const itemH = el.offsetHeight || 112;
    const sectionWidth = tRect.width / 5;
    const offsetX = (sectionWidth - itemW) / 2;
    const offsetY = (tRect.height - itemH) / 2;

    if (animated) el.style.transition = "left 0.25s ease-out, top 0.25s ease-out";
    else el.style.transition = "none";

    el.style.left = `${tRect.left - sRect.left + orderIndex * sectionWidth + offsetX}px`;
    el.style.top = `${tRect.top - sRect.top + offsetY}px`;

    if (animated) setTimeout(() => { el.style.transition = "none"; }, 250);
}

function getXieTargetLocalPos(slotIndex) {
    const slot = document.getElementById(`xie-slot-${slotIndex}`);
    const scene = document.getElementById("scene-xie-puzzle");
    if (!slot || !scene) return null;
    
    const aRect = slot.getBoundingClientRect();
    const sRect = scene.getBoundingClientRect();
    return { x: aRect.left - sRect.left, y: aRect.top - sRect.top };
}

function makeXieDraggable(el, id) {
    let isDragging = false;
    let startClientX, startClientY, initialLeft, initialTop;
    let startTime = 0; 
    
    function onStart(e) {
        if (isXieSolved) return;
        
        startTime = new Date().getTime();
        startClientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        startClientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        
        const oldSlot = xiePlacements[id];
        if (oldSlot !== null) {
            xieSlotOccupants[oldSlot] = null;
            xiePlacements[id] = null;
        }

        isDragging = true;
        el.style.transition = "none";
        el.style.zIndex = 100;
        
        initialLeft = el.offsetLeft; initialTop = el.offsetTop;
        
        window.addEventListener('mousemove', onMove, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onEnd);
    }
    
    function onMove(e) {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        el.style.left = `${initialLeft + (clientX - startClientX)}px`;
        el.style.top = `${initialTop + (clientY - startClientY)}px`;
    }
    
    function onEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        el.style.zIndex = 40;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchend', onEnd);
        window.removeEventListener('touchcancel', onEnd);
        
        let endClientX = e.type.includes('touch') ? (e.changedTouches ? e.changedTouches[0].clientX : startClientX) : e.clientX;
        let endClientY = e.type.includes('touch') ? (e.changedTouches ? e.changedTouches[0].clientY : startClientY) : e.clientY;
        
        const dist = Math.hypot(endClientX - startClientX, endClientY - startClientY);
        const timeElapsed = new Date().getTime() - startTime;

        if (dist < 10 && timeElapsed < 300) {
            showPassportDetail(id);
            checkXieSnap(el, id);
        } else {
            checkXieSnap(el, id);
        }
    }
    
    el.addEventListener('mousedown', onStart);
    el.addEventListener('touchstart', onStart, { passive: false });
}

function checkXieSnap(el, id) {
    const curLeft = el.offsetLeft;
    const curTop = el.offsetTop;
    
    let snappedSlot = -1;
    let minDistance = 50; 

    for (let i = 0; i < 5; i++) {
        const targetPos = getXieTargetLocalPos(i);
        if (targetPos) {
            const dist = Math.hypot(curLeft - targetPos.x, curTop - targetPos.y);
            if (dist < minDistance) {
                minDistance = dist;
                snappedSlot = i;
            }
        }
    }

    if (snappedSlot !== -1) {
        const occupantId = xieSlotOccupants[snappedSlot];
        if (occupantId !== null && occupantId !== id) {
            const occupantEl = document.getElementById(`passport-${occupantId}`);
            xiePlacements[occupantId] = null;
            const occupantOrderIndex = xieInitialOrder.indexOf(occupantId);
            positionXieInTray(occupantEl, occupantOrderIndex, true);
        }

        xiePlacements[id] = snappedSlot;
        xieSlotOccupants[snappedSlot] = id;
        
        const finalPos = getXieTargetLocalPos(snappedSlot);
        el.style.transition = "left 0.15s ease-out, top 0.15s ease-out";
        el.style.left = `${finalPos.x}px`;
        el.style.top = `${finalPos.y}px`;
        setTimeout(() => { el.style.transition = "none"; }, 150);
    } else {
        const orderIndex = xieInitialOrder.indexOf(id);
        positionXieInTray(el, orderIndex, true);
    }
}

function showPassportDetail(id) {
    const detailModal = document.getElementById('passport-detail-modal');
    const detailImg = document.getElementById('passport-detail-img');
    
    detailImg.src = `護照${id}.png`; 
    detailModal.classList.remove('hidden');
}

function closePassportDetail() {
    document.getElementById('passport-detail-modal').classList.add('hidden');
}

function checkXieWin() {
    if (isXieSolved) return;
    
    let allCorrect = true;
    let allFilled = true;
    
    for (let i = 1; i <= 5; i++) {
        if (xiePlacements[i] === null) {
            allFilled = false;
        }
        if (xiePlacements[i] !== (i - 1)) {
            allCorrect = false;
        }
    }

    if (!allFilled) {
        showNotification("請將五本護照全部放入方格中！");
        return;
    }

    if (allCorrect) {
        isXieSolved = true;
        showNotification("✅ 排列正確，謎題解開！");
        
        setTimeout(() => {
            collectItem('item', '字卡(X.6)', '從謝介石護照機關獲得的字卡。', null, false);
            collectItem('clue', '謝介石史料', '關於謝介石世紀婚禮與一公尺金打棺材的珍貴記載。', null, false);
            renameClue('謝介石(照片)', '謝介石(關係:丈夫)');
            closeAllModals();
            goBack();
        }, 1500);
    } else {
        deductTime(5);
        showNotification("護照的時間順序似乎不太對，扣除 5 秒！請重新排列...");
    }
}

function resetXiePuzzle() {
    if (isXieSolved) return;
    xiePlacements = { 1: null, 2: null, 3: null, 4: null, 5: null };
    xieSlotOccupants = { 0: null, 1: null, 2: null, 3: null, 4: null };
    for (let i = 1; i <= 5; i++) {
        const el = document.getElementById(`passport-${i}`);
        if(el) {
            const orderIndex = xieInitialOrder.indexOf(i);
            positionXieInTray(el, orderIndex, true);
        }
    }
}

// --- 地圖疊合解謎邏輯 ---
let mapEventsInitialized = false; 

function enterMapPuzzle(isBack = false) {
    hideCharacter();
    switchScene('scene-map-puzzle', isBack);
    const oldMap = document.getElementById('old-map-overlay');
    const offsetX = "-2%"; 
    const offsetY = "5%";  

    document.getElementById('map-rotation').value = 0;
    document.getElementById('map-opacity').value = 70;
    oldMap.style.transform = `translate(${offsetX}, ${offsetY}) rotate(0deg) scale(1.1)`;
    oldMap.style.opacity = 0.7;

    if (!mapEventsInitialized) {
        const rotationSlider = document.getElementById('map-rotation');
        const opacitySlider = document.getElementById('map-opacity');
        rotationSlider.addEventListener('input', (e) => {
            oldMap.style.transform = `translate(${offsetX}, ${offsetY}) rotate(${e.target.value}deg) scale(1.1)`;
        });
        opacitySlider.addEventListener('input', (e) => {
            oldMap.style.opacity = e.target.value / 100;
        });
        mapEventsInitialized = true;
    }
}

function checkMapAlignment() {
    const currentRotation = parseInt(document.getElementById('map-rotation').value);
    const targetAngle = -18; 
    const tolerance = 12; 
    if (Math.abs(currentRotation - targetAngle) <= tolerance) {
        unlockNextLevel(2, "🔓 解鎖新章節：第一章 寶美樓！");
        playPrologueToRoom1Transition();
    }
}

function playPrologueToRoom1Transition() {
    // 1. 每次都先清掉舊的，直接建立全新的黑畫面（0 秒瞬間變黑）
    const oldScreen = document.getElementById('prologue-black-screen');
    if (oldScreen) oldScreen.remove();

    const container = document.getElementById('game-container') || document.body;
    const blackScreen = document.createElement('div');
    blackScreen.id = 'prologue-black-screen';
    blackScreen.style.cssText = `
        position: absolute;
        inset: 0;
        z-index: 480;
        background-color: #000000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0 2rem;
        text-align: center;
        opacity: 1;
    `;

    const linesContainer = document.createElement('div');
    linesContainer.id = 'prologue-black-lines';
    linesContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        font-family: 'Noto Serif TC', serif;
        font-weight: 700;
        letter-spacing: 0.15em;
        color: #e2cda6;
    `;
    blackScreen.appendChild(linesContainer);
    container.appendChild(blackScreen);

    const lines = [
        '你回到了日治時期……',
        '想回到原本的時空，你必須先找到一個人',
        '在限時內找回「她」的故事',
        '否則將永遠困在這個時空！'
    ];

    const firstLineDelay = 400;   // 變黑後 0.4 秒出現第一行
    const lineInterval = 1800;    // 每隔 1.8 秒才出現下一行
    const fadeDuration = 1200;    // 每行慢慢浮現 1.2 秒

    // 2. 時間到才把該行文字加進畫面並慢慢淡入
    lines.forEach((text, idx) => {
        setTimeout(() => {
            const p = document.createElement('p');
            p.innerText = text;
            p.style.margin = '0';
            p.style.opacity = '0';
            p.style.transition = `opacity ${fadeDuration}ms ease-in-out`;
            p.style.fontSize = (idx === 3) ? '2.5rem' : '1.85rem';
            if (idx === 3) p.style.color = '#ef4444';

            linesContainer.appendChild(p);

            // 雙層 requestAnimationFrame 確保瀏覽器一定從 opacity: 0 慢慢淡入到 1
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    p.style.opacity = '1';
                });
            });
        }, firstLineDelay + idx * lineInterval);
    });

    // 3. 等第四行完全浮現 + 停頓 1 秒後，觸發碎玻璃特效
    const shatterDelay = firstLineDelay + (lines.length - 1) * lineInterval + fadeDuration + 1000;
    setTimeout(() => {
        triggerHorrorEffect("找到那個「她」！", () => {
            playSFX('sfx-door');
            blackScreen.style.transition = 'opacity 600ms ease';
            blackScreen.style.opacity = '0';
            setTimeout(() => {
                blackScreen.remove();
                enterRoom1();
            }, 600);
        });
    }, shatterDelay);
}
// ==========================================
// ★ 上菜解謎場景邏輯 (14選6機制)
// ==========================================
const servingDishes = [
    { id: 1, name: "1.雪白官燕" },
    { id: 2, name: "2.金錢火雞" },
    { id: 3, name: "3.水晶鴿蛋" },
    { id: 4, name: "4.紅燒火翅" },
    { id: 5, name: "5.八寶焗蟳" },
    { id: 6, name: "6.雪白木耳" },
    { id: 7, name: "7.炸春捲" },  
    { id: 8, name: "8.紅燒水魚" },
    { id: 9, name: "9.海參竹茹" },
    { id: 10, name: "10.如意鰻魚" }, 
    { id: 11, name: "11.火腿冬瓜" },
    { id: 12, name: "12.八寶飯" },
    { id: 13, name: "13.杏仁茶" },
    { id: 14, name: "14.龍騰躍八仙" } 
];

const correctServingOrder = [1, 2, 5, 13, 10, 7];
let currentServingSequence = [];
let servingPuzzleInitialized = false;

function enterServingPuzzle(isBack = false) {
    switchScene('scene-serving', isBack);
    hideCharacter(); 
    
    if (!servingPuzzleInitialized) {
        initServingPuzzle();
        servingPuzzleInitialized = true;
    }
}

function initServingPuzzle() {
    currentServingSequence = [];
    const container = document.getElementById('dish-selection-container');
    if (container) container.innerHTML = '';
    
    const shuffledDishes = [...servingDishes].sort(() => Math.random() - 0.5);
    
    shuffledDishes.forEach(dish => {
        const btn = document.createElement('button');
        btn.className = 'w-24 h-24 md:w-28 md:h-28 flex-shrink-0 rounded-full border-4 border-[#8b7355] bg-stone-800 bg-center bg-cover cursor-pointer hover:scale-110 hover:border-amber-400 transition-all shadow-lg relative overflow-hidden group';
        btn.id = `dish-btn-${dish.id}`;
        
        btn.style.backgroundImage = `url('${dish.name}.png')`; 
        
        const nameBadge = document.createElement('span');
        nameBadge.className = "absolute bottom-0 inset-x-0 bg-black/80 text-white text-[10px] md:text-xs py-1 text-center opacity-0 group-hover:opacity-100 transition-opacity";
        nameBadge.innerText = dish.name.split('.')[1]; 
        btn.appendChild(nameBadge);

        btn.onclick = () => selectDish(dish);
        if (container) container.appendChild(btn);
    });

    resetTableSpots();
    
    const menuEl = document.getElementById('on-screen-menu');
    if (menuEl) {
        menuEl.innerHTML = `
            <h3 class="text-xl font-bold text-center mb-3 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">江山樓筵席菜單</h3>
            <div class="text-left text-sm leading-relaxed font-serif text-[#3e2723]">
                <h4 class="font-bold text-[#8b0000] mb-1">【上半席】</h4>
                <ol class="list-none space-y-0.5 ml-1 mb-2">
                    <li>1. 雪白官燕 2. 金錢火雞</li>
                    <li>3. 水晶鴿蛋 4. 紅燒火翅</li>
                    <li>5. 八寶焗蟳 6. 雪白木耳</li>
                </ol>
                <h4 class="font-bold text-[#8b0000] mb-1">【前、後半席間的鹹點】</h4>
                <ol class="list-none space-y-0.5 ml-1 mb-2"><li>7. 炸春捲</li></ol>
                <h4 class="font-bold text-[#8b0000] mb-1">【下半席】</h4>
                <ol class="list-none space-y-0.5 ml-1">
                    <li>8. 紅燒水魚 9. 海參竹茹</li>
                    <li>10. 如意鰻魚 11. 火腿冬瓜</li>
                    <li>12. 八寶飯 13. 杏仁茶</li>
                </ol>
            </div>
        `;
    }
    
    const recipeEl = document.getElementById('on-screen-recipe');
    if (recipeEl) {
        recipeEl.innerHTML = `
            <h3 class="text-xl font-bold text-center mb-3 border-b-2 border-[#a37c4d] pb-2 text-[#5a3c28]">菜色作法解謎</h3>
            <div class="text-left text-sm leading-relaxed font-serif text-[#3e2723] space-y-2">
                <p><span class="font-bold text-[#8b0000]">A</span> 將南洋產<span class="font-bold tracking-widest text-[#5a3c28]">□□</span>浸泡熱水，清洗後以冰糖水調製。</p>
                <p><span class="font-bold text-[#8b0000]">B</span> 豬肉薄切成兩片，均為一錢銅幣大小，中間夾蔥、荸薺及<span class="font-bold tracking-widest text-[#5a3c28]">□□</span>，外部裹以蛋汁及麵包粉後油炸。</p>
                <p><span class="font-bold text-[#8b0000]">C</span> <span class="font-bold tracking-widest text-[#5a3c28]">□□</span>與蔥、荸薺、豬肉及麵包粉混合放入<span class="font-bold tracking-widest text-[#5a3c28]">□□</span>內部，外部裹上麵粉蛋糊，再裹麵包粉後油炸。</p>
                <p><span class="font-bold text-[#8b0000]">D</span> 將熱水倒入中國甘肅省產<span class="font-bold tracking-widest text-[#5a3c28]">□□</span>果實中，去皮、磨粉，以布過濾，再加入冰糖調製而成。</p>
                <p><span class="font-bold text-[#8b0000]">E</span> 本島產之<span class="font-bold tracking-widest text-[#5a3c28]">□□</span>去骨，<span class="font-bold tracking-widest text-[#5a3c28]">□□</span>切成長薄片，包入蛋、火腿及粉絲入鍋蒸。</p>
                <p><span class="font-bold text-[#8b0000]">F</span> 將雞肉、豬肉、蝦肉等主要材料切碎混合，外裹麵粉皮油炸。</p>
                <p class="text-xs text-stone-600 font-bold mt-3 pt-2 border-t border-stone-400/50">※ 空格不代表字數</p>
            </div>
        `;
    }
}

function resetTableSpots() {
    for (let i = 1; i <= 6; i++) {
        const tableSpot = document.getElementById(`table-dish-${i}`);
        if (tableSpot) {
            tableSpot.classList.remove('opacity-100');
            tableSpot.classList.add('opacity-0');
            tableSpot.style.backgroundImage = 'none';
        }
    }
}

function selectDish(dish) {
    if (currentServingSequence.length >= 6) return;
    
    currentServingSequence.push(dish.id);
    const step = currentServingSequence.length;
    
    const btn = document.getElementById(`dish-btn-${dish.id}`);
    if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-40', 'grayscale');
        btn.classList.remove('hover:scale-110', 'hover:border-amber-400', 'cursor-pointer');
    }
    
    const tableSpot = document.getElementById(`table-dish-${step}`);
    if (tableSpot) {
        tableSpot.style.backgroundImage = `url('${dish.name}.png')`;
        tableSpot.style.backgroundPosition = 'center';
        tableSpot.style.backgroundSize = 'cover';
        tableSpot.classList.remove('opacity-0');
        tableSpot.classList.add('opacity-100');
    }

    if (currentServingSequence.length === 6) {
        setTimeout(checkServingPuzzle, 800);
    }
}

function resetServingPuzzle() {
    currentServingSequence = [];
    servingDishes.forEach(dish => {
        const btn = document.getElementById(`dish-btn-${dish.id}`);
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-40', 'grayscale');
            btn.classList.add('hover:scale-110', 'hover:border-amber-400', 'cursor-pointer');
        }
    });
    resetTableSpots();
}

function checkServingPuzzle() {
    let isCorrect = true;
    for (let i = 0; i < 6; i++) {
        if (currentServingSequence[i] !== correctServingOrder[i]) {
            isCorrect = false;
            break;
        }
    }
    
    if (isCorrect) {
        showNotification("🎉 上菜順序完全正確！");
        setTimeout(() => {
            collectItem('item', '《乞食開藝旦歌》', '記錄著當時社會風氣與勸世內容的古老歌謠。', null, false);
            
            switchScene('scene-room2');
            startDialog('servingComplete', () => {
                inspectItem('《乞食開藝旦歌》', 'system');
            });
        }, 1500);
    } else {
        showNotification("❌ 菜色或順序不對，請對照左側史料重新上菜！");
        setTimeout(resetServingPuzzle, 2000);
    }
}

// ==========================================
// ★ 藝旦間：珠寶盒最終解謎
// ==========================================
function showYidanFinalPuzzle() {
    const hasLian = state.notebook.find(i => i.name === '連雅堂(關係:故友)');
    const hasLuo = state.notebook.find(i => i.name === '羅秀惠(關係:惡緣)');
    const hasXie = state.notebook.find(i => i.name === '謝介石(關係:丈夫)');

    if (!hasLian || !hasLuo || !hasXie) {
        showNotification("⚠️ 你還沒有完全釐清這三位男性的「關係」線索，再回去前面的關卡確認一下筆記本吧！");
        return;
    }

    document.getElementById('yidan-final-input-container').style.display = 'block';
    document.getElementById('yidan-final-input').value = '';
    document.getElementById('yidan-final-input-error').classList.add('hidden');
}

function checkYidanFinalInput() {
    const input = document.getElementById('yidan-final-input').value.trim();
    if (input === '王香禪') {
        document.getElementById('yidan-final-input-container').style.display = 'none';
        
        const box = document.getElementById('obj-jewelry-box');
        if (box) box.classList.add('hidden');

        startDialog('yidanFinalSolved');
    } else {
        document.getElementById('yidan-final-input-error').classList.remove('hidden');
    }
}

// ==========================================
// ★ 藝旦間：考核一 (回合制划拳)
// ==========================================
let fistTurn = 'player';
let computerFingers = 0;
let computerGuess = 0;
let selectedPlayerFingers = null;

const fistPhrases = {
    '小調拳': [
        "零","一品高陞", "兩相好", "三元及弟", "四發彩", "梅花", 
        "六合連", "七巧圖", "八仙", "九連燈", "全家好" 
    ],
    '三國拳': [
        "零", "單刀赴會", "二嫂過關", "三結義", "四漢將", "五關斬將", 
        "六出祁山", "七擒孟獲", "八陣圖", "九伐中原", "舌戰群儒" 
    ]
};

function getFistPhrase(number) {
    const currentStageName = fistStages[currentFistStage - 1];
    if (fistPhrases[currentStageName] && fistPhrases[currentStageName][number] !== undefined) {
        return fistPhrases[currentStageName][number];
    }
    return number; 
}

function startAssessment1() {
    if (assessment1Progress === 3) return; 
    
    if (assessment1Progress === 2) {
        playSFX('sfx-click');
        document.getElementById('fist-game-container').classList.remove('hidden');
        preparePlayerTurn(); 
        return;
    }
    
    if (assessment1Progress === 1) {
        playSFX('sfx-click');
        showAssessment1Puzzle();
        return;
    }

    assessment1Progress = 1;
    startDialog('assessment1Intro');
}

function showAssessment1Puzzle() {
    const hasDoc1 = hasCollected('史料：小調拳');
    
    if (!hasDoc1) {
        showNotification("🎒 發現桌上的三份拳法史料，已收錄至道具欄！");
        collectItem('item', '史料：小調拳', '記載小調拳起語方式的史料。', null, false);
        collectItem('item', '史料：三國拳', '關於三國拳拳語的文獻紀錄。', null, false);
        collectItem('item', '史料：官話拳', '關於官話拳拳語的文獻紀錄。', null, true);
    }
    
    const titleEl = document.querySelector('#assessment1-input-container h3');
    const descEl = document.querySelector('#assessment1-input-container p');
    const inputEl = document.getElementById('assessment1-input');
    
    if (currentFistStage === 1) {
        if (titleEl) titleEl.innerText = '考核一：小調拳';
        if (descEl) descEl.innerHTML = '請查閱道具欄中剛剛獲得的拳法史料。<br>現在進行小調拳！<br> 沙窗外啊，鐵馬響叮噹啊啊。<br>.......<br>請輸入「起語」（請勿輸入標點符號）。';
        if (inputEl) inputEl.placeholder = "不用標點符號";
    } else if (currentFistStage === 2) {
        if (titleEl) titleEl.innerText = '考核一：三國拳';
        if (descEl) descEl.innerHTML = '請查閱道具欄中剛剛獲得的拳法史料。<br>現在進行三國拳！<br>請輸入「起語」（請勿輸入標點符號）。';
        if (inputEl) inputEl.placeholder = "不用標點符號";
    }
    
    document.getElementById('assessment1-input-container').classList.remove('hidden');
    document.getElementById('assessment1-input').value = '';
    document.getElementById('assessment1-input-error').classList.add('hidden');
}

function hideAssessment1Input() {
    document.getElementById('assessment1-input-container').classList.add('hidden');
}

function checkAssessment1Input() {
    const input = document.getElementById('assessment1-input').value.trim();
    
    let isCorrect = false;
    if (currentFistStage === 1 && input === '姑娘問聲誰咿啊隔壁王大娘啊啊') {
        isCorrect = true;
    } else if (currentFistStage === 2 && input === '全福壽仔') {
        isCorrect = true;
    }
    
    if (isCorrect) { 
        hideAssessment1Input();
        showNotification("✅ 起語正確！準備開始划拳對決。");
        
        assessment1Progress = 2; 
        localStorage.setItem('unlockLostArtA1', assessment1Progress); 
        
        setTimeout(() => startFistGame(), 800);
    } else {
        document.getElementById('assessment1-input-error').innerText = "起語錯誤，請打開道具欄仔細查閱拳法史料。";
        document.getElementById('assessment1-input-error').classList.remove('hidden');
    }
}

function startFistGame() {
    const container = document.getElementById('fist-game-container');
    container.classList.remove('hidden');
    document.querySelector('#fist-game-container h3').innerText = `考核一 - ${fistStages[currentFistStage-1]}對決`;
    
    document.getElementById('fist-game-log').innerHTML = `<div class="text-amber-400 mb-2 border-b border-[#5a3c28] pb-1">👉 開始【${fistStages[currentFistStage-1]}】！</div>`;
    
    preparePlayerTurn();
}

function exitFistGame() {
    playSFX('sfx-click'); 
    document.getElementById('fist-game-container').classList.add('hidden');
    showNotification("已暫時退出考核，點擊圖示可隨時繼續！");
}

function renderFistButtons() {
    const btnsContainer = document.getElementById('player-fingers-btns');
    if (!btnsContainer) return; 
    
    btnsContainer.innerHTML = '';
    for (let i = 0; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.className = 'w-12 h-12 rounded-full border-2 border-[#a37c4d] bg-[#3e2723] text-[#e2cda6] text-lg font-bold transition-all hover:bg-[#5a3c28] focus:outline-none flex items-center justify-center';
        
        if (selectedPlayerFingers === i) {
            btn.className = 'w-12 h-12 rounded-full border-2 border-amber-200 bg-amber-600 text-white text-lg font-bold transition-all shadow-[0_0_15px_rgba(217,119,6,0.8)] transform scale-110 focus:outline-none flex items-center justify-center';
        }
        
        btn.innerText = i;
        btn.onclick = () => {
            selectedPlayerFingers = i;
            renderFistButtons(); 
            playSFX('sfx-click');
        };
        btnsContainer.appendChild(btn);
    }
}

function preparePlayerTurn() {
    fistTurn = 'player';
    selectedPlayerFingers = null;
    
    computerFingers = Math.floor(Math.random() * 6);
    
    document.getElementById('fist-turn-indicator').innerText = '【第一輪：你的回合】請出拳並喊出總數！';
    document.getElementById('fist-turn-indicator').className = 'text-xl font-bold text-amber-400 mb-3';
    
    const compDisplay = document.getElementById('computer-action-display');
    if (compDisplay) compDisplay.classList.add('hidden');
    
    document.getElementById('player-guess-section').classList.remove('hidden');
    
    const guessInput = document.getElementById('player-guess-input');
    guessInput.value = '';
    guessInput.placeholder = '請輸入 0-10 的數字';
    guessInput.max = 10;
    
    const guessSectionP = document.querySelector('#player-guess-section p');
    if (guessSectionP) guessSectionP.innerText = '請預測雙方手指總數 (0-10)：';
    
    const btnsContainer = document.getElementById('player-fingers-btns');
    if (btnsContainer) {
        const titleText = btnsContainer.parentElement.querySelector('p');
        if (titleText) titleText.innerText = '請選擇你要出的手指數 (0-5)：';
    }
    
    renderFistButtons();
}

function prepareComputerTurn() {
    fistTurn = 'computer';
    selectedPlayerFingers = null;
    
    computerFingers = Math.floor(Math.random() * 6);
    computerGuess = computerFingers + Math.floor(Math.random() * 6);
    
    document.getElementById('fist-turn-indicator').innerText = '【第二輪：對手的回合】對手已喊拳，請出拳！';
    document.getElementById('fist-turn-indicator').className = 'text-xl font-bold text-red-400 mb-3';
    
    document.getElementById('computer-action-display').classList.remove('hidden');
    document.getElementById('computer-guess-number').innerText = '?'; 
    document.getElementById('player-guess-section').classList.add('hidden'); 
    
    renderFistButtons();
}

function appendFistLog(msg, type = 'normal') {
    const log = document.getElementById('fist-game-log');
    const entry = document.createElement('div');
    if (type === 'highlight') entry.className = 'text-amber-300 font-bold';
    else if (type === 'error') entry.className = 'text-red-400 font-bold';
    else entry.className = 'text-stone-300';
    
    entry.innerText = msg;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight; 
}

function submitFistAction() {
    if (selectedPlayerFingers === null) {
        showNotification("請先選擇你要出的手指數 (0-5)！");
        return;
    }

    const btnSubmit = document.getElementById('btn-submit-fist');
    btnSubmit.disabled = true; 

    let playerGuess = null;

    if (fistTurn === 'player') {
        const guessInput = document.getElementById('player-guess-input').value;
        if (guessInput === '' || isNaN(guessInput) || guessInput < 0 || guessInput > 10) {
            showNotification("請輸入有效的總數預測 (0-10)！");
            btnSubmit.disabled = false;
            return;
        }
        playerGuess = parseInt(guessInput);
    } 

    startShowdownAnimation(playerGuess);
}

let showdownTimer = null;

function startShowdownAnimation(playerGuess) {
    if (showdownTimer) {
        clearInterval(showdownTimer);
        showdownTimer = null;
    }

    // ★ 在倒數開始時就先鎖定這局的出拳數字，避免中途被重置成 null
    const lockedPlayerFingers = (selectedPlayerFingers !== null && selectedPlayerFingers !== undefined) ? selectedPlayerFingers : 0;
    const lockedComputerFingers = (computerFingers !== null && computerFingers !== undefined) ? computerFingers : 0;

    const gameContainer = document.getElementById('game-container');
    let showdownArea = document.getElementById('fist-showdown-area');
    
    if (!showdownArea) {
        showdownArea = document.createElement('div');
        showdownArea.id = 'fist-showdown-area';
        showdownArea.className = 'absolute inset-0 flex flex-col items-center justify-center z-[150] hidden pointer-events-none bg-black/60 backdrop-blur-sm';
        gameContainer.appendChild(showdownArea);
    }
    
    showdownArea.classList.remove('hidden');
    showdownArea.innerHTML = `<div class="text-[120px] md:text-[180px] font-black text-amber-500 animate-bounce drop-shadow-[0_0_30px_rgba(245,158,11,1)]" id="countdown-text">3</div>`;
    playSFX('sfx-tick');
    
    let count = 2;
    showdownTimer = setInterval(() => {
        if (count > 0) {
            document.getElementById('countdown-text').innerText = count;
            playSFX('sfx-tick');
            count--;
        } else {
            clearInterval(showdownTimer);
            showdownTimer = null;
            document.getElementById('countdown-text').innerText = "出拳！";
            document.getElementById('countdown-text').classList.replace('text-amber-500', 'text-red-500');
            playSFX('sfx-click'); 
            
            setTimeout(() => {
                revealHands(playerGuess, lockedPlayerFingers, lockedComputerFingers);
            }, 600);
        }
    }, 800);
}

function revealHands(playerGuess, pFingers, cFingers) {
    const showdownArea = document.getElementById('fist-showdown-area');
    const safePlayer = (pFingers !== undefined && pFingers !== null) ? pFingers : (selectedPlayerFingers ?? 0);
    const safeComp = (cFingers !== undefined && cFingers !== null) ? cFingers : (computerFingers ?? 0);
    selectedPlayerFingers = safePlayer;
    computerFingers = safeComp;

    const totalFingers = safePlayer + safeComp;
    
    const pPhrase = getFistPhrase(playerGuess);
    const cPhrase = getFistPhrase(computerGuess);

    const callText = (fistTurn === 'computer') 
        ? `<div class="text-red-400 font-bold text-4xl md:text-6xl mb-12 bg-black/70 px-10 py-4 rounded-full border-2 border-red-800 shadow-[0_0_20px_rgba(248,113,113,0.5)]">對手大喊：${cPhrase}！</div>` 
        : `<div class="text-amber-400 font-bold text-4xl md:text-6xl mb-12 bg-black/70 px-10 py-4 rounded-full border-2 border-amber-800 shadow-[0_0_20px_rgba(251,191,36,0.5)]">你大喊：${pPhrase}！</div>`;
    
    showdownArea.innerHTML = `
        ${callText}
        <div class="flex justify-center w-full px-4 items-center gap-8 md:gap-24 mb-10">
            <div class="flex flex-col items-center">
                <span class="text-amber-200 mb-4 text-xl md:text-3xl font-bold bg-black/50 px-4 py-1 rounded">你出 ${safePlayer}</span>
                <img src="拳${safePlayer}.png" class="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-[0_0_25px_rgba(217,119,6,0.9)]" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="hidden w-48 h-48 md:w-64 md:h-64 bg-stone-800 rounded-xl items-center justify-center text-7xl font-black border-4 border-amber-600 text-amber-500 shadow-inner">${safePlayer}</div>
            </div>
            
            <div class="text-6xl md:text-8xl font-black text-white italic drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">VS</div>
            
            <div class="flex flex-col items-center">
                <span class="text-red-200 mb-4 text-xl md:text-3xl font-bold bg-black/50 px-4 py-1 rounded">對手出 ${safeComp}</span>
                <img src="拳${safeComp}.png" class="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-[0_0_25px_rgba(220,38,38,0.9)] transform -scale-x-100" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="hidden w-48 h-48 md:w-64 md:h-64 bg-stone-800 rounded-xl items-center justify-center text-7xl font-black border-4 border-red-600 text-red-500 shadow-inner">${safeComp}</div>
            </div>
        </div>
        <div class="text-4xl md:text-6xl font-black text-white mt-8 bg-stone-900/90 px-10 py-4 rounded-2xl border-4 border-stone-500 shadow-[0_0_30px_rgba(0,0,0,0.8)]">實際總數：${totalFingers}</div>
    `;

    setTimeout(() => {
        showdownArea.classList.add('hidden');
        executeFistResult(playerGuess, totalFingers);
    }, 3500);

}

function executeFistResult(playerGuess, totalFingers) {
    const btnSubmit = document.getElementById('btn-submit-fist');
    const gameContainer = document.getElementById('game-container');
    let resultArea = document.getElementById('fist-result-area');
    
    if (!resultArea) {
        resultArea = document.createElement('div');
        resultArea.id = 'fist-result-area';
        resultArea.className = 'absolute inset-0 flex flex-col items-center justify-center z-[200] hidden pointer-events-none bg-black/85 backdrop-blur-md transition-opacity duration-300';
        gameContainer.appendChild(resultArea);
    }

    function showResultAnimation(type, callback) {
        resultArea.classList.remove('hidden');
        resultArea.style.opacity = '1';
        
        if (type === 'win') {
            resultArea.innerHTML = `<div class="text-[120px] md:text-[200px] font-black text-amber-400 animate-pulse drop-shadow-[0_0_50px_rgba(251,191,36,1)] italic tracking-wider">Win!</div>`;
            playSFX('sfx-tick');
        } else if (type === 'lose') {
            resultArea.innerHTML = `
                <div class="text-[120px] md:text-[200px] font-black text-red-600 animate-bounce drop-shadow-[0_0_50px_rgba(220,38,38,1)] italic tracking-wider">Lose!</div>
                <div class="text-3xl md:text-5xl text-white font-bold mt-10 bg-red-950/90 px-10 py-5 rounded-2xl border-4 border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.8)] tracking-widest text-center leading-tight">你輸了這局<br>請罰酒並重新考核</div>
            `;
        }

        setTimeout(() => {
            resultArea.style.opacity = '0';
            setTimeout(() => {
                resultArea.classList.add('hidden');
                if (callback) callback();
            }, 300);
        }, 3000);
    }

    const pPhrase = getFistPhrase(playerGuess);
    const cPhrase = getFistPhrase(computerGuess);

    if (fistTurn === 'player') {
        appendFistLog(`[你]出 ${selectedPlayerFingers} 喊【${playerGuess} (${pPhrase})】，[電腦]出 ${computerFingers}。`);
        appendFistLog(`👉 雙方總數為：${totalFingers}`);

        if (playerGuess === totalFingers) {
            appendFistLog(`🎉 恭喜猜中！你贏了這一局！`, 'highlight');
            showResultAnimation('win', () => advanceFistStage());
        } else {
            appendFistLog(`❌ 你猜錯了！進入下一輪，換對手喊拳。`, 'error');
            setTimeout(() => prepareComputerTurn(), 1000);
        }
    } 
    else if (fistTurn === 'computer') {
        document.getElementById('computer-guess-number').innerText = `${computerGuess} (${cPhrase})`; 
        
        appendFistLog(`[電腦]出 ${computerFingers} 喊【${computerGuess} (${cPhrase})】，[你]出 ${selectedPlayerFingers}。`);
        appendFistLog(`👉 雙方總數為：${totalFingers}`);

        if (computerGuess === totalFingers) {
            appendFistLog(`💀 對手猜中了！你輸了這局，罰酒並重新考核。`, 'error');
            showResultAnimation('lose', () => {
                document.getElementById('fist-game-container').classList.add('hidden');
                assessment1Progress = 1;
                localStorage.setItem('unlockLostArtA1', assessment1Progress);
                showAssessment1Puzzle(); 
            }); 
        } else {
            appendFistLog(`✅ 對手也猜錯了！回到第一輪，換你喊拳。`, 'highlight');
            setTimeout(() => preparePlayerTurn(), 1000); 
        }
    }

    if ((fistTurn === 'player' && playerGuess === totalFingers) || 
        (fistTurn === 'computer' && computerGuess === totalFingers)) {
        setTimeout(() => { btnSubmit.disabled = false; }, 3500); 
    } else {
        setTimeout(() => { btnSubmit.disabled = false; }, 1000);
    }
}

function advanceFistStage() {
    if (currentFistStage < 2) { 
        currentFistStage++;
        localStorage.setItem('unlockLostArtFistStage', currentFistStage);
        showNotification(`過關！接下來挑戰：${fistStages[currentFistStage-1]}`);
        
        document.getElementById('fist-game-container').classList.add('hidden');
        assessment1Progress = 1;
        localStorage.setItem('unlockLostArtA1', assessment1Progress);
        showAssessment1Puzzle();
    } else {
        assessment1Progress = 3; 
        localStorage.setItem('unlockLostArtA1', assessment1Progress);
        document.getElementById('fist-game-container').classList.add('hidden');
        
        collectItem('clue', '卡片1(師從趙一山 / 永樂座名旦)', '艋舺詩人王子鶴見她頗有詩才,便介紹她到大稻埕的「劍樓書塾」學習作詩', null, false);
        collectItem('clue', '卡片2(王罔市)', '從小就被送給龍山寺婦人董仔治(董阿治)旗下。', null, false);
        
        showNotification("✅ 考核一通關！獲得兩條重要線索！");
        
        syncCollectedDots(); 
        checkAllAssessmentsComplete();
    }
}

// ==========================================
// ★ 藝旦間：考核二 (聽音辨曲) - 點唱機配對系統
// ==========================================
let a2Tracks = [];
let currentPlayingA2 = null;
let currentSliderId = null;
let isSeekingA2 = false;

function startAssessment2() {
    if (assessment2Progress === 2) return; 

    if (assessment2Progress === 1) {
        playSFX('sfx-click');
        showAssessment2Puzzle();
        return;
    }

    assessment2Progress = 1;
    localStorage.setItem('unlockLostArtA2', assessment2Progress);
    startDialog('assessment2Intro');
}

function showAssessment2Puzzle() {
    const hasDoc2 = hasCollected('史料：二進宮');
    if (!hasDoc2) {
        showNotification("🎒 發現三份京劇史料，已收錄至道具欄！");
        collectItem('item', '史料：二進宮', '關於京劇《二進宮》的劇情簡介。', null, false);
        collectItem('item', '史料：三娘教子', '關於京劇《三娘教子》的劇情簡介。', null, false);
        collectItem('item', '史料：祭江', '關於京劇《祭江》的劇情簡介。', null, true);
    }

    document.getElementById('assessment2-puzzle-container').classList.remove('hidden');
    document.getElementById('assessment2-error').classList.add('hidden');
    
    if (a2Tracks.length === 0) {
        const files = [
            { id: '二進宮', file: '二進宮.mp3' },
            { id: '三娘教子', file: '三娘教子.mp3' },
            { id: '祭江', file: '祭江.mp3' }
        ].sort(() => Math.random() - 0.5);
        
        a2Tracks = [
            { label: 'A', id: files[0].id, file: files[0].file },
            { label: 'B', id: files[1].id, file: files[1].file },
            { label: 'C', id: files[2].id, file: files[2].file }
        ];
        
        const tracksContainer = document.getElementById('a2-tracks');
        tracksContainer.innerHTML = '';
        
        a2Tracks.forEach((track, index) => {
            tracksContainer.innerHTML += `
                <div class="flex flex-col gap-2 bg-black/60 border border-[#5a3c28] p-3 rounded">
                    <div class="flex items-center justify-between">
                        <span class="text-[#e2cda6] font-bold text-lg">按鈕 ${track.label}</span>
                        <div class="flex gap-3 items-center">
                            <button onclick="playA2Track('${track.file}', this, 'a2-slider-${index}')" class="a2-play-btn bg-[#3e2723] hover:bg-[#5a3c28] text-amber-500 w-10 h-10 flex flex-shrink-0 items-center justify-center rounded-full border border-amber-800 transition-colors shadow">
                                <i class="fas fa-play"></i>
                            </button>
                            <select id="a2-select-${index}" class="bg-[#3e2723] text-[#e2cda6] border border-[#a37c4d] rounded px-2 py-1.5 focus:outline-none text-sm md:text-base font-bold shadow-inner">
                                <option value="">請選擇對應曲名...</option>
                                <option value="二進宮">二進宮</option>
                                <option value="三娘教子">三娘教子</option>
                                <option value="祭江">祭江</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span id="a2-time-${index}" class="text-xs text-stone-400 w-10">00:00</span>
                        <input type="range" id="a2-slider-${index}" class="w-full slider" min="0" max="100" value="0" 
                            onmousedown="isSeekingA2=true" ontouchstart="isSeekingA2=true" 
                            onmouseup="isSeekingA2=false; seekA2Track(this.value)" ontouchend="isSeekingA2=false; seekA2Track(this.value)" 
                            oninput="updateA2TimeText(this.value, '${index}')" disabled>
                    </div>
                </div>
            `;
        });
        
        const player = document.getElementById('a2-player');
        player.ontimeupdate = () => {
            if (!isSeekingA2 && currentSliderId && !isNaN(player.duration)) {
                const slider = document.getElementById(currentSliderId);
                const timeDisplay = document.getElementById(currentSliderId.replace('slider', 'time'));
                if (slider) {
                    slider.value = (player.currentTime / player.duration) * 100;
                }
                if (timeDisplay) {
                    const mins = Math.floor(player.currentTime / 60).toString().padStart(2, '0');
                    const secs = Math.floor(player.currentTime % 60).toString().padStart(2, '0');
                    timeDisplay.innerText = `${mins}:${secs}`;
                }
            }
        };
    } else {
        a2Tracks.forEach((track, index) => {
            const select = document.getElementById(`a2-select-${index}`);
            if (select) select.value = "";
        });
    }
}

function playA2Track(fileName, btn, sliderId) {
    const player = document.getElementById('a2-player');
    const bgMusic = document.getElementById('bg-music');
    
    document.querySelectorAll('.a2-play-btn i').forEach(i => i.className = 'fas fa-play');
    document.querySelectorAll('.a2-play-btn').forEach(b => b.classList.remove('animate-pulse', 'text-amber-200'));
    document.querySelectorAll('input[id^="a2-slider-"]').forEach(s => s.disabled = true);
    
    if (currentPlayingA2 === fileName && !player.paused) {
        player.pause();
        currentPlayingA2 = null;
        currentSliderId = null;
        bgMusic.volume = 0.2; 
        return;
    }
    
    bgMusic.volume = 0.05; 
    player.src = fileName;
    player.play().catch(e => console.warn("找不到音檔或被攔截", e));
    currentPlayingA2 = fileName;
    currentSliderId = sliderId;
    
    const activeSlider = document.getElementById(sliderId);
    if (activeSlider) {
        activeSlider.disabled = false;
    }
    
    btn.querySelector('i').className = 'fas fa-stop';
    btn.classList.add('animate-pulse', 'text-amber-200');
    
    player.onended = () => {
        btn.querySelector('i').className = 'fas fa-play';
        btn.classList.remove('animate-pulse', 'text-amber-200');
        if (activeSlider) {
            activeSlider.value = 0;
            activeSlider.disabled = true;
        }
        currentPlayingA2 = null;
        currentSliderId = null;
        bgMusic.volume = 0.2;
    };
}

function seekA2Track(percent) {
    const player = document.getElementById('a2-player');
    if (player && !isNaN(player.duration)) {
        player.currentTime = (percent / 100) * player.duration;
    }
}

function updateA2TimeText(percent, index) {
    const player = document.getElementById('a2-player');
    const timeDisplay = document.getElementById(`a2-time-${index}`);
    if (player && !isNaN(player.duration) && timeDisplay) {
        const time = (percent / 100) * player.duration;
        const mins = Math.floor(time / 60).toString().padStart(2, '0');
        const secs = Math.floor(time % 60).toString().padStart(2, '0');
        timeDisplay.innerText = `${mins}:${secs}`;
    }
}

function hideAssessment2Puzzle() {
    playSFX('sfx-click');
    document.getElementById('assessment2-puzzle-container').classList.add('hidden');
    
    const player = document.getElementById('a2-player');
    if (!player.paused) {
        player.pause();
        document.getElementById('bg-music').volume = 0.2; 
    }
}

function checkA2Match() {
    let allSelected = true;
    let allCorrect = true;

    a2Tracks.forEach((track, index) => {
        const select = document.getElementById(`a2-select-${index}`);
        if (!select || select.value === "") {
            allSelected = false;
        } else if (select.value !== track.id) {
            allCorrect = false;
        }
    });

    if (!allSelected) {
        showNotification("⚠️ 請將 A、B、C 三個音軌都選擇對應的曲名！");
        return;
    }

    if (allCorrect) {
        assessment2Progress = 2; 
        localStorage.setItem('unlockLostArtA2', assessment2Progress); 
        hideAssessment2Puzzle();
        
        collectItem('clue', '卡片3(艋舺第一花魁)', '藝旦的最高榮譽，見證了她在風月場中的絕代風華。', null, false);
        showNotification("✅ 點唱配對完全正確！完成考核二並獲得新線索。");
        
        playSFX('sfx-tick');
        syncCollectedDots(); 
        checkAllAssessmentsComplete();
    } else {
        document.getElementById('assessment2-error').classList.remove('hidden');
        
        if (!isChapterSelectMode) {
            deductTime(600); 
            showNotification("❌ 點唱配對錯誤！時間扣除 10 分鐘！");
        } else {
            showNotification("❌ 點唱配對錯誤！請再試一次。");
        }
    }
}

// ==========================================
// ★ 藝旦間：考核三 (琵琶彈奏)
// ==========================================
let pipaSequence = [];
let activeFretNote = null;
let activeFretString = null;
const correctPipaSequence = [
    '徵','角','角','4','商','商','宮','商','角','4','徵','徵','徵',
    '徵','角','角','4','商','商','宮','角','徵','徵','角',
    '商','商','商','商','商','角','4',
    '角','角','角','角','角','4','徵',
    '徵','角','角','4','商','商','宮','角','徵','徵','宮'
];

function startAssessment3() {
    if (assessment3Progress === 2) return; 

    if (assessment3Progress === 1) {
        playSFX('sfx-click');
        showAssessment3Puzzle();
        return;
    }

    assessment3Progress = 1;
    localStorage.setItem('unlockLostArtA3', assessment3Progress);
    startDialog('assessment3Intro');
}

function showAssessment3Puzzle() {
    pipaSequence = [];
    activeFretNote = null;
    activeFretString = null;
    document.getElementById('pipa-sequence-display').innerText = '';
    
    document.querySelectorAll('.fret-node').forEach(n => {
        n.classList.remove('bg-amber-500', 'border-amber-400', 'animate-pulse');
        n.classList.add('border-blue-500/80', 'bg-blue-500/30');
    });

    document.getElementById('pipa-step1').classList.remove('hidden');
    document.getElementById('pipa-step1').classList.add('flex');
    
    document.getElementById('pipa-step2').classList.add('hidden');
    document.getElementById('pipa-step2').classList.remove('flex');
    
    document.getElementById('assessment3-puzzle-container').classList.remove('hidden');
}

function showPipaStep2() {
    playSFX('sfx-click');
    document.getElementById('pipa-step1').classList.add('hidden');
    document.getElementById('pipa-step1').classList.remove('flex');
    
    document.getElementById('pipa-step2').classList.remove('hidden');
    document.getElementById('pipa-step2').classList.add('flex');
}

function hideAssessment3Puzzle() {
    playSFX('sfx-click');
    document.getElementById('assessment3-puzzle-container').classList.add('hidden');
}

function selectFret(note, stringNum) {
    if (assessment3Progress >= 2) return;
    playSFX('sfx-click');
    activeFretNote = note;
    activeFretString = stringNum;
    
    document.querySelectorAll('.fret-node').forEach(n => {
        n.classList.remove('bg-amber-500', 'border-amber-400', 'animate-pulse');
        n.classList.add('border-blue-500/80', 'bg-blue-500/30');
    });
    
    const mapping = {'羽':'yu', '商':'shang', '角':'jiao', '宮':'gong', '4':'4', '徵':'zhi'};
    const btn = document.getElementById(`fret-${mapping[note]}`);
    if (btn) {
        btn.classList.remove('border-blue-500/80', 'bg-blue-500/30');
        btn.classList.add('bg-amber-500', 'border-amber-400', 'animate-pulse');
    }
}

function pluckString(stringNum) {
    if (assessment3Progress >= 2) return;
    
    let playedNote = null;
    if (activeFretNote && activeFretString === stringNum) {
        playedNote = activeFretNote;
    } else {
        playedNote = '空'; 
    }
    
    if (playedNote !== '空') {
        const audio = new Audio(`${playedNote}.mp3`);
        audio.volume = 1.0;
        audio.play().catch(err => console.warn("音效播放失敗:", err));
    } else {
        playSFX('sfx-tick'); 
    }
    
    const expectedNote = correctPipaSequence[pipaSequence.length];
    
    if (playedNote === expectedNote) {
        pipaSequence.push(playedNote);
        updatePipaDisplay();
        
        if (pipaSequence.length === correctPipaSequence.length) {
            assessment3Progress = 2;
            localStorage.setItem('unlockLostArtA3', assessment3Progress);
            showNotification("✅ 旋律正確！《小蜜蜂》的樂音迴盪在藝旦間... 完成考核三。");
            setTimeout(() => {
                hideAssessment3Puzzle();
                syncCollectedDots();
                checkAllAssessmentsComplete();
            }, 2000);
        }
    } else {
        pipaSequence = [];
        updatePipaDisplay();
        showNotification(`❌ 彈錯了！你彈了「${playedNote}」，樂譜不符。請重頭開始！`);
    }
}

function updatePipaDisplay() {
    const display = document.getElementById('pipa-sequence-display');
    let formatted = '';
    for (let i = 0; i < pipaSequence.length; i++) {
        formatted += pipaSequence[i] + ' ';
        if ((i + 1) % 7 === 0) formatted += '\n';
    }
    display.innerText = formatted;
    display.scrollTop = display.scrollHeight;
}

// ==========================================
// ★ 考核全通關：頒發鑑札與解鎖最終章
// ==========================================
function checkAllAssessmentsComplete() {
    if (assessment1Progress >= 3 && assessment2Progress >= 2 && assessment3Progress >= 2) {
        const hasJianzha = state.inventory.find(i => i.name === '鑑札');
        if (!hasJianzha) {
            collectItem('item', '鑑札', '官設檢番核發之藝旦執業執照，通過三項考核的證明。', null, false);
            unlockNextLevel(5, "🔓 獲得「鑑札」！解鎖最終章！");
            
            setTimeout(() => {
                document.getElementById('modal-jianzha').classList.remove('hidden');
            }, 600);
        }
        renderFinalChapterDoor();
    }
}

function renderFinalChapterDoor() {
    const yidanScene = document.getElementById('scene-yidan');
    if (!yidanScene) return;
    
    let oldBtn = document.getElementById('btn-enter-final-door');
    if (oldBtn) oldBtn.remove();

    if (assessment1Progress >= 3 && assessment2Progress >= 2 && assessment3Progress >= 2) {
        const hasGlossary = hasCollected('名詞解釋冊');
        const doorBtn = document.createElement('button');
        doorBtn.id = 'btn-enter-final-door';
        doorBtn.className = 'absolute bottom-10 left-1/2 transform -translate-x-1/2 z-40 ui-btn px-8 py-3 rounded-full text-xl font-bold tracking-widest border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.8)] animate-bounce';
        
        if (!hasGlossary) {
            doorBtn.onclick = () => enterMemoryPuzzle();
            doorBtn.innerHTML = '<i class="fas fa-th-large mr-2"></i>出示鑑札，進行十六宮格挑戰';
        } else {
            doorBtn.onclick = () => enterFinalChapter();
            doorBtn.innerHTML = '<i class="fas fa-scroll mr-2"></i>帶著名詞解釋冊，前往最終章';
        }
        yidanScene.appendChild(doorBtn);
    }

}

function enterFinalFromJianzha() {
    document.getElementById('modal-jianzha').classList.add('hidden');
    enterFinalChapter();
}

// ==========================================
// ★ 最終章：王香禪生平考卷系統 (六頁分頁 + 同格自動連動 + 字數提示)
// ==========================================
const finalExamAnswers = [
    // 第一頁：一、貧家女童到一代名旦：為價碼而生的才華
    { id: 0,  page: 0, group: 'p1_0', width: '5.5em', accepts: ['王罔市', '王岡市'] },
    { id: 1,  page: 0, group: 'p1_1', width: '5.5em', accepts: ['董阿治', '董仔治'] },
    { id: 2,  page: 0, group: 'p1_2', width: '5.5em', accepts: ['王子鶴'] },
    { id: 3,  page: 0, group: 'p1_3', width: '6.5em', accepts: ['劍樓書塾'] },
    { id: 4,  page: 0, group: 'p1_4', width: '5.5em', accepts: ['趙一山'] },
    { id: 5,  page: 0, group: 'p1_5', width: '5.5em', accepts: ['平樂遊'] },
    { id: 6,  page: 0, group: 'p1_6', width: '6.5em', accepts: ['艋舺第一花魁'] },

    // 第二頁：二、殖民法制與行規的雙重枷鎖：層層束縛下的藝旦
    { id: 7,  page: 1, group: 'p2_0', width: '4.5em', accepts: ['酌婦'] },
    { id: 8,  page: 1, group: 'p2_1', width: '5.5em', accepts: ['朝鮮樓'] },
    { id: 9,  page: 1, group: 'p2_2', width: '4.5em', accepts: ['遊廓' ] },
    { id: 10, page: 1, group: 'p2_3', width: '4.5em', accepts: ['檢番'] },
    { id: 11, page: 1, group: 'p2_4', width: '4.5em', accepts: ['鑑札'] },
    { id: 12, page: 1, group: 'p2_5', width: '6.5em', accepts: ['番仔酒矸'] },
    { id: 13, page: 1, group: 'p2_6', width: '5.5em', accepts: ['飲墨水'] },
    { id: 14, page: 1, group: 'yidan_room', width: '5.5em', accepts: ['藝旦間', '藝妲間'] },
    { id: 15, page: 1, group: 'p2_7', width: '5.5em', accepts: ['二次會'] },
    { id: 16, page: 1, group: 'yidan_room', width: '5.5em', accepts: ['藝旦間', '藝妲間'] },
    { id: 17, page: 1, group: 'p2_8', width: '5.5em', accepts: ['壓菸盤', '壓煙盤'] },
    { id: 18, page: 1, group: 'p2_9', width: '5.5em', accepts: ['寶美樓'] },

    // 第三頁：三、藝旦舞臺的現代轉向：藝旦的妥協與調適
    { id: 19, page: 2, group: 'jiulou', width: '4.5em', accepts: ['酒樓'] },
    { id: 20, page: 2, group: 'jiulou', width: '4.5em', accepts: ['酒樓'] },
    { id: 21, page: 2, group: 'jiulou', width: '4.5em', accepts: ['酒樓'] },
    { id: 22, page: 2, group: 'jiulou', width: '4.5em', accepts: ['酒樓'] },
    { id: 23, page: 2, group: 'jiulou', width: '4.5em', accepts: ['酒樓'] },
    { id: 24, page: 2, group: 'nanguan', width: '4.5em', accepts: ['南管'] },
    { id: 25, page: 2, group: 'nanguan', width: '4.5em', accepts: ['南管'] },

    // 第四頁：四、被觀看，也被看見：從被凝視的商品到公眾舞臺
    { id: 26, page: 3, group: 'p4_0', width: '6.5em', accepts: ['赤城花榜'] },
    { id: 27, page: 3, group: 'p4_1', width: '7.5em', accepts: ['我們的竹東'] },
    { id: 28, page: 3, group: 'p4_2', width: '4.5em', accepts: ['藝閣'] },
    { id: 29, page: 3, group: 'p4_3', width: '5.5em', accepts: ['藝旦戲', '藝妲戲'] },

    // 第五頁：五、一生的三個男人：身不由己的情愛歸宿
    { id: 30, page: 4, group: 'luo',  width: '5.5em', accepts: ['羅秀惠'] },
    { id: 31, page: 4, group: 'luo',  width: '5.5em', accepts: ['羅秀惠'] },
    { id: 32, page: 4, group: 'p5_0', width: '7.5em', hint: '3字', accepts: ['加羅的', '加勞的', '加羅（勞）的', '加羅(勞)的'] },
    { id: 33, page: 4, group: 'lian', width: '5.5em', hint: '2~3字', accepts: ['連雅堂', '連橫'] },
    { id: 34, page: 4, group: 'lian', width: '5.5em', hint: '2~3字', accepts: ['連雅堂', '連橫'] },
    { id: 35, page: 4, group: 'xie',  width: '5.5em', accepts: ['謝介石'] },
    { id: 36, page: 4, group: 'xie',  width: '5.5em', accepts: ['謝介石'] },
	{ id: 37, page: 4, group: 'xie',  width: '5.5em', accepts: ['謝介石'] },
    { id: 38, page: 4, group: 'xie',  width: '5.5em', accepts: ['謝介石'] },
    { id: 39, page: 4, group: 'p5_1', width: '5.5em', accepts: ['鄭肇基'] },
    { id: 40, page: 4, group: 'xie',  width: '5.5em', accepts: ['謝介石'] },
    { id: 41, page: 4, group: 'xie',  width: '5.5em', accepts: ['謝介石'] },

    // 第六頁：六、市場擠壓與戰時政策：藝旦的終局與時代容顏
    { id: 42, page: 5, group: 'p6_0',  width: '5.5em', accepts: ['咖啡店', '咖啡廳'] },
    { id: 43, page: 5, group: 'nugei', width: '4.5em', accepts: ['女給'] },
    { id: 44, page: 5, group: 'nugei', width: '4.5em', accepts: ['女給'] },
    { id: 45, page: 5, group: 'nugei', width: '4.5em', accepts: ['女給'] }
];

const finalExamPages = [
    {
        tabLabel: '第一頁',
        title: '一、貧家女童到一代名旦：為價碼而生的才華',
        intro: '在歷史的褶皺裡，藝旦常被定格於泛黃相片中那抹幽微矜持的淺笑，或是文人筆下纏綿香豔的篇章。然而，她們肩上扛著的多是迫於無奈的宿命。耐人尋味的是，這群在父權社會中處於弱勢的女子，卻屢屢讓文人高官拜倒裙下；是最早經濟獨立、引領時髦與前衛的女性象徵、是流行的範本，卻也是令有夫之婦如臨大敵的存在。如此矛盾的處境，使藝旦的形象益發迷人。<br><br>被譽為「藝旦中的藝旦」的王香禪，一生恰似一面明鏡，映照出清末移墾社會的階層買賣、日治殖民統治下的空間管束，以及文人階層的認同轉移。她的際遇，亦是台灣眾藝旦的縮影：自社會底層一路攀上名滿南北的花魁，販售被迫養成的才華，待到繁華落盡，一切光鮮背後，無不是被時代巨浪推著前行，折射出動盪時局中的身不由己。然而，在重重束縛之中，她們也並非全然被動，仍努力在夾縫裡為自己爭得一席之地。',
        paragraphs: [
            `1886年，王香禪出生於艋舺貧苦的魚販之家，本名「{0}」。清末至日治初期的台灣社會，買賣人口與收養「苗媳（養女）」之風極盛，統計顯示高達八成的煙花女子源於貧困家庭的轉賣。幼年的王罔市被轉賣給龍山寺附近的鴇母{1}（董仔治）門下，自此踏入標榜高階文藝的藝旦養成網絡，淪為供人投資、待價而沽的「商品」。因深愛《紅樓夢》的林黛玉，她為自己取了字號「黛卿」，卻也隱隱為孤絕而顛沛的一生埋下伏筆。`,
            `藝旦的命運裡，才藝從來不是純粹的理想追求，而是鴇母讓「藝旦囡仔」早日撐起門面、抬高身價、換取鉅額回報的資本。王香禪約莫九、十歲起，鴇母便延聘名師嚴格教習，由教曲師傅傳授唱工，並請先生指導漢學。天資聰穎的她，經艋舺詩人{2}引介，師從大稻埕「{3}」名士{4}研習詩詞，每日清晨自艋舺搭車趕赴大稻埕上課；又拜艋舺名樓「{5}」創辦人楊印堂為師，苦練曲藝，日後成為名旦，甚至有「{6}」之稱。這套浸透淚水的技藝養成體系，宛如買賣結構在幼小身軀上強行鐫刻的生存籌碼。`
        ]
    },
    {
        tabLabel: '第二頁',
        title: '二、殖民法制與行規的雙重枷鎖：層層束縛下的藝旦',
        paragraphs: [
            `日治時期風月市場繁複多元，總督府將風月女子分為三等：「藝旦」（賣藝不賣身）、「藝娼」（賣藝也賣身）與「{7}」（陪酒女子）。其中藝旦陪酒的價碼最高，另有因帝國統治流動而從朝鮮引進的女子，所在處稱{8}。`,
            `總督府同時引進嚴密的現代化公衛與社會管束機制，在各大城市劃定特定的風化區「{9}」予以空間隔離。以「{10}」制度將風月女子納入國家法制的羅網，統一核發營業許可證「{11}」，嚴格登錄本居、本籍、寄留地與出生年月日，連外出營業與返回都須報備。日人更在大稻埕名樓「江山樓」與「蓬萊閣」設立檢番事務所，掌控出局收費，並由資深藝妓出任檢番幹部，藝旦每次出局須繳一圓，名義上為防疫、杜絕私娼，實則是以公權力層層剝削賣笑所得，使她們成為稅金大戶。檢番的箝制與剝削，激起了台灣人對日本人的仇恨，因此，藝旦陪日本人飲酒尚可，陪宿則不可被接受，一旦委身日人，便被烙上「{12}」的污名，在鄉里間無法立足，非得遠走高飛不可。`,
            `依行規，藝旦在藝旦間見習後，至十四、五歲及笄之年，多須隨養母南下中南部名樓歷練三至五年，俗稱「{13}」，藉以開拓地主富紳客源、積攢名氣與資本，再衣錦北返。北部藝旦多坐鎮自宅，待客人招喚「出局」；中南部名樓的藝旦則多來自北部，寄身酒樓菜館常駐迎客，她們在南部若非簽下年限、所得歸樓主的「購」，便是按提成抽佣的「自立」，終究都是寄人籬下的營生，俗諺「頂港擔魚落下港，零星不賣欲倚行；小娘在厝金吊桶，出外無揀好呆人」，道盡少女離鄉背井、依附樓主的處境。`,
            `當時豪商文士在江山樓等處散席後，常相偕轉往藝旦的「{14}」也就是藝旦的香閨，延續「{15}」。「{16}」，通常會有雕花紅木眠床、八仙桌椅與文人字畫，為了裝飾至少也須一千圓以上，花費多寡同時也彰顯身價。在此私密雅緻的空間裡吃清粥、品瓜果，聽藝旦自彈琵琶唱曲或行令划拳。賓客蒞臨藝旦間飲宴，照例要封上一份紅包，俗源於早年，藝旦的家人（多為老鴇）會端出煙盤，供賓客吞雲吐霧，賓客感念款待之情，便將銀錢壓在盤上以為答謝，「{17}」之名由此而生。及至日本政府禁絕台灣人吸食鴉片，盤中之物遂換成香煙、瓜子與蜜餞，唯獨壓盤的規矩流傳下來。`,
            `而王香禪的南下，除了遵循行規，另有一說是她受抗日首領陳秋菊所辱，迫於無奈只得遠走台南府城，寄寓名樓「{18}」。煙花女子的尊嚴如風中飄絮，即便才高名著，面對時局的暴虐，也唯有輾轉流離，將屈辱與眼淚和著琵琶弦音，默默吞入心底。`
        ]
    },
    {
        tabLabel: '第三頁',
        title: '三、藝旦舞臺的現代轉向：藝旦的妥協與調適',
        paragraphs: [
            `在制度枷鎖日趨沉重之際，台灣的娛樂生態與市場品味也驟然劇變。清代移民渡台落籍，廟宇林立，民間戲曲依附酬神祭祀而興盛；清中葉以來的宴飲，則多限於少數富豪士紳私密閉鎖的「花廳」。待日治時期現代城市與交通網絡建立，兼具開放性、商業性與展示功能的近代「{19}」迅速崛起。{20}與藝旦形成緊密的共生生態：{21}缺了藝旦執壺唱曲，難以聚客；藝旦亦須藉{22}宴席確立身價。`,
            `{23}的繁興不僅是商業與餐飲的擴張，更具深刻的政治與文化象徵。對身處異族統治與同化壓力下的台灣精英而言，在酒樓中品嘗精緻台菜、吟詠擊缽詩、沉醉於琵琶絲竹，構成一座維繫漢文化記憶的「文化避難堡壘」，得以重溫故國氣息、彼此慰藉。另一方面，日本官員與在台日人也常因公私交誼踏足酒樓，使其成為統治者與被統治者相互溝通、帶有軟性非官方色彩的公共空間。`,
            `為在劇烈變動的市場中維持身價，藝旦的才藝不得不順應時代，展開全方位的「現代轉向」。清末來台移民以流行{24}的漳泉族群為主，故藝旦學習彈唱由傳統{25}為主，而後轉向迎合商賈喜好的北管、京劇、新劇、歌仔戲乃至流行歌謠；樂器除琵琶、古箏、揚琴外，連象徵西方文明的「風琴」也進入演奏行列。到日治後期，隨著留聲機普及、黑膠唱盤引入，歐美社交舞經由日本席捲台灣都市，各類舞蹈研究俱樂部相繼成立，原本不諳舞蹈的台灣藝旦，在市場競爭下也不得不放下傳統包袱，穿上及膝洋裝、踩著三吋高跟鞋學習舞步，在宴席上與賓客相擁起舞。`,
            `藝旦的才藝每一次與時俱進，都是大環境逼迫下為求餬口的妥協與調適，王香禪正是在這座兼具文化抵抗與政治交融的舞台上名噪一時。`
        ]
    },
    {
        tabLabel: '第四頁',
        title: '四、被觀看，也被看見：從被凝視的商品到公眾舞臺',
        paragraphs: [
            `1920年，連橫借鏡《遊戲報》的模式，在台南發起「{26}」，將科舉功名的等級：秀才、進士、狀元、榜眼、探花，移植於風月評比。其後，《風月》雜誌的「台北美人人氣投票」與各大報刊專欄更是刊登大幅寫真，評點服飾眉眼。`,
            `花榜起初是文人雅趣，後來卻成了生意，有些富商巨賈為吹捧意中人，不惜重金賄賂報社記者大肆宣傳，主辦方則靠門票、選票、寫真與明信片等周邊商品大賺其錢，在金錢交易的本質裡，藝旦始終是被觀看、被評頭論足的「精緻商品」。這種凝視與物化，日後甚至演變為國策的耗材，如被認為是台灣寫真集濫觴的《{27}》即為一例，竹東街長吉田三三郎動員全鎮酒女拍攝面帶微笑的「慰問寫真」，寄往前線，期望成為鼓舞出征軍伕士氣的政治工具。`,
            `然而，在被觀看的宿命夾縫中，藝旦也展現出主動開拓生存邊界的韌性。或隨商賈往返海外賣藝，從穿著到語言迅速汲取國際脈動，成為具備跨國歷練的新女性；或走出閉鎖的藝旦間，在歲時迎神中盛裝登上高聳的「{28}」遊行，參與全女班「{29}」的售票公演；更率先走進放送局廣播、踏入錄音室灌錄黑膠唱片，乃至涉足無聲電影演出；1935年中部大地震後，藝旦們還挺身組織慈善義演，募款賑災。她們不再是被動接受養成的角色，而展現爭取才華曝光的能動性，借助時局賦予的現代傳媒重塑形象，試圖自立自重、成為引領風尚的公眾明星，在父權與殖民的夾縫中奮力爭得一席之地。`
        ]
    },
    {
        tabLabel: '第五頁',
        title: '五、一生的三個男人：身不由己的情愛歸宿',
        paragraphs: [
            `昔日風光一時的藝旦，終究難逃年華老去的命運，若能遇上有緣人，或嫁或贖，遂成為多數藝旦掙脫風塵鎖鏈的指望；也有人晉身鴇母，收養幾個養女，重新豎起豔幟。命薄者，或剃度出家，或一死了之，或與人私奔不成，反而雙雙殉情，更有人終其一生在風塵中載浮載沉，就此了卻殘生，留給後人無限的唏噓與想像。而王香禪看似傳奇的婚戀歷程中，每一次對歸宿的抉擇，卻往往只是從一個深淵跌入另一個由時代編織的宿命漩渦。`,
            `台南南社成員、風流舉人{30}對她展開熱烈追求，王香禪為其深情所動，為己贖身，毅然下嫁。然而，婚姻不如想像中的美好，迅速被浪子的舊習粉碎，{31}婚後依舊流連花叢，不久便移情於南社社長蔡國琳之女、名門才女蔡碧吟，甚至不惜入贅蔡家，引得府城百姓以「蔡姑娘仔嫁尪——{32}」作為街談巷議的譏諷嘲弄。慘遭棄絕的王香禪嚐盡情愛幻滅之苦，離開傷心地，長齋禮佛，並以「香禪」為名在報章詩壇發表幽怨沉痛的詩篇，藉筆墨超渡自己支離破碎的半生。`,
            `寄寓台南寶美樓期間，時任《臺南新報》漢文主筆的{33}驚豔於她的絕倫才情，收其為女弟子悉心傳授詩藝，據傳兩人因而產生情愫，王香禪暗生傾慕，甘願屈身為側室，然而{34}已有結髮妻子，且受男女平等思想影響、誓不納妾，兩人終其一生退居為以禮相待的精神知己。`,
            `1912年在親友撮合下，洗盡鉛華的王香禪改嫁新竹名士{35}，隨夫離台遠赴上海，尋求新的人生契機。然而，這一次的歸宿，卻將她更深地捲入了近代東亞地緣政治的殘酷風暴中。昭和七年（1932），日本在中國東北扶植滿洲國，{36}附時局一躍成為滿洲國首任外交總長兼駐日大使，權勢如日中天。昭和十年（1935，台灣始政四十周年），{37}以帝國特使高官之姿返台展開長達八十天的巡迴訪問，被島內視為空前的「衣錦還鄉」盛事。就在這趟回台期間，{38}為次子迎娶新竹首富{39}的三女鄭臻臻，根據謝家後代所言，當年在新竹淨業院連開三天、每晚六十桌盛宴，重金聘請上海京班連演三晚助興，鄭家更特製長達一公尺的純金棺材作為豪奢添箱，轟動全島。`,
            `然而，在這段婚姻裡，王香禪依然是滿腹辛酸與冰冷，{40}納妾自重、日夜周旋於政客商賈之間，夫妻情分早已名存實亡、形同陌路。更嚴酷的打擊隨時局而至，1945年日本無條件投降，滿洲國土崩瓦解，{41}淪為戰犯，身陷囹圄、晚年病歿北京，王香禪再度被時代狂濤狠狠拋擲，帶著子女在戰後混亂動盪的北平與天津街巷間艱困度日，晚年唯有素服誦經聊度殘生。`
        ]
    },
    {
        tabLabel: '第六頁',
        title: '六、市場擠壓與戰時政策：藝旦的終局與時代容顏',
        paragraphs: [
            `1930年代後期，資本市場與戰時體制的雙重碾壓，逐漸將傳統藝旦推向歷史的死角。{42}興起，「{43}」與摩登「舞女」因消費低廉、作風大膽活潑而迅速崛起，席捲都市娛樂市場，而傳統藝旦需耗費數年習藝、收費高昂，無力招架，只得在現實逼迫下褪下旗袍轉行為{44}或舞女。`,
            `另一記為藝旦文化敲響的喪鐘，來自殖民政府在戰時體制下的政治扼殺。1936年，大稻埕檢番出面招集藝旦成立「稻華會」，表面上宣稱是為化解藝旦與新興{45}之間的市場嫌隙，勉勵彼此切磋技藝、團結「為國效命」，實質上這是一場精密包裝的殖民同化策略，意圖瓦解中國文化，一步步將她們編入戰爭動員機器。`,
            `隨著戰火蔓延，總督府厲行「禁鼓樂」與「奢侈禁止令」，封殺漢樂演出，更將藝妓花代稅提高至難以承受的百分之三百，既為斬斷漢文化，也為籌措戰費。在稅負與生存絕境的夾擊下，酒樓與劇場的唱曲藝旦幾乎絕跡。更悲慘的是，檢番機構握有完備的花柳名冊，戰時竟成為日軍強徵女性赴前線從事慰安工作的清冊，眾多無辜女子身不由己地被推入侵略戰爭的血淚深淵。`,
            `昔日酒樓裡的琵琶聲響、藝閣遊行的奪目光華、豪門盛宴的鼎沸喧囂，終究都在歷史巨浪中碎裂為遙遠的殘夢。王香禪的一生，恰是近代台灣藝旦群體的縮影，她從艋舺底層被買賣的貧家幼女，被規訓為色藝雙全的名樓花魁；奔波南北，在文人依戀與始亂終棄中體會情愛虛無；後隨夫婿登上傀儡政權的富貴頂點，最終因東亞局勢崩潰，淪落平津街巷，孤苦誦經。`,
            `她們無法選擇出身，無法主宰才藝習得的初衷，才華隨商賈品味與現代風潮被迫轉向；她們無法擺脫男性社會的物化，甚至在戰時體制下被榨乾為政治宣傳與軍國耗材。然而，正是在重重身不由己的枷鎖下，她們憑藉進取心跨向現代舞台，在夾縫中創造更多可能。那道穿透殖民與父權煙塵的素服身影，終究在不可抗拒的歷史洪流中，為近代台灣女性刻下一幅充滿悲劇力量、卻又自立自重的時代容顏。`
        ]
    }
];

let finalExamInitialized = false;
let currentExamPage = 0;

function enterFinalChapter(isBack = false) {
    hideCharacter();
    switchScene('scene-final', isBack);
    if (!finalExamInitialized) {
        renderFinalExam();
        finalExamInitialized = true;
    }
    switchExamPage(currentExamPage);
}

function renderFinalExam() {
    const tabsContainer = document.getElementById('exam-page-tabs');
    const bodyContainer = document.getElementById('final-exam-body');
    if (!tabsContainer || !bodyContainer) return;

    tabsContainer.innerHTML = finalExamPages.map((page, idx) => `
        <button id="exam-tab-${idx}" onclick="switchExamPage(${idx})" class="px-3 py-1 rounded text-sm font-bold border-2 border-[#5a3c28] bg-[#d4b886] text-[#3e2723] transition">
            ${page.tabLabel} <span id="exam-tab-status-${idx}" class="ml-1"></span>
        </button>
    `).join('');

    bodyContainer.innerHTML = finalExamPages.map((page, idx) => {
        const introHtml = page.intro
            ? `<p class="indent-8 mb-6 pb-5 border-b border-dashed border-[#a37c4d] text-[#4a2e1b] leading-[2.2]">${page.intro}</p>`
            : '';

        const parasHtml = page.paragraphs.map(p => {
            const html = p.replace(/\{(\d+)\}/g, (_, blankIdx) => {
                const cfg = finalExamAnswers[parseInt(blankIdx)];
                const hintText = cfg.hint || `${cfg.accepts[0].length}字`;
                return `<input type="text" id="exam-blank-${cfg.id}" data-group="${cfg.group}" oninput="syncExamGroup(this)" class="exam-blank" style="width: ${cfg.width};" placeholder="${hintText}">`;
            });
            return `<p class="indent-8">${html}</p>`;
        }).join('');

        return `
            <div id="exam-page-${idx}" class="exam-page space-y-5 ${idx === 0 ? '' : 'hidden'}">
                ${introHtml}
                <h3 class="text-xl md:text-2xl font-black text-[#8b0000] border-l-4 border-[#8b0000] pl-3">${page.title}</h3>
                ${parasHtml}
            </div>
        `;
    }).join('');
}

function switchExamPage(pageIdx) {
    if (pageIdx < 0 || pageIdx >= finalExamPages.length) return;
    currentExamPage = pageIdx;

    finalExamPages.forEach((_, idx) => {
        const pageEl = document.getElementById(`exam-page-${idx}`);
        const tabEl = document.getElementById(`exam-tab-${idx}`);
        if (pageEl) pageEl.classList.toggle('hidden', idx !== pageIdx);
        if (tabEl) {
            if (idx === pageIdx) {
                tabEl.className = 'px-3 py-1 rounded text-sm font-bold border-2 border-[#8b0000] bg-[#8b0000] text-[#e2cda6] shadow transition';
            } else {
                tabEl.className = 'px-3 py-1 rounded text-sm font-bold border-2 border-[#5a3c28] bg-[#d4b886] text-[#3e2723] hover:bg-[#c8a76e] transition';
            }
        }
    });

    const prevBtn = document.getElementById('btn-exam-prev');
    const nextBtn = document.getElementById('btn-exam-next');
    if (prevBtn) prevBtn.disabled = (pageIdx === 0);
    if (nextBtn) nextBtn.disabled = (pageIdx === finalExamPages.length - 1);

    const bodyEl = document.getElementById('final-exam-body');
    if (bodyEl) bodyEl.scrollTop = 0;
}

function prevExamPage() {
    switchExamPage(currentExamPage - 1);
}

function nextExamPage() {
    switchExamPage(currentExamPage + 1);
}

function syncExamGroup(sourceEl) {
    const group = sourceEl.dataset.group;
    if (!group) return;
    const val = sourceEl.value;
    document.querySelectorAll(`.exam-blank[data-group="${group}"]`).forEach(el => {
        if (el !== sourceEl) el.value = val;
        el.classList.remove('blank-wrong');
    });
}

function checkFinalExam() {
    const groupResults = {};
    const pageHasError = Array(finalExamPages.length).fill(false);

    finalExamAnswers.forEach(cfg => {
        const inputEl = document.getElementById(`exam-blank-${cfg.id}`);
        if (!inputEl) return;
        const val = inputEl.value.trim();
        const isCorrect = cfg.accepts.includes(val);

        inputEl.classList.remove('blank-correct', 'blank-wrong');
        if (isCorrect) {
            inputEl.classList.add('blank-correct');
            inputEl.readOnly = true;
            groupResults[cfg.group] = true;
        } else {
            inputEl.classList.add('blank-wrong');
            groupResults[cfg.group] = false;
            pageHasError[cfg.page] = true;
        }
    });

    pageHasError.forEach((hasErr, idx) => {
        const statusEl = document.getElementById(`exam-tab-status-${idx}`);
        if (!statusEl) return;
        statusEl.innerHTML = hasErr
            ? '<i class="fas fa-exclamation-circle text-red-400"></i>'
            : '<i class="fas fa-check-circle text-green-400"></i>';
    });

    const totalGroups = Object.keys(groupResults).length;
    const correctGroups = Object.values(groupResults).filter(Boolean).length;

    const feedback = document.getElementById('exam-feedback');
    feedback.classList.remove('hidden');

    if (correctGroups === totalGroups) {
        feedback.className = 'text-center text-base md:text-lg font-bold text-green-800';
        feedback.innerText = `🎉 六頁全部答對（${totalGroups} / ${totalGroups} 題）！歷史拼圖已完整！`;

        if (state.timerInterval) clearInterval(state.timerInterval);
        playSFX('sfx-tick');

        const recordEl = document.getElementById('clear-time-record');
        if (recordEl) {
            if (isChapterSelectMode) {
                recordEl.innerText = '模式：分章節體驗通關';
            } else {
                const usedSec = 3600 - state.timeRemaining;
                const mins = Math.floor(usedSec / 60);
                const secs = usedSec % 60;
                recordEl.innerText = `完整體驗通關耗時：${mins} 分 ${secs} 秒`;
            }
        }

        setTimeout(() => {
            triggerTimeResetToCafe();
        }, 800);
    } else {
        const errorPages = pageHasError
            .map((hasErr, i) => (hasErr ? `第${i + 1}頁` : null))
            .filter(Boolean)
            .join('、');

        feedback.className = 'text-center text-sm md:text-base font-bold text-[#8b0000]';
        feedback.innerText = `目前答對 ${correctGroups} / ${totalGroups} 題，尚有錯誤的頁面：${errorPages}`;
        showNotification(`尚有 ${totalGroups - correctGroups} 題未正確填入`);
    }
}

function resetFinalExam() {
    finalExamAnswers.forEach(cfg => {
        const inputEl = document.getElementById(`exam-blank-${cfg.id}`);
        if (inputEl) {
            inputEl.value = '';
            inputEl.readOnly = false;
            inputEl.classList.remove('blank-correct', 'blank-wrong');
        }
    });
    finalExamPages.forEach((_, idx) => {
        const statusEl = document.getElementById(`exam-tab-status-${idx}`);
        if (statusEl) statusEl.innerHTML = '';
    });
    const feedback = document.getElementById('exam-feedback');
    if (feedback) feedback.classList.add('hidden');
}

function finishGameToHome() {
    document.getElementById('modal-game-clear').classList.add('hidden');
    enterLevelSelect();
}

// ==========================================
// ★ 需求 9：藝旦間暗室與開燈機制
// ==========================================
let isYidanLightOn = false;

function enterYidanRoom() {
    switchScene('scene-yidan');
    const darkOverlay = document.getElementById('yidan-dark-overlay');
    if (!isYidanLightOn && darkOverlay) {
        darkOverlay.classList.remove('hidden', 'opacity-0');
        darkOverlay.classList.add('opacity-100');
        showNotification("房間一片漆黑，請先尋找電燈開關……");
    } else {
        startDialog('yidanIntro');
    }
}

function turnOnYidanLight() {
    if (isYidanLightOn) return;
    isYidanLightOn = true;
    playSFX('sfx-light'); // ★ 播放開燈音效

    const darkOverlay = document.getElementById('yidan-dark-overlay');
    if (darkOverlay) {
        darkOverlay.classList.remove('opacity-100');
        darkOverlay.classList.add('opacity-0');
        setTimeout(() => {
            darkOverlay.classList.add('hidden');
            startDialog('yidanIntro');
        }, 1000);
    }
}

// ==========================================
// ★ 需求 11：恐怖驚悚特效 (碎玻璃 + 劇烈震動 + 紅字衝出)
// ==========================================
function triggerHorrorEffect(msg = "找到那個「她」！", onComplete = null) {
    const container = document.getElementById('game-container');
    const layer = document.getElementById('horror-layer');
    const bg = document.getElementById('horror-bg');
    const textEl = document.getElementById('horror-text');
    const glass = document.getElementById('glass-shatter-overlay');
    if (!layer || !container) {
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    playSFX('sfx-shatter');
    layer.classList.remove('hidden');
    if (bg) bg.style.opacity = '0.85';
    if (glass) glass.classList.remove('hidden');
    container.classList.add('shake-violent');

    if (textEl) {
        textEl.innerText = msg;
        textEl.classList.remove('animate-text-rush');
        void textEl.offsetWidth;
        textEl.classList.add('animate-text-rush');
    }

    setTimeout(() => {
        container.classList.remove('shake-violent');
        if (bg) bg.style.opacity = '0';
        if (glass) glass.classList.add('hidden');
        setTimeout(() => {
            layer.classList.add('hidden');
            if (textEl) textEl.classList.remove('animate-text-rush');
            // 玻璃碎裂後跳出計時器並開始倒數（僅完整體驗模式）
            if (!isChapterSelectMode && !state.timerInterval) {
                startTimer();
            }
            if (typeof onComplete === 'function') onComplete();
        }, 350);
    }, 2200);
}
// ==========================================
// ★ 需求 12：最終章破關時空重置 -> 回到多那之咖啡廳
// ==========================================
function triggerTimeResetToCafe() {
    const container = document.getElementById('game-container');
    const overlay = document.getElementById('time-reset-overlay');
    const yearEl = document.getElementById('time-reset-year');
    const subEl = document.getElementById('time-reset-sub');
    if (!overlay || !container) {
        document.getElementById('modal-game-clear').classList.remove('hidden');
        return;
    }

    playSFX('sfx-timereset'); // ★ 加入這行：播放時空倒轉音效

    overlay.classList.remove('hidden');

    overlay.classList.remove('hidden');
    overlay.style.backgroundColor = '#000';
    setTimeout(() => { overlay.style.opacity = '1'; }, 30);
    container.classList.add('animate-time-warp');

    let year = 1935;
    if (yearEl) yearEl.innerText = year;
    if (subEl) subEl.innerText = '時空重置中……';

    const yearTimer = setInterval(() => {
        year += 4;
        if (year >= 2026) {
            year = 2026;
            clearInterval(yearTimer);
            if (subEl) subEl.innerText = '歡迎回到現實';
        }
        if (yearEl) yearEl.innerText = year;
    }, 65);

    setTimeout(() => {
        overlay.style.backgroundColor = '#ffffff';
        if (yearEl) yearEl.style.color = '#3e2723';
        if (subEl) subEl.style.color = '#5a3c28';
        switchScene('scene-cafe');
        showCharacter('角色.png');
    }, 1800);

    setTimeout(() => {
        overlay.style.opacity = '0';
        container.classList.remove('animate-time-warp');
        setTimeout(() => {
            overlay.classList.add('hidden');
            if (yearEl) yearEl.style.color = '';
            if (subEl) subEl.style.color = '';
            document.getElementById('modal-game-clear').classList.remove('hidden');
        }, 700);
    }, 2600);
}
// ==========================================
// ★ 開發者檢測面板 (按 Alt + D 開啟/關閉)
// ==========================================
const DEBUG_MODE = true; // 正式發布前改成 false 即可關閉

if (DEBUG_MODE) {
    window.addEventListener('DOMContentLoaded', initDebugPanel);
    window.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'd' || e.key === 'D')) {
            e.preventDefault();
            const panel = document.getElementById('dev-debug-panel');
            if (panel) panel.classList.toggle('hidden');
        }
    });
}

function initDebugPanel() {
    if (document.getElementById('dev-debug-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'dev-debug-panel';
    panel.className = 'fixed top-16 right-4 z-[9999] w-72 max-h-[80vh] overflow-y-auto bg-stone-950/95 border-2 border-emerald-500 rounded-xl p-4 text-xs text-stone-200 shadow-2xl hidden';
    panel.innerHTML = `
        <div class="flex justify-between items-center border-b border-emerald-700 pb-2 mb-3">
            <span class="font-bold text-emerald-400 text-sm">🛠️ 開發者檢測面板</span>
            <button onclick="document.getElementById('dev-debug-panel').classList.add('hidden')" class="text-stone-400 hover:text-white">✕</button>
        </div>

        <div class="mb-3">
            <div class="text-amber-400 font-bold mb-1.5">📍 場景瞬移</div>
            <div class="grid grid-cols-2 gap-1.5">
                <button onclick="devJump('scene-level-select')" class="bg-stone-800 hover:bg-stone-700 py-1 rounded">章節選單</button>
                <button onclick="devJump('scene-map-puzzle')" class="bg-stone-800 hover:bg-stone-700 py-1 rounded">地圖疊合</button>
                <button onclick="devJump('scene-room1')" class="bg-stone-800 hover:bg-stone-700 py-1 rounded">寶美樓</button>
                <button onclick="devJump('scene-poem-puzzle')" class="bg-stone-800 hover:bg-stone-700 py-1 rounded">連雅堂詩箋</button>
                <button onclick="devJump('scene-luo-puzzle')" class="bg-stone-800 hover:bg-stone-700 py-1 rounded">羅秀惠賓果</button>
                <button onclick="devJump('scene-xie-puzzle')" class="bg-stone-800 hover:bg-stone-700 py-1 rounded">謝介石護照</button>
                <button onclick="devJump('scene-room2')" class="bg-stone-800 hover:bg-stone-700 py-1 rounded">江山樓大廳</button>
                <button onclick="devJump('scene-bath')" class="bg-stone-800 hover:bg-stone-700 py-1 rounded">四樓浴廁</button>
                <button onclick="devJump('scene-serving')" class="bg-stone-800 hover:bg-stone-700 py-1 rounded">筵席上菜</button>
                <button onclick="devJump('scene-yidan')" class="bg-stone-800 hover:bg-stone-700 py-1 rounded">藝旦間</button>
                <button onclick="devJump('scene-final')" class="bg-emerald-900 hover:bg-emerald-800 py-1 rounded col-span-2 font-bold">最終章考卷</button>
				<button onclick="devJump('scene-memory-puzzle')" class="bg-stone-800 hover:bg-stone-700 py-1 rounded">十六宮格翻牌</button>
            </div>
        </div>

        <div class="mb-3">
            <div class="text-amber-400 font-bold mb-1.5">⚡ 一鍵通關 / 狀態</div>
            <div class="flex flex-col gap-1.5">
                <button onclick="devUnlockAll()" class="bg-stone-800 hover:bg-stone-700 py-1.5 rounded">解鎖全章節 + 補發全線索道具</button>
                <button onclick="devPassYidan()" class="bg-stone-800 hover:bg-stone-700 py-1.5 rounded">藝旦間：直接完成三項考核</button>
				<button onclick="devPassMemory()" class="bg-stone-800 hover:bg-stone-700 py-1.5 rounded">十六宮格：一鍵配對成功</button>
                <button onclick="devAutoFillExam()" class="bg-amber-800 hover:bg-amber-700 py-1.5 rounded font-bold text-white">最終章：一鍵填入全部正解</button>
            </div>
        </div>

        <div>
            <div class="text-amber-400 font-bold mb-1.5">🎬 特效與系統測試</div>
            <div class="flex flex-col gap-1.5">
                <button onclick="triggerHorrorEffect('找到那個「她」！')" class="bg-red-950 hover:bg-red-900 py-1.5 rounded">測試：恐怖碎玻璃特效</button>
                <button onclick="devTestFist('win')" class="bg-emerald-950 hover:bg-emerald-900 py-1.5 rounded">測試：猜拳考核（贏）</button>
                <button onclick="devTestFist('lose')" class="bg-rose-950 hover:bg-rose-900 py-1.5 rounded">測試：猜拳考核（輸）</button>
				
               <button onclick="triggerTimeResetToCafe()" class="bg-indigo-950 hover:bg-indigo-900 py-1.5 rounded">測試：時空重置回咖啡廳</button>
                <button onclick="devSetTimer(62)" class="bg-stone-800 hover:bg-stone-700 py-1.5 rounded">時間設為 01:02 (測 60 秒警告)</button>
                <button onclick="devClearSave()" class="bg-red-900/60 hover:bg-red-800 py-1.5 rounded text-red-200">清除所有 LocalStorage 存檔</button>
            </div>
        </div>
    `;
    document.body.appendChild(panel);
}

function devJump(sceneId) {
    closeAllModals();
    document.getElementById('dialog-box').style.display = 'none';
    if (sceneId === 'scene-level-select') enterLevelSelect();
    else if (sceneId === 'scene-map-puzzle') enterMapPuzzle();
    else if (sceneId === 'scene-poem-puzzle') enterPoemPuzzle();
    else if (sceneId === 'scene-luo-puzzle') enterLuoPuzzle();
    else if (sceneId === 'scene-xie-puzzle') enterXiePuzzle();
    else if (sceneId === 'scene-serving') enterServingPuzzle();
    else if (sceneId === 'scene-yidan') enterYidanRoom();
	else if (sceneId === 'scene-memory-puzzle') enterMemoryPuzzle();
    else if (sceneId === 'scene-final') enterFinalChapter();
    else switchScene(sceneId);
}

function devUnlockAll() {
    state.unlockedLevel = 5;
    localStorage.setItem('unlockLostArtLevel', 5);
    resetChapterState(5);
    showNotification('🛠️ 已解鎖全部章節並補發所有資料');
}

function devPassYidan() {
    isYidanLightOn = true;
    const darkOverlay = document.getElementById('yidan-dark-overlay');
    if (darkOverlay) darkOverlay.classList.add('hidden');
    assessment1Progress = 3;
    assessment2Progress = 2;
    assessment3Progress = 2;
    localStorage.setItem('unlockLostArtA1', 3);
    localStorage.setItem('unlockLostArtA2', 2);
    localStorage.setItem('unlockLostArtA3', 2);
    syncCollectedDots();
    checkAllAssessmentsComplete();
}

function devAutoFillExam() {
    if (state.currentScene !== 'scene-final') enterFinalChapter();
    finalExamAnswers.forEach(cfg => {
        const el = document.getElementById(`exam-blank-${cfg.id}`);
        if (el) {
            el.value = cfg.accepts[0];
            el.classList.remove('blank-wrong');
        }
    });
    showNotification('🛠️ 已自動填入六頁所有正解，可直接按提交考卷！');
}

function devSetTimer(sec) {
    state.timeRemaining = sec;
    updateTimerUI();
    showNotification(`🛠️ 剩餘時間已設為 ${sec} 秒`);
}

function devClearSave() {
	
    localStorage.clear();
    location.reload();
}
function devTestFist(outcome) {
    // 確保切換到藝旦間並關掉暗室遮罩
    if (state.currentScene !== 'scene-yidan') {
        isYidanLightOn = true;
        const darkOverlay = document.getElementById('yidan-dark-overlay');
        if (darkOverlay) darkOverlay.classList.add('hidden');
        switchScene('scene-yidan');
    }

    const container = document.getElementById('fist-game-container');
    if (container) container.classList.remove('hidden');

    const btnSubmit = document.getElementById('btn-submit-fist');
    if (btnSubmit) btnSubmit.disabled = true;

    if (outcome === 'win') {
        fistTurn = 'player';
        selectedPlayerFingers = 2;
        computerFingers = 3;
        startShowdownAnimation(5);
    } else {
        fistTurn = 'computer';
        selectedPlayerFingers = 2;
        computerFingers = 3;
        computerGuess = 5;
        startShowdownAnimation(null);
    }
} // ★ devTestFist 要在這裡結束

function devPassMemory() {
    if (state.currentScene !== 'scene-memory-puzzle') {
        enterMemoryPuzzle();
    }

    // 將 16 張牌全部翻開並標記配對成功
    document.querySelectorAll('#memory-grid .memory-card').forEach(el => {
        el.classList.add('flipped', 'matched');
        el.classList.remove('mismatched');
    });

    memoryPhase = 'won';
    memoryFlippedCards = [];
    memoryMatchedCount = 8;

    const coverBtn = document.getElementById('btn-memory-cover');
    if (coverBtn) coverBtn.classList.add('hidden');

    const matchEl = document.getElementById('memory-match-count');
    if (matchEl) matchEl.innerText = '8 / 8';

    const statusEl = document.getElementById('memory-status-text');
    if (statusEl) statusEl.innerHTML = '🎉 全部配對成功！獲得《名詞解釋冊》！';

    const finalBtn = document.getElementById('btn-memory-to-final');
    if (finalBtn) finalBtn.classList.remove('hidden');

    playSFX('sfx-tick');
    collectItem('clue', '名詞解釋冊', '收錄日治時期藝旦文化與風月場重要專有名詞的解釋手冊。', null, true);
    syncCollectedDots();
}

// ==========================================
// ★ 線索 C4：藝旦故事十六宮格配對挑戰（無計時・附史料版）
// ==========================================
const yidanMemoryPairs = [
    {
        id: 1,
        name: '阿珠',
        story: '三歲時養於姑母家。姑丈王某惑於蕩婦，勒姑母大歸。後王某商業閉歇，復惑於婦言，迫阿珠抱琵琶、學歌舞，不習常遭摧折，及藝成，名噪遐邇。'
    },
    {
        id: 2,
        name: '小夜子',
        story: '芳年十九，貌似芙蓉，為寶琴苗媳。寶琴與情郎逃走，棄父母與幼女於不顧。桂時年十歲，迫於家計竟作雛妓，長抱琵琶，隨老媽漂泊東墩。'
    },
    {
        id: 3,
        name: '小雲珍',
        story: '家境貧窮、弟妹尚幼，一家七人將作餓鬼。年十三，憂感家道蕭條，遂棄讀書自願下海為藝妓，犧牲潔身以救一家之命，並補助弟妹學資。'
    },
    {
        id: 4,
        name: '阿粉',
        story: '早隸某班，善青衣，嗣該班既歇，遂樹幟。'
    },
    {
        id: 5,
        name: '保治',
        story: '父郭某本崁城考棚口人，業商失敗，流落東墩，俄病殆，保治時十六歲，遂溺苦海。'
    },
    {
        id: 6,
        name: '寶卻',
        story: '十四歲畢業於蓬萊女學堂，就職某郵便局，旋以重聽辭職。母施香原亦門戶中人，遂使學曲以繼舊業，可謂紅顏薄命。'
    },
    {
        id: 7,
        name: '鳳嬌',
        story: '父林某艱於家計，鬻身與稻江老阿香為苗媳。香女金滿素營皮肉生涯，嬌入門遂迫令學曲，不從威以夏楚，不堪其虐墜樓幾死，後乃屈從。'
    },
    {
        id: 8,
        name: '阿碧',
        story: '父吳某，為北勢街人，家貧不能度活，不得已，使碧賣俏。'
    }
];

let memoryPhase = 'playing'; // playing | locked | won
let memoryFlippedCards = [];
let memoryMatchedCount = 0;

function enterMemoryPuzzleFromJianzha() {
    document.getElementById('modal-jianzha').classList.add('hidden');
    enterMemoryPuzzle();
}

function enterMemoryPuzzle(isBack = false) {
    hideCharacter();
    switchScene('scene-memory-puzzle', isBack);
    initMemoryGame();

    // 首次進入先獲得《藝旦小故事史料》
    if (!hasCollected('藝旦小故事史料')) {
        collectItem(
            'item',
            '藝旦小故事史料',
            '記載阿珠、小夜子、小雲珍、阿粉、保治、寶卻、鳳嬌、阿碧等八位藝旦身世的史料。',
            null,
            true
        );
    }
}

function initMemoryGame() {
    memoryPhase = 'memorizing'; // 一開始為記憶階段，等玩家按蓋牌才開始作答
    memoryFlippedCards = [];
    memoryMatchedCount = 0;

    const matchEl = document.getElementById('memory-match-count');
    if (matchEl) matchEl.innerText = '0 / 8';

    const coverBtn = document.getElementById('btn-memory-cover');
    if (coverBtn) coverBtn.classList.remove('hidden');

    const finalBtn = document.getElementById('btn-memory-to-final');
    if (finalBtn) finalBtn.classList.add('hidden');

    const statusEl = document.getElementById('memory-status-text');
    if (statusEl) {
        statusEl.innerHTML = `👀 請先記憶牌面位置，準備好後點擊「蓋牌（開始作答）」`;
    }

    // 建立 16 張牌（8 張藝旦名 + 8 張故事，無顏色圓點）並隨機洗牌
    const deck = [];
    yidanMemoryPairs.forEach(pair => {
        deck.push({ pairId: pair.id, type: 'name', text: pair.name });
        deck.push({ pairId: pair.id, type: 'story', text: pair.story });
    });
    deck.sort(() => Math.random() - 0.5);

    const grid = document.getElementById('memory-grid');
    if (!grid) return;
    grid.innerHTML = '';

    deck.forEach((card, index) => {
        const cardEl = document.createElement('div');
        // ★ 加上 flipped：一開始全部翻開在正面
        cardEl.className = `memory-card flipped ${card.type === 'name' ? 'card-name' : 'card-story'}`;
        cardEl.dataset.index = index;
        cardEl.dataset.pairId = card.pairId;
        cardEl.dataset.type = card.type;
        cardEl.onclick = () => onMemoryCardClick(cardEl);

        const frontContent = card.type === 'name'
            ? `<div class="text-[10px] tracking-widest text-[#8b0000] font-bold mb-1">【藝旦】</div>
               <div class="text-xl md:text-2xl font-black tracking-widest text-[#3e2723] font-serif">${card.text}</div>`
            : `<div class="text-[10px] md:text-xs leading-snug font-serif text-justify overflow-y-auto max-h-full pr-1">${card.text}</div>`;

        cardEl.innerHTML = `
            <div class="memory-card-inner">
                <div class="memory-card-back">
                    <i class="fas fa-fan text-2xl text-amber-500/70 mb-1"></i>
                    <span class="text-[10px] text-amber-200/60 tracking-widest">點擊翻牌</span>
                </div>
                <div class="memory-card-front">
                    ${frontContent}
                </div>
            </div>
        `;
        grid.appendChild(cardEl);
    });
}

function forceCoverMemoryCards() {
    if (memoryPhase !== 'memorizing') return;
    memoryPhase = 'locked';
    playSFX('sfx-click');

    const cards = document.querySelectorAll('#memory-grid .memory-card');
    cards.forEach((el, idx) => {
        setTimeout(() => {
            el.classList.remove('flipped');
        }, idx * 40);
    });

    const coverBtn = document.getElementById('btn-memory-cover');
    if (coverBtn) coverBtn.classList.add('hidden');

    const statusEl = document.getElementById('memory-status-text');
    if (statusEl) {
        statusEl.innerHTML = `🃏 蓋牌中……`;
    }

    setTimeout(() => {
        memoryPhase = 'playing';
        if (statusEl) {
            statusEl.innerHTML = `🃏 已蓋牌！請依序翻開「藝旦」與對應的「故事」進行配對`;
        }
    }, cards.length * 40 + 300);
}
function onMemoryCardClick(cardEl) {
    if (memoryPhase !== 'playing') return;
    if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;

    playSFX('sfx-click');
    cardEl.classList.add('flipped');
    memoryFlippedCards.push(cardEl);

    if (memoryFlippedCards.length === 2) {
        memoryPhase = 'locked';
        const [c1, c2] = memoryFlippedCards;
        const isMatch = (c1.dataset.pairId === c2.dataset.pairId) && (c1.dataset.type !== c2.dataset.type);

        if (isMatch) {
            setTimeout(() => {
                c1.classList.add('matched');
                c2.classList.add('matched');
                memoryFlippedCards = [];
                memoryMatchedCount++;

                const matchEl = document.getElementById('memory-match-count');
                if (matchEl) matchEl.innerText = `${memoryMatchedCount} / 8`;

                if (memoryMatchedCount === 8) {
                    memoryPhase = 'won';
                    playSFX('sfx-tick');
                    const statusEl = document.getElementById('memory-status-text');
                    if (statusEl) statusEl.innerHTML = `🎉 全部配對成功！獲得《名詞解釋冊》！`;
                    const finalBtn = document.getElementById('btn-memory-to-final');
                    if (finalBtn) finalBtn.classList.remove('hidden');

                    collectItem('clue', '名詞解釋冊', '收錄日治時期藝旦文化與風月場重要專有名詞的解釋手冊。', null, true);
                    syncCollectedDots();
                } else {
                    memoryPhase = 'playing';
                }
            }, 350);
        } else {
            // 配對失敗：紅框提示並重新洗牌
            c1.classList.add('mismatched');
            c2.classList.add('mismatched');
            showNotification('❌ 配對錯誤！卡片已重新洗牌，請再挑戰一次！');
            setTimeout(() => {
                initMemoryGame();
            }, 1200);
        }
    }
}
// ==========================================
// ★ 王香禪拼圖進度顯示機制
// ==========================================
// 解鎖順序：先解開四角與四邊，最後一格(索引4，正中央臉部)留到進入最終章才揭曉
const portraitRevealOrder = [0, 2, 6, 8, 1, 3, 5, 7, 4];

function updatePortraitProgress() {
    const widget = document.getElementById('portrait-progress-widget');
    const label = document.getElementById('portrait-progress-label');
    if (!widget) return;

    // 封面、章節選單與序章不顯示，從第一章(寶美樓)開始顯示
    const hiddenScenes = ['scene-home', 'scene-level-select', 'scene-cafe', 'scene-wedding', 'scene-map-puzzle'];
    if (hiddenScenes.includes(state.currentScene)) {
        widget.classList.add('hidden');
        widget.classList.remove('zoomed');
        return;
    }

    widget.classList.remove('hidden');

    // 進入最終章直接呈現完整 9/9；其餘場景依筆記本線索數量逐格解鎖（上限 8/9）
    const isFinal = (state.currentScene === 'scene-final');
    const unlockedCount = isFinal ? 9 : Math.min(state.notebook.length, 8);

    const tiles = widget.querySelectorAll('.portrait-mask-tile');
    const revealedIndices = new Set(portraitRevealOrder.slice(0, unlockedCount));

    tiles.forEach(tile => {
        const idx = parseInt(tile.dataset.tile, 10);
        if (revealedIndices.has(idx)) {
            tile.classList.add('revealed');
        } else {
            tile.classList.remove('revealed');
        }
    });

    if (isFinal) {
        widget.classList.add('complete');
        if (label) label.innerText = '王香禪・完整 (9/9)';
    } else {
        widget.classList.remove('complete');
        if (label) label.innerText = `尋找「她」 ${unlockedCount} / 9`;
    }
}

function togglePortraitZoom() {
    const widget = document.getElementById('portrait-progress-widget');
    if (!widget) return;
    playSFX('sfx-click');
    widget.classList.toggle('zoomed');
}