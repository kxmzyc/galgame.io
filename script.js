    /* 
 * script.js - Galgame Demo 游戏逻辑脚本
 * 功能：管理游戏状态、剧本数据、逐字显示效果、选项处理和分支跳转
 */

// ==================== 游戏状态管理 ====================

/**
 * 游戏状态对象
 * - currentNodeId: 当前正在显示的节点ID
 * - segmentCount: 当前章节已显示的段落数（用于进度显示）
 * - isTyping: 是否正在逐字显示文本
 * - typingTimer: 逐字显示的定时器ID
 */
const gameState = {
    currentNodeId: null,
    segmentCount: 0,
    isTyping: false,
    typingTimer: null
};

// ==================== 内置剧本数据 ====================

/**
 * 游戏剧本 JSON 数据
 * 结构说明：
 * - chapter: 章节名称
 * - nodes: 所有剧情节点的集合，每个节点包含：
 *   - id: 节点唯一标识
 *   - bg: 背景类型（library_modern=现代图书馆, old_school=旧学校, campus_modern=现代校园）
 *   - char: 角色标识（protagonist=主角, liuxue=柳雪, none=无角色）
 *   - name: 角色名称（显示在对话框顶部）
 *   - text: 对话文本内容（支持 \n 换行）
 *   - choices: 选项数组，每个选项包含：
 *     - text: 选项文本
 *     - goto: 选择后跳转到的节点ID
 * - startNode: 游戏开始的节点ID
 */
const gameScript = {
    "chapter": "Chapter 1 - 图书馆的日记与时空穿梭",
    "nodes": {
        "start": {
            "id": "start",
            "bg": "library_modern",
            "char": "protagonist",
            "name": "你",
            "text": "在图书馆整理古老文献时，你无意间发现一本泛黄的日记。翻开它，纸张中透出微弱的光芒。",
            "choices": [
                {"text": "仔细阅读日记", "goto": "before_travel"},
                {"text": "放回书架，离开图书馆", "goto": "ending_normal"}
            ]
        },
        "before_travel": {
            "id": "before_travel",
            "bg": "transition",
            "char": "protagonist",
            "name": "你",
            "text": "你翻开日记，光芒越来越强烈...",
            "choices": []
        },
        "first_travel": {
            "id": "first_travel",
            "bg": "old_school",
            "char": "liuxue",
            "name": "柳雪",
            "text": "光芒一闪，你被卷入五十年前的校园——师专。眼前是古老的教学楼和操场，一个神秘的女生柳雪向你走来，似乎认出了你。",
            "choices": [
                {"text": "和柳雪打招呼", "goto": "interaction_liuxue"},
                {"text": "先观察周围环境", "goto": "interaction_liuxue"}
            ]
        },
        "interaction_liuxue": {
            "id": "interaction_liuxue",
            "bg": "old_school",
            "char": "liuxue",
            "name": "柳雪",
            "text": "柳雪对现代世界充满好奇，她说：'你是从未来来的吗？'你解释了自己的穿越能力，她开始相信你，并暗示未来会一起探索时空秘密。",
            "choices": [
                {"text": "尝试回到现代", "goto": "time_experiment"},
                {"text": "留在师专继续观察", "goto": "time_experiment"}
            ]
        },
        "time_experiment": {
            "id": "time_experiment",
            "bg": "library_modern",
            "char": "protagonist",
            "name": "你",
            "text": "你和柳雪开始实验时空穿梭，在现代学校和五十年前的师专间来回。你们发现自己的行动可能影响学校历史，柳雪表示依赖和信任。",
            "choices": [
                {"text": "结束实验并返回现代", "goto": "ending_open"},
                {"text": "继续探索未知事件", "goto": "ending_open"}
            ]
        },
        "ending_normal": {
            "id": "ending_normal",
            "bg": "library_modern",
            "char": "protagonist",
            "name": "你",
            "text": "你选择忽略日记，生活如常，但心中总留下一丝疑问。——平静结局",
            "choices": []
        },
        "ending_open": {
            "id": "ending_open",
            "bg": "campus_modern",
            "char": "liuxue",
            "name": "柳雪",
            "text": "回到现代校园，你和柳雪在操场上告别。你们都意识到，这段奇异的时光旅行才刚刚开始。——开放结局",
            "choices": []
        }
    },
    "startNode": "start"
};

// ==================== DOM 元素引用 ====================

// 获取页面中的关键 DOM 元素，便于后续操作
const elements = {
    dialogText: document.getElementById('dialog-text'),
    characterName: document.getElementById('character-name'),
    choicesContainer: document.getElementById('choices-container'),
    continueBtn: document.getElementById('continue-btn'),
    characterLeft: document.getElementById('character-left'),
    characterCenter: document.getElementById('character-center'),
    characterRight: document.getElementById('character-right'),
    progressInfo: document.getElementById('progress-info'),
    segmentInfo: document.getElementById('segment-info')
};

// ==================== 核心功能函数 ====================

/**
 * 显示指定的剧情节点
 * @param {string} nodeId - 要显示的节点ID
 * 
 * 功能：
 * 1. 从剧本中获取节点数据
 * 2. 更新角色立绘显示
 * 3. 更新角色名称和对话文本（使用逐字显示）
 * 4. 渲染选项按钮或继续按钮
 * 5. 更新进度信息
 * 6. 在控制台打印当前节点信息（用于调试）
 */
function showNode(nodeId) {
    // 获取节点数据
    const node = gameScript.nodes[nodeId];
    if (!node) {
        console.error('节点不存在:', nodeId);
        return;
    }
    
    // 更新游戏状态
    gameState.currentNodeId = nodeId;
    gameState.segmentCount++;
    
    // 在控制台打印当前节点信息（调试用）
    console.log('当前节点:', nodeId);
    console.log('节点数据:', node);
    console.log('当前进度: 第', gameState.segmentCount, '段');
    
    // 更新背景
    updateBackground(node.bg);
    
    // 更新角色立绘
    updateCharacter(node.char);
    
    // 更新角色名称
    elements.characterName.textContent = node.name || '';
    
    // 清空选项容器
    elements.choicesContainer.innerHTML = '';
    
    // 如果有选项，显示选项按钮；否则显示继续按钮
    if (node.choices && node.choices.length > 0) {
        elements.continueBtn.style.display = 'none';
        renderChoices(node.choices);
    } else {
        elements.continueBtn.style.display = 'block';
        // 如果是结局节点，继续按钮显示"重新开始"
        if (nodeId.startsWith('ending')) {
            elements.continueBtn.textContent = '重新开始';
            // 设置重新开始事件（直接使用 onclick 属性，每次都会覆盖）
            elements.continueBtn.onclick = () => {
                gameState.segmentCount = 0;
                showNode(gameScript.startNode);
            };
        } else if (nodeId === 'before_travel') {
            // 过渡节点：显示后自动触发闪白特效并跳转到first_travel
            elements.continueBtn.textContent = '继续';
            elements.continueBtn.onclick = () => {
                // 先触发闪白特效
                flashWhite();
                // 在闪白最亮时（约200ms后）跳转到first_travel节点
                // showNode会自动更新背景为p2和显示女主立绘
                setTimeout(() => {
                    showNode('first_travel');
                }, 200);
            };
        } else {
            // 非结局节点但没有选项的情况（理论上不应该出现，但为了健壮性保留）
            elements.continueBtn.textContent = '继续';
            elements.continueBtn.style.display = 'none';
        }
    }
    
    // 使用逐字显示效果显示对话文本
    typeText(node.text);
    
    // 更新进度信息
    updateProgress();
}

/**
 * 更新背景显示
 * @param {string} bgId - 背景标识（library_modern=现代图书馆, old_school=旧学校/师专使用p2, campus_modern=现代校园, transition=过渡背景p3）
 * 
 * 功能：
 * 1. 根据背景ID切换不同的背景样式
 * 2. 使用CSS类来应用不同的背景效果
 */
function updateBackground(bgId) {
    const background = document.getElementById('background');
    
    // 移除所有背景类
    background.className = '';
    
    // 根据背景ID添加对应的类
    switch(bgId) {
        case 'library_modern':
            background.className = 'bg-library-modern';
            break;
        case 'old_school':
            background.className = 'bg-old-school';
            break;
        case 'campus_modern':
            background.className = 'bg-campus-modern';
            break;
        case 'transition':
            background.className = 'bg-transition';
            break;
        default:
            background.className = 'bg-library-modern';
    }
}

/**
 * 闪白特效函数
 * 功能：在屏幕中央显示白色闪光，模拟穿越效果
 */
function flashWhite() {
    // 创建闪白层
    const flashLayer = document.createElement('div');
    flashLayer.id = 'flash-white';
    flashLayer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0);
        z-index: 1000;
        pointer-events: none;
        transition: background 0.3s ease-in-out;
    `;
    document.body.appendChild(flashLayer);
    
    // 触发闪白动画
    setTimeout(() => {
        flashLayer.style.background = 'rgba(255, 255, 255, 0.8)';
    }, 10);
    
    // 淡出并移除
    setTimeout(() => {
        flashLayer.style.background = 'rgba(255, 255, 255, 0)';
        setTimeout(() => {
            if (flashLayer.parentNode) {
                flashLayer.parentNode.removeChild(flashLayer);
            }
        }, 300);
    }, 400);
}

/**
 * 更新角色立绘显示
 * @param {string} charId - 角色标识（protagonist=主角不显示立绘, liuxue=柳雪, none=无角色）
 * 
 * 功能：
 * 1. 根据角色ID决定在哪个位置显示立绘
 * 2. 主角不显示立绘，柳雪（女主）使用 p1.jpg 真实图片
 * 3. 添加淡入淡出动画效果
 */
function updateCharacter(charId) {
    // 先隐藏所有角色槽
    elements.characterLeft.classList.remove('active');
    elements.characterCenter.classList.remove('active');
    elements.characterRight.classList.remove('active');
    elements.characterLeft.innerHTML = '';
    elements.characterCenter.innerHTML = '';
    elements.characterRight.innerHTML = '';
    
    // 如果没有角色或是主角（不显示主角立绘），直接返回
    if (charId === 'none' || !charId || charId === 'protagonist') {
        return;
    }
    
    // 根据角色ID创建对应的立绘
    let characterContent = '';
    if (charId === 'liuxue') {
        // 使用 p1.jpg 作为柳雪（女主）的立绘
        characterContent = `<img src="p1.jpg" alt="柳雪" style="width: 100%; height: 100%; object-fit: contain; object-position: bottom;" />`;
    }
    
    // 在中间位置显示角色（可以根据需要调整位置）
    elements.characterCenter.innerHTML = characterContent;
    // 延迟一点时间后添加 active 类，触发淡入动画
    setTimeout(() => {
        elements.characterCenter.classList.add('active');
    }, 50);
}

/**
 * 逐字显示文本效果（打字机效果）
 * @param {string} text - 要显示的完整文本
 * 
 * 功能：
 * 1. 逐字符显示文本，模拟打字效果
 * 2. 支持跳过：如果正在显示，点击可以立即显示完整文本
 * 3. 使用定时器控制显示速度
 */
function typeText(text) {
    // 如果正在显示文本，先清除之前的定时器
    if (gameState.isTyping) {
        clearInterval(gameState.typingTimer);
    }
    
    // 清空文本区域
    elements.dialogText.textContent = '';
    gameState.isTyping = true;
    
    let currentIndex = 0;
    const typingSpeed = 30; // 每个字符显示的间隔（毫秒）
    
    // 创建定时器，每隔一定时间显示一个字符
    gameState.typingTimer = setInterval(() => {
        if (currentIndex < text.length) {
            // 显示到当前位置的文本
            elements.dialogText.textContent = text.substring(0, currentIndex + 1);
            currentIndex++;
        } else {
            // 文本显示完成，清除定时器
            clearInterval(gameState.typingTimer);
            gameState.isTyping = false;
        }
    }, typingSpeed);
    
    // 点击对话框可以跳过逐字显示，立即显示完整文本
    const skipTyping = () => {
        if (gameState.isTyping) {
            clearInterval(gameState.typingTimer);
            elements.dialogText.textContent = text;
            gameState.isTyping = false;
            elements.dialogText.removeEventListener('click', skipTyping);
        }
    };
    
    elements.dialogText.addEventListener('click', skipTyping);
}

/**
 * 渲染选项按钮
 * @param {Array} choices - 选项数组，每个选项包含 text 和 goto
 * 
 * 功能：
 * 1. 根据选项数据创建按钮元素
 * 2. 为每个按钮绑定点击事件，点击后跳转到对应节点
 * 3. 将按钮添加到选项容器中
 */
function renderChoices(choices) {
    // 清空选项容器
    elements.choicesContainer.innerHTML = '';
    
    // 遍历选项数组，为每个选项创建按钮
    choices.forEach((choice, index) => {
        // 创建按钮元素
        const button = document.createElement('button');
        button.className = 'choice-button';
        button.textContent = choice.text;
        
        // 绑定点击事件：点击后跳转到对应节点
        button.addEventListener('click', () => {
            // 在控制台打印选择信息（调试用）
            console.log('选择:', choice.text, '-> 跳转到:', choice.goto);
            // 显示目标节点
            showNode(choice.goto);
        });
        
        // 将按钮添加到容器中
        elements.choicesContainer.appendChild(button);
    });
}

/**
 * 更新进度信息显示
 * 
 * 功能：
 * 1. 更新段落计数显示
 * 2. 显示章节名称
 */
function updateProgress() {
    const chapterInfo = document.getElementById('chapter-info');
    if (chapterInfo && gameScript.chapter) {
        chapterInfo.textContent = gameScript.chapter;
    }
    elements.segmentInfo.textContent = `第 ${gameState.segmentCount} 段`;
}

// ==================== 初始化游戏 ====================

/**
 * 游戏初始化函数
 * 
 * 功能：
 * 1. 绑定继续按钮的点击事件
 * 2. 显示游戏开始节点
 * 3. 在控制台打印初始化信息
 */
function initGame() {
    // 绑定继续按钮的点击事件（仅在无选项时使用）
    elements.continueBtn.addEventListener('click', () => {
        // 继续按钮的逻辑在 showNode 函数中根据节点类型动态设置
        // 这里只处理默认情况（不应该到达这里）
        console.log('继续按钮被点击，但当前节点应该有选项或已结束');
    });
    
    // 显示游戏开始节点
    console.log('游戏初始化完成');
    console.log('开始节点:', gameScript.startNode);
    showNode(gameScript.startNode);
}

// ==================== 页面加载完成后启动游戏 ====================

// 当页面完全加载后，初始化游戏
window.addEventListener('DOMContentLoaded', initGame);

