// 1. Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyAUqdwyh41YXt7QG-RROpAtg8VUSTUn82g",
    authDomain: "syon-chat.firebaseapp.com",
    databaseURL: "https://syon-chat-default-rtdb.firebaseio.com",
    projectId: "syon-chat",
    storageBucket: "syon-chat.firebasestorage.app",
    messagingSenderId: "615076695575",
    appId: "1:615076695575:web:973188c3e602af5d265652"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const messagesRef = database.ref("messages");

let currentNickname = localStorage.getItem("chat_nickname") || "";
let currentPassword = localStorage.getItem("chat_password") || "";
let currentTheme = localStorage.getItem("chat_theme") || "purple";

// 닉네임 + 비밀번호 기반의 고유 식별 키 생성 (기기 독립적)
function getUserKey(nick, pass) {
    if (!nick || !pass) return "";
    return btoa(encodeURIComponent(nick.trim() + "___" + pass.trim()));
}

window.onload = function() {
    applyTheme(currentTheme);
    const themeSelect = document.getElementById("theme-select");
    if (themeSelect) themeSelect.value = currentTheme;

    if (!currentNickname || !currentPassword) {
        openNickModal(false);
    } else {
        updateNicknameDisplays(currentNickname);
    }

    listenForMessages();
    setupDragAndDrop();
};

// 2. 실시간 메시지 수신 / 삭제 / 수정 동기화
function listenForMessages() {
    const chatMessages = document.getElementById("chat-messages");

    // 메시지 추가 수신
    messagesRef.on("child_added", (snapshot) => {
        const msgId = snapshot.key;
        const data = snapshot.val();
        renderMessage(msgId, data);
    });

    // 메시지 수정 동기화
    messagesRef.on("child_changed", (snapshot) => {
        const msgId = snapshot.key;
        const data = snapshot.val();
        const existingEl = document.getElementById(`msg-${msgId}`);
        if (existingEl) {
            // 기존 요소 위치에 새로 렌더링하여 교체
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = getMessageHtml(msgId, data);
            existingEl.replaceWith(tempDiv.firstElementChild);
            refreshGeminiActions();
        }
    });

    // 메시지 삭제 동기화
    messagesRef.on("child_removed", (snapshot) => {
        const msgId = snapshot.key;
        const el = document.getElementById(`msg-${msgId}`);
        if (el) {
            el.remove();
        }
        refreshGeminiActions();
    });
}

// 메시지 HTML 생성 및 렌더링 헬퍼 함수
function getMessageHtml(msgId, data) {
    const myUserKey = getUserKey(currentNickname, currentPassword);
    const isMyMsg = data.userKey ? (data.userKey === myUserKey) : (data.nickname === currentNickname);

    let messageBodyHtml = "";
    if (data.type === "image") {
        messageBodyHtml = `<img src="${data.message}" class="chat-image" onclick="window.open(this.src)" alt="첨부 이미지">`;
    } else {
        messageBodyHtml = `<div class="bubble">${escapeHtml(data.message)}${data.isEdited ? ' <span class="edited-tag">(수정됨)</span>' : ''}</div>`;
    }

    // 본인 메시지일 경우 수정 및 삭제 버튼 제공 (이미지는 삭제만 가능)
    let actionBtnsHtml = '';
    if (isMyMsg) {
        const editBtn = data.type === 'text' ? `<button class="action-btn" onclick="enableEditMode('${msgId}', \`${escapeForAttr(data.message)}\`)" title="수정">✏️</button>` : '';
        const deleteBtn = `<button class="action-btn" onclick="deleteMessage('${msgId}')" title="삭제">🗑️</button>`;
        actionBtnsHtml = `<div class="msg-actions-owner">${editBtn}${deleteBtn}</div>`;
    }

    return `
        <div class="message-group ${isMyMsg ? 'my' : 'other'}" id="msg-${msgId}">
            ${!isMyMsg ? `<div class="sender-name">${escapeHtml(data.nickname)}</div>` : ''}
            <div class="message-content">
                ${isMyMsg ? actionBtnsHtml : ''}
                ${isMyMsg ? `<span class="time">${data.time}</span>` : ''}
                <div class="bubble-container" id="bubble-container-${msgId}">
                    ${messageBodyHtml}
                </div>
                ${!isMyMsg ? `<span class="time">${data.time}</span>` : ''}
                ${!isMyMsg ? actionBtnsHtml : ''}
            </div>
        </div>
    `;
}

function renderMessage(msgId, data) {
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.insertAdjacentHTML("beforeend", getMessageHtml(msgId, data));
    chatMessages.scrollTop = chatMessages.scrollHeight;
    refreshGeminiActions();
}

// 3. 텍스트 메시지 전송
function sendMessage() {
    const input = document.getElementById("message-input");
    const msg = input.value.trim();
    if (!msg) return;

    if (!currentNickname || !currentPassword) {
        alert("닉네임과 비밀번호를 먼저 설정해 주세요!");
        openNickModal(false);
        return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const myUserKey = getUserKey(currentNickname, currentPassword);

    messagesRef.push({
        nickname: currentNickname,
        userKey: myUserKey,
        message: msg,
        type: "text",
        time: timeStr,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    input.value = "";
}

// 4. 이미지 전송 로직
function processAndSendImage(file) {
    if (!file || !file.type.startsWith("image/")) {
        alert("이미지 파일만 업로드할 수 있습니다!");
        return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
        alert("이미지 용량이 너무 큽니다. (1.5MB 이하 가능)");
        return;
    }

    if (!currentNickname || !currentPassword) {
        alert("닉네임과 비밀번호를 먼저 설정해 주세요!");
        openNickModal(false);
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const myUserKey = getUserKey(currentNickname, currentPassword);

        messagesRef.push({
            nickname: currentNickname,
            userKey: myUserKey,
            message: base64Image,
            type: "image",
            time: timeStr,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    };
    reader.readAsDataURL(file);
}

// 5. ✏️ 메시지 수정 화면 전환
function enableEditMode(msgId, currentText) {
    const container = document.getElementById(`bubble-container-${msgId}`);
    if (!container) return;

    container.innerHTML = `
        <div class="edit-wrapper">
            <input type="text" id="edit-input-${msgId}" class="edit-input" value="${escapeHtml(currentText)}">
            <div class="edit-btns">
                <button class="edit-save-btn" onclick="saveEdit('${msgId}')">저장</button>
                <button class="edit-cancel-btn" onclick="cancelEdit('${msgId}', \`${escapeForAttr(currentText)}\`)">취소</button>
            </div>
        </div>
    `;
    document.getElementById(`edit-input-${msgId}`).focus();
}

// ✏️ 수정 내용 Firebase에 저장
function saveEdit(msgId) {
    const input = document.getElementById(`edit-input-${msgId}`);
    if (!input) return;
    const newMsg = input.value.trim();

    if (!newMsg) {
        alert("내용을 입력해주세요.");
        return;
    }

    messagesRef.child(msgId).update({
        message: newMsg,
        isEdited: true
    }).catch((err) => {
        alert("수정 실패: " + err.message);
    });
}

// ✏️ 수정 취소
function cancelEdit(msgId, originalText) {
    const container = document.getElementById(`bubble-container-${msgId}`);
    if (container) {
        container.innerHTML = `<div class="bubble">${escapeHtml(originalText)}</div>`;
    }
}

// 6. 🗑️ 메시지 삭제
function deleteMessage(msgId) {
    if (confirm("이 메시지를 삭제하시겠습니까?")) {
        messagesRef.child(msgId).remove()
            .catch((error) => {
                alert("삭제 실패: " + error.message);
            });
    }
}

// Gemini 반응 버튼 갱신
function refreshGeminiActions() {
    const chatMessages = document.getElementById("chat-messages");
    document.querySelectorAll(".gemini-actions").forEach(el => el.remove());
    const allOtherMessages = chatMessages.querySelectorAll(".message-group.other");
    if (allOtherMessages.length > 0) {
        const lastOtherMsg = allOtherMessages[allOtherMessages.length - 1];
        
        const geminiActionsHtml = `
            <div class="gemini-actions">
                <button title="좋아요"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg></button>
                <button title="싫어요"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg></button>
                <button title="새로고침"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 17.72C6.25 16.27 6 14.7 6 13c0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.28c.45 1.45.7 3.02.7 4.72 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg></button>
                <button title="복사"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button>
            </div>
        `;
        lastOtherMsg.insertAdjacentHTML("beforeend", geminiActionsHtml);
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    processAndSendImage(file);
    event.target.value = "";
}

function setupDragAndDrop() {
    const container = document.querySelector(".chat-container");

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        container.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        container.addEventListener(eventName, () => container.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        container.addEventListener(eventName, () => container.classList.remove('drag-over'), false);
    });

    container.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files && files.length > 0) {
            processAndSendImage(files[0]);
        }
    }, false);
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeForAttr(text) {
    return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

function changeTheme(themeName) {
    currentTheme = themeName;
    localStorage.setItem("chat_theme", themeName);
    applyTheme(themeName);
}

function applyTheme(themeName) {
    document.body.classList.remove("theme-gemini", "theme-excel", "theme-purple");
    if (themeName !== "purple") {
        document.body.classList.add("theme-" + themeName);
    }
}

function openNickModal(isChange = true) {
    const modal = document.getElementById("nick-modal");
    const inputNick = document.getElementById("modal-nick-input");
    const inputPass = document.getElementById("modal-pass-input");

    inputNick.value = currentNickname;
    inputPass.value = currentPassword;
    modal.style.display = "flex";
}

function saveNickname() {
    const inputNick = document.getElementById("modal-nick-input").value.trim();
    const inputPass = document.getElementById("modal-pass-input").value.trim();

    if (!inputNick || !inputPass) {
        alert("닉네임과 비밀번호를 모두 입력해 주세요!");
        return;
    }

    currentNickname = inputNick;
    currentPassword = inputPass;

    localStorage.setItem("chat_nickname", currentNickname);
    localStorage.setItem("chat_password", currentPassword);

    updateNicknameDisplays(currentNickname);
    document.getElementById("nick-modal").style.display = "none";

    document.getElementById("chat-messages").innerHTML = `
        <div class="message-system">
            <span>👋 방에 입장하셨습니다! 자유롭게 수다를 나눠보세요.</span>
        </div>
    `;
    messagesRef.off();
    listenForMessages();
}

function updateNicknameDisplays(nick) {
    document.getElementById("current-nickname-display").innerText = nick;
    const sidebarNick = document.getElementById("sidebar-nickname");
    if (sidebarNick) sidebarNick.innerText = nick;
}