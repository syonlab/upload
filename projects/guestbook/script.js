// 페이지가 로드되면 기존 저장된 방명록 불러오기
document.addEventListener("DOMContentLoaded", loadGuestbook);

const button = document.getElementById("addBtn");

// 1. 방명록 등록 이벤트
button.addEventListener("click", function () {
    const nameInput = document.getElementById("name");
    const messageInput = document.getElementById("message");

    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    // 빈 값 체크
    if (!name || !message) {
        alert("닉네임과 내용을 모두 입력해 주세요! ✏️");
        return;
    }

    // 새로운 방명록 객체 (고유 ID와 입력 시간 포함)
    const newEntry = {
        id: Date.now(),
        name: name,
        message: message,
        date: new Date().toLocaleDateString()
    };

    // localStorage에서 기존 데이터 가져와서 추가하기
    const entries = getStoredEntries();
    entries.unshift(newEntry); // 최신글이 위로 오도록 추가
    localStorage.setItem("guestbookEntries", JSON.stringify(entries));

    // 화면 갱신 및 입력창 초기화
    renderGuestbook();
    nameInput.value = "";
    messageInput.value = "";

    // 등록 감사 팝업 띄우기
    alert("응원 감사합니다! 💜");
});

// 2. localStorage에서 방명록 데이터 읽어오는 함수
function getStoredEntries() {
    const stored = localStorage.getItem("guestbookEntries");
    return stored ? JSON.parse(stored) : [];
}

// 3. 화면에 방명록 목록 그려주는 함수
function renderGuestbook() {
    const guestbook = document.getElementById("guestbook");
    const entries = getStoredEntries();

    if (entries.length === 0) {
        guestbook.innerHTML = `<p class="empty-msg">아직 방명록이 없습니다. 첫 응원의 주인공이 되어보세요! 🌸</p>`;
        return;
    }

    guestbook.innerHTML = entries.map(entry => `
        <div class="guest-card">
            <div class="card-header">
                <h3>${escapeHtml(entry.name)}</h3>
                <span class="card-date">${entry.date}</span>
            </div>
            <p class="card-message">${escapeHtml(entry.message)}</p>
            <button class="delete-btn" onclick="deleteEntry(${entry.id})">삭제 🗑️</button>
        </div>
    `).join("");
}

// 4. 삭제 기능 함수
function deleteEntry(id) {
    if (confirm("정말 이 방명록을 삭제하시겠습니까?")) {
        let entries = getStoredEntries();
        entries = entries.filter(entry => entry.id !== id);
        localStorage.setItem("guestbookEntries", JSON.stringify(entries));
        renderGuestbook();
    }
}

// 최초 로드 시 실행
function loadGuestbook() {
    renderGuestbook();
}

// 보안을 위한 HTML 스크립트 태그 방지(XSS 예방) 함수
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}