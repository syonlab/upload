// 1. Firebase SDK 모듈 불러오기 (Firebase 10.x/12.x 호환)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    updateDoc, 
    doc, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. 시온 님이 직접 발급받으신 Firebase 설정 정보 🎯
const firebaseConfig = {
    apiKey: "AIzaSyAgseOOUy38gg8QyqDVyavhpl0XiXPrRAQ",
    authDomain: "syon-guestbook.firebaseapp.com",
    projectId: "syon-guestbook",
    storageBucket: "syon-guestbook.firebasestorage.app",
    messagingSenderId: "167775993647",
    appId: "1:167775993647:web:cc44e661e6c9ee5eaa6bda",
    measurementId: "G-PM3FG7VKV3"
};

// 👑 홈페이지 주인(시온 님) 전용 마스터 비밀번호 (원하는 비밀번호로 변경 가능!)
const MASTER_PASSWORD = "syonmaster123"; 

// Firebase 및 Firestore 데이터베이스 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 페이지 로드 완료 시 방명록 목록 불러오기
document.addEventListener("DOMContentLoaded", renderGuestbook);

// 3. 방명록 등록 이벤트
const button = document.getElementById("addBtn");
if (button) {
    button.addEventListener("click", async function () {
        const nameInput = document.getElementById("name");
        const passwordInput = document.getElementById("password");
        const messageInput = document.getElementById("message");

        const name = nameInput.value.trim();
        const password = passwordInput.value.trim();
        const message = messageInput.value.trim();

        if (!name || !password || !message) {
            alert("닉네임, 비밀번호, 내용을 모두 입력해 주세요! ✏️");
            return;
        }

        try {
            // Firestore 'guestbook' 컬렉션에 저장
            await addDoc(collection(db, "guestbook"), {
                name: name,
                password: password,
                message: message,
                createdAt: serverTimestamp()
            });

            alert("응원 감사합니다! 💜");
            nameInput.value = "";
            passwordInput.value = "";
            messageInput.value = "";

            renderGuestbook(); // 화면 목록 갱신
        } catch (e) {
            console.error("저장 중 에러 발생: ", e);
            alert("방명록 등록 중 오류가 발생했습니다. Firestore 규칙을 확인해 보세요!");
        }
    });
}

// 4. Firestore에서 방명록 목록 불러와 화면에 그리기
async function renderGuestbook() {
    const guestbook = document.getElementById("guestbook");
    if (!guestbook) return;

    guestbook.innerHTML = "<p class='empty-msg'>방명록을 불러오는 중... ⏳</p>";

    try {
        // 최신순 정렬 Query
        const q = query(collection(db, "guestbook"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            guestbook.innerHTML = `<p class="empty-msg">아직 방명록이 없습니다. 첫 남김의 주인공이 되어보세요! 🌸</p>`;
            return;
        }

        let html = "";
        querySnapshot.forEach((docSnap) => {
            const entry = docSnap.data();
            const id = docSnap.id;
            const date = entry.createdAt ? new Date(entry.createdAt.toDate()).toLocaleDateString() : "방금 전";

            html += `
                <div class="guest-card">
                    <div class="card-header">
                        <h3>${escapeHtml(entry.name)}</h3>
                        <span class="card-date">${date}</span>
                    </div>
                    <p class="card-message" id="msg-${id}">${escapeHtml(entry.message)}</p>
                    <div class="card-actions">
                        <button class="edit-btn" onclick="editEntry('${id}', '${entry.password}')">수정 ✏️</button>
                        <button class="delete-btn" onclick="deleteEntry('${id}', '${entry.password}')">삭제 🗑️</button>
                    </div>
                </div>
            `;
        });

        guestbook.innerHTML = html;
    } catch (e) {
        console.error("불러오기 에러: ", e);
        guestbook.innerHTML = "<p class='empty-msg'>데이터를 불러오지 못했습니다. DB 권한 설정을 확인해 주세요!</p>";
    }
}

// 5. 삭제 기능 (작성자 비번 또는 주인 마스터 비번)
window.deleteEntry = async function(id, originalPassword) {
    const inputPassword = prompt("비밀번호를 입력하세요 (작성자 또는 주인 전용):");
    if (!inputPassword) return;

    if (inputPassword === originalPassword || inputPassword === MASTER_PASSWORD) {
        if (confirm("정말 이 방명록을 삭제하시겠습니까?")) {
            await deleteDoc(doc(db, "guestbook", id));
            alert("삭제되었습니다.");
            renderGuestbook();
        }
    } else {
        alert("비밀번호가 일치하지 않습니다! ❌");
    }
};

// 6. 수정 기능 (작성자 비번 또는 주인 마스터 비번)
window.editEntry = async function(id, originalPassword) {
    const inputPassword = prompt("비밀번호를 입력하세요 (작성자 또는 주인 전용):");
    if (!inputPassword) return;

    if (inputPassword === originalPassword || inputPassword === MASTER_PASSWORD) {
        const currentMsg = document.getElementById(`msg-${id}`).innerText;
        const newMsg = prompt("수정할 내용을 입력하세요:", currentMsg);

        if (newMsg && newMsg.trim() !== "") {
            await updateDoc(doc(db, "guestbook", id), {
                message: newMsg.trim()
            });
            alert("수정되었습니다. ✨");
            renderGuestbook();
        }
    } else {
        alert("비밀번호가 일치하지 않습니다! ❌");
    }
};

// HTML 악성 태그 방지
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}