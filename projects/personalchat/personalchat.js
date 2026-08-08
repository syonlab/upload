// ==========================================
// 🔥 1. Firebase 설정 및 초기화
// ==========================================
  const firebaseConfig = {
    apiKey: "AIzaSyB-pvPHmwt7Xj-nztAp7BaZVwDQAx7lq2A",
    authDomain: "personalchat-syon.firebaseapp.com",
    databaseURL: "https://personalchat-syon-default-rtdb.firebaseio.com",
    projectId: "personalchat-syon",
    storageBucket: "personalchat-syon.firebasestorage.app",
    messagingSenderId: "386584559570",
    appId: "1:386584559570:web:70e863b5c92109e818120b"
  };
// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ==========================================
// 2. 상태 및 전역 데이터 변수
// ==========================================
let myNickname = localStorage.getItem('pc_nickname') || '익명' + Math.floor(Math.random() * 1000);
let currentRoom = null;
let currentSelectedImage = null;
let activeMessageListener = null; // 실시간 메시지 수신 해제용

// ==========================================
// 3. 초기화 및 로드 Event
// ==========================================
window.onload = function() {
    updateNicknameUI();
    listenToRooms(); // 🔥 Firebase에서 실시간 방 목록 수신
};

function updateNicknameUI() {
    document.getElementById('header-nickname').innerText = myNickname;
    const sidebarUser = document.querySelector('.sidebar-username');
    if (sidebarUser) sidebarUser.innerText = myNickname;
}

// ==========================================
// 4. 🔥 Firebase 실시간 방 생성 & 수신
// ==========================================
function listenToRooms() {
    const roomsRef = db.ref('rooms');
    roomsRef.on('value', (snapshot) => {
        const roomsData = snapshot.val();
        const listEl = document.getElementById('room-list');
        listEl.innerHTML = '';

        if (!roomsData) {
            listEl.innerHTML = '<p style="color:#999; grid-column: 1/-1; text-align:center;">생성된 비밀 방이 없습니다. 새로 만들어보세요!</p>';
            return;
        }

        Object.keys(roomsData).forEach(roomId => {
            const room = roomsData[roomId];
            const card = document.createElement('div');
            card.className = 'room-card';
            card.onclick = () => openPassModal(room);
            card.innerHTML = `
                <h4>🔒 ${room.title}</h4>
                <p>클릭하여 비밀번호(코드) 입력 후 입장</p>
            `;
            listEl.appendChild(card);
        });
    });
}

function createRoom() {
    const titleInput = document.getElementById('new-room-title');
    const passInput = document.getElementById('new-room-pass');

    const title = titleInput.value.trim();
    const code = passInput.value.trim();

    if (!title || !code) {
        alert("방 이름과 생성 코드를 모두 입력해주세요!");
        return;
    }

    const roomId = 'room_' + Date.now();
    const newRoom = {
        id: roomId,
        title: title,
        code: code
    };

    // Firebase DB의 'rooms/방ID' 경로에 저장
    db.ref('rooms/' + roomId).set(newRoom, (error) => {
        if (error) {
            alert("방 생성 실패: " + error.message);
        } else {
            titleInput.value = '';
            passInput.value = '';
            alert(`'${title}' 방이 생성되었습니다! 방 코드 [${code}]를 상대방에게 공유하세요.`);
        }
    });
}

// ==========================================
// 5. 비밀번호 입력 & 입장 검증
// ==========================================
let selectedRoomForEnter = null;

function openPassModal(room) {
    selectedRoomForEnter = room;
    document.getElementById('modal-room-title').innerText = `🔒 '${room.title}' 입장`;
    document.getElementById('input-room-pass').value = '';
    document.getElementById('pass-modal').style.display = 'flex';
}

function closePassModal() {
    document.getElementById('pass-modal').style.display = 'none';
    selectedRoomForEnter = null;
}

function verifyAndEnterRoom() {
    const inputCode = document.getElementById('input-room-pass').value.trim();

    if (inputCode === selectedRoomForEnter.code) {
        currentRoom = selectedRoomForEnter;
        closePassModal();

        // 화면 전환
        document.getElementById('home-screen').style.display = 'none';
        document.getElementById('chat-screen').style.display = 'flex';

        // 헤더 및 사이드바 반영
        document.getElementById('current-room-title').innerText = currentRoom.title;
        document.getElementById('room-code-badge').innerText = `🔒 코드: ${currentRoom.code}`;
        const sidebarTitle = document.getElementById('sidebar-room-title');
        if (sidebarTitle) sidebarTitle.innerText = currentRoom.title;

        // 🔥 해당 방의 메시지 실시간 수신 시작
        listenToMessages(currentRoom.id);
    } else {
        alert("방 코드가 일치하지 않습니다! 다시 확인해주세요.");
    }
}

function leaveRoom() {
    // 기존 리스너 해제
    if (activeMessageListener && currentRoom) {
        db.ref('messages/' + currentRoom.id).off('value', activeMessageListener);
    }
    
    currentRoom = null;
    document.getElementById('chat-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'block';
}

// ==========================================
// 6. 🔥 Firebase 실시간 메시지 보냄 & 읽기
// ==========================================
function listenToMessages(roomId) {
    const messagesRef = db.ref('messages/' + roomId);
    
    // 이전 리스너 제거
    messagesRef.off();

    // 메시지가 추가되거나 변경될 때마다 자동 실행되는 실시간 이벤트
    activeMessageListener = messagesRef.on('value', (snapshot) => {
        const messagesData = snapshot.val();
        renderMessages(messagesData);
    });
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();

    if ((!text && !currentSelectedImage) || !currentRoom) return;

    const msgId = 'msg_' + Date.now();
    const newMsg = {
        id: msgId,
        sender: myNickname,
        text: text,
        image: currentSelectedImage || null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Firebase DB 'messages/방ID/메시지ID' 위치에 보냄
    db.ref(`messages/${currentRoom.id}/${msgId}`).set(newMsg, (error) => {
        if (error) {
            alert("전송 실패: " + error.message);
        } else {
            input.value = '';
            cancelImageUpload();
        }
    });
}

function renderMessages(messagesData) {
    const chatBox = document.getElementById('chat-messages');
    chatBox.innerHTML = '';

    if (!messagesData) return;

    Object.keys(messagesData).forEach(msgId => {
        const msg = messagesData[msgId];
        const isMy = (msg.sender === myNickname);
        const msgGroup = document.createElement('div');
        msgGroup.className = `message-group ${isMy ? 'my' : 'other'}`;

        let imgHtml = msg.image ? `<img src="${msg.image}" class="chat-image" alt="첨부 이미지">` : '';
        let textHtml = msg.text ? `<div class="bubble">${msg.text}</div>` : '';

        let actionsHtml = isMy ? `
            <div class="msg-actions">
                <button class="msg-btn" onclick="editMessage('${msg.id}')">수정</button>
                <button class="msg-btn" onclick="deleteMessage('${msg.id}')">삭제</button>
            </div>
        ` : '';

        msgGroup.innerHTML = `
            <div class="sender-name">${msg.sender} (${msg.time})</div>
            ${textHtml}
            ${imgHtml}
            ${actionsHtml}
        `;

        chatBox.appendChild(msgGroup);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
}

// 메시지 수정 (Firebase DB 업데이트)
function editMessage(msgId) {
    const newText = prompt("메시지를 수정하세요:");
    if (newText !== null && currentRoom) {
        db.ref(`messages/${currentRoom.id}/${msgId}/text`).set(newText.trim());
    }
}

// 메시지 삭제 (Firebase DB 삭제)
function deleteMessage(msgId) {
    if (confirm("정말 이 메시지를 삭제하시겠습니까?") && currentRoom) {
        db.ref(`messages/${currentRoom.id}/${msgId}`).remove();
    }
}

// ==========================================
// 7. 이미지 업로드 관련
// ==========================================
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 이미지 용량 제한 (500KB 이하 권장)
    if (file.size > 500 * 1024) {
        alert("실시간 DB 연결 환경에서는 500KB 이하의 이미지만 전송 가능합니다.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        currentSelectedImage = e.target.result;
        document.getElementById('preview-img').src = currentSelectedImage;
        document.getElementById('image-preview-bar').style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

function cancelImageUpload() {
    currentSelectedImage = null;
    document.getElementById('file-input').value = '';
    document.getElementById('image-preview-bar').style.display = 'none';
}

// ==========================================
// 8. 테마 변경 및 사이드바 토글
// ==========================================
function changeTheme(themeName) {
    document.body.className = `theme-${themeName}`;
}

function toggleGeminiSidebar() {
    const sidebar = document.getElementById('gemini-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// ==========================================
// 9. 닉네임 설정 모달
// ==========================================
function openNicknameModal() {
    document.getElementById('input-nickname').value = myNickname;
    document.getElementById('nickname-modal').style.display = 'flex';
}

function closeNicknameModal() {
    document.getElementById('nickname-modal').style.display = 'none';
}

function saveNickname() {
    const newNick = document.getElementById('input-nickname').value.trim();
    if (newNick) {
        myNickname = newNick;
        localStorage.setItem('pc_nickname', myNickname);
        updateNicknameUI();
        closeNicknameModal();
    }
}