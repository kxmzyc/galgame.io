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
 * - nodes: 所有剧情节点的集合，每个节点包含：
 *   - id: 节点唯一标识
 *   - bg: 背景类型（当前版本仅支持 library）
 *   - char: 角色标识（sakura=小樱, none=无角色）
 *   - name: 角色名称（显示在对话框顶部）
 *   - text: 对话文本内容（支持 \n 换行）
 *   - choices: 选项数组，每个选项包含：
 *     - text: 选项文本
 *     - goto: 选择后跳转到的节点ID
 * - startNode: 游戏开始的节点ID
 */
const gameScript = {
    "nodes": {
        "start": {
            "id": "start",
            "bg": "library",
            "char": "sakura",
            "name": "小樱",
            "text": "（翻开一本泛黄笔记）'这是……是谁的笔记呢？'\n你在图书馆的角落里发现了一本泛黄的笔记本，笔记本里夹着一张泛旧的照片。",
            "choices": [
                {"text": "翻开笔记本看看", "goto": "open_note"},
                {"text": "把它放回去，不想多管闲事", "goto": "leave_it"}
            ]
        },
        "open_note": {
            "id": "open_note",
            "bg": "library",
            "char": "sakura",
            "name": "小樱",
            "text": "笔记本里有一段署名为'小樱'的日记，字里行间像是在诉说着一个未完成的故事。你轻声读出一段话，图书馆的空气突然有了点不同。",
            "choices": [
                {"text": "继续读出声", "goto": "time_rift"},
                {"text": "收起笔记本，感觉不妙", "goto": "leave_it"}
            ]
        },
        "leave_it": {
            "id": "leave_it",
            "bg": "library",
            "char": "none",
            "name": "",
            "text": "你决定把笔记本放回原处，匆匆离开。也许有些事不该随意打扰。",
            "choices": [
                {"text": "结束游戏（结局A）", "goto": "ending_calm"}
            ]
        },
        "time_rift": {
            "id": "time_rift",
            "bg": "library",
            "char": "sakura",
            "name": "小樱",
            "text": "空气像被轻轻拨动，记忆的碎片在你眼前浮现。一个温柔的声音在你耳畔响起：'谢谢你……'",
            "choices": [
                {"text": "回应她的声音", "goto": "respond"},
                {"text": "逃离这里", "goto": "leave_it"}
            ]
        },
        "respond": {
            "id": "respond",
            "bg": "library",
            "char": "sakura",
            "name": "小樱",
            "text": "你鼓起勇气回应，声音像穿越了时间。小樱的眼神变得柔和，你决定帮助她寻找未完成的心愿。",
            "choices": [
                {"text": "接受帮助请求（结局B：开始委托）", "goto": "ending_help"},
                {"text": "犹豫", "goto": "ending_uncertain"}
            ]
        },
        "ending_calm": {
            "id": "ending_calm",
            "bg": "library",
            "char": "none",
            "name": "",
            "text": "你选择了回避，生活如常，但心里总留下一点余温。——平静的结局。",
            "choices": []
        },
        "ending_help": {
            "id": "ending_help",
            "bg": "library",
            "char": "sakura",
            "name": "小樱",
            "text": "你答应了她，小樱轻轻一笑，画面渐变为明亮的暖光，故事似乎才刚刚开始。——好结局（DEMO 结束）。",
            "choices": []
        },
        "ending_uncertain": {
            "id": "ending_uncertain",
            "bg": "library",
            "char": "sakura",
            "name": "小樱",
            "text": "你犹豫了，但仍保持着联系。未来未定，却有一束微光。——开放结局（DEMO 结束）。",
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
 * 更新角色立绘显示
 * @param {string} charId - 角色标识（sakura=小樱, none=无角色）
 * 
 * 功能：
 * 1. 根据角色ID决定在哪个位置显示立绘
 * 2. 使用 SVG 创建占位立绘（实际项目中可替换为真实图片）
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
    
    // 如果没有角色，直接返回
    if (charId === 'none' || !charId) {
        return;
    }
    
    // 根据角色ID创建对应的 SVG 立绘
    let svgContent = '';
    if (charId === 'sakura') {
        // 创建小樱的 SVG 占位立绘（简单的女性角色轮廓）
        svgContent = `
            <svg viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
                <!-- 身体 -->
                <ellipse cx="100" cy="280" rx="50" ry="80" fill="#f4c2a1" />
                <!-- 头部 -->
                <circle cx="100" cy="120" r="60" fill="#f4c2a1" />
                <!-- 头发 -->
                <path d="M 40 120 Q 40 60, 100 60 Q 160 60, 160 120 Q 160 140, 140 150 L 60 150 Q 40 140, 40 120" fill="#8b4513" />
                <!-- 眼睛 -->
                <circle cx="85" cy="110" r="5" fill="#333" />
                <circle cx="115" cy="110" r="5" fill="#333" />
                <!-- 嘴巴 -->
                <path d="M 90 130 Q 100 135, 110 130" stroke="#333" stroke-width="2" fill="none" />
                <!-- 衣服（校服样式） -->
                <rect x="60" y="200" width="80" height="100" fill="#4a90e2" rx="5" />
                <path d="M 60 200 L 100 220 L 140 200" stroke="#2c5aa0" stroke-width="2" fill="none" />
            </svg>
        `;
    }
    
    // 在中间位置显示角色（可以根据需要调整位置）
    elements.characterCenter.innerHTML = svgContent;
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
 * 2. 章节信息固定为"第 1 / 1 章"（当前只有一个章节）
 */
function updateProgress() {
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

