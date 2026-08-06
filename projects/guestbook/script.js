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
    serverTimestamp,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. 시온 님이 발급받으신 Firebase 설정 정보
const firebaseConfig = {
    apiKey: "AIzaSyAgseOOUy38gg8QyqDVyavhpl0XiXPrRAQ",
    authDomain: "syon-guestbook.firebaseapp.com",
    projectId: "syon-guestbook",
    storageBucket: "syon-guestbook.firebasestorage.app",
    messagingSenderId: "167775993647",
    appId: "1:167775993647:web:cc44e661e6c9ee5eaa6bda",
    measurementId: "G-PM3FG7VKV3"
};

// 👑 홈페이지 주인 전용 마스터 비밀번호
const MASTER_PASSWORD = "syon0107"; 

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
            await addDoc(collection(db, "guestbook"), {
                name: name,
                password: password,
                message: message,
                comments: [],
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

// 4. Firestore에서 방명록 및 댓글 목록 불러와 화면에 그리기
async function renderGuestbook() {
    const guestbook = document.getElementById("guestbook");
    if (!guestbook) return;

    guestbook.innerHTML = "<p class='empty-msg'>방명록을 불러오는 중... ⏳</p>";

    try {
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

            const comments = entry.comments || [];

            // 댓글 목록 HTML 생성
            let commentsHTML = comments.map((comment, index) => {
                const isOwner = comment.isOwner; // 주인장 댓글 여부
                const ownerClass = isOwner ? "owner-comment" : "";
                const ownerBadge = isOwner ? `<span class="owner-badge">👑 주인장</span>` : "";

                return `
                    <div class="comment-item ${ownerClass}">
                        <div class="comment-header">
                            <div>
                                <span class="comment-author">${escapeHtml(comment.author)}</span>
                                ${ownerBadge}
                            </div>
                            <div class="comment-btn-group">
                                <button class="comment-edit-btn" onclick="editComment('${id}', ${index}, '${comment.password}')">✏️</button>
                                <button class="comment-del-btn" onclick="deleteComment('${id}', ${index}, '${comment.password}')">✕</button>
                            </div>
                        </div>
                        <div class="comment-content" id="comment-text-${id}-${index}">${escapeHtml(comment.content)}</div>
                    </div>
                `;
            }).join('');

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

                    <!-- 💬 댓글 영역 (2줄 배치 구조) -->
                    <div class="comment-section">
                        <div class="comment-list">
                            ${commentsHTML}
                        </div>
                        <div class="comment-form">
                            <div class="comment-form-top">
                                <input type="text" id="comment-author-${id}" placeholder="닉네임" class="comment-input author">
                                <input type="password" id="comment-password-${id}" placeholder="비밀번호" class="comment-input password">
                            </div>
                            <div class="comment-form-bottom">
                                <input type="text" id="comment-text-${id}" placeholder="댓글을 입력하세요..." class="comment-input text">
                                <button class="comment-submit-btn" onclick="addComment('${id}')">등록</button>
                            </div>
                        </div>
                    </div>
                </div> <!-- 💡 원인: 누락되어 있었던 guest-card 닫는 태그! -->
            `;
        });

        guestbook.innerHTML = html;
    } catch (e) {
        console.error("불러오기 에러: ", e);
        guestbook.innerHTML = "<p class='empty-msg'>데이터를 불러오지 못했습니다. DB 권한 설정을 확인해 주세요!</p>";
    }
}

// 💬 5. 댓글 작성 기능
window.addComment = async function(docId) {
    const authorInput = document.getElementById(`comment-author-${docId}`);
    const passwordInput = document.getElementById(`comment-password-${docId}`);
    const textInput = document.getElementById(`comment-text-${docId}`);

    const author = authorInput.value.trim();
    const password = passwordInput.value.trim();
    const content = textInput.value.trim();

    if (!author || !password || !content) {
        alert("닉네임, 비밀번호, 댓글 내용을 모두 입력해 주세요! 💬");
        return;
    }

    // 💡 닉네임이 시온/주인장 이거나 마스터 비밀번호 입력 시 '주인장 댓글'로 인식!
    const isOwner = (password === MASTER_PASSWORD) || (author === "시온" || author === "주인장");

    try {
        const postRef = doc(db, "guestbook", docId);
        await updateDoc(postRef, {
            comments: arrayUnion({
                author: author,
                password: password,
                content: content,
                isOwner: isOwner,
                createdAt: new Date().toISOString()
            })
        });

        authorInput.value = "";
        passwordInput.value = "";
        textInput.value = "";
        renderGuestbook();
    } catch (e) {
        console.error("댓글 등록 실패: ", e);
        alert("댓글 등록에 실패했습니다.");
    }
};

// 💬 6. 댓글 수정 기능 (작성자 비번 또는 마스터 비번)
window.editComment = async function(docId, commentIndex, originalPassword) {
    const inputPassword = prompt("댓글 작성 시 설정한 비밀번호를 입력하세요:");
    if (!inputPassword) return;

    if (inputPassword === originalPassword || inputPassword === MASTER_PASSWORD) {
        const currentText = document.getElementById(`comment-text-${docId}-${commentIndex}`).innerText;
        const newContent = prompt("수정할 댓글 내용을 입력하세요:", currentText);

        if (newContent && newContent.trim() !== "") {
            try {
                const querySnapshot = await getDocs(query(collection(db, "guestbook")));
                querySnapshot.forEach(async (docSnap) => {
                    if (docSnap.id === docId) {
                        let comments = docSnap.data().comments || [];
                        comments[commentIndex].content = newContent.trim();

                        await updateDoc(doc(db, "guestbook", docId), { comments: comments });
                        alert("댓글이 수정되었습니다. ✨");
                        renderGuestbook();
                    }
                });
            } catch (e) {
                console.error("댓글 수정 실패: ", e);
            }
        }
    } else {
        alert("비밀번호가 일치하지 않습니다! ❌");
    }
};

// 💬 7. 댓글 삭제 기능 (작성자 비번 또는 마스터 비번)
window.deleteComment = async function(docId, commentIndex, originalPassword) {
    const inputPassword = prompt("댓글 작성 시 설정한 비밀번호를 입력하세요:");
    if (!inputPassword) return;

    if (inputPassword === originalPassword || inputPassword === MASTER_PASSWORD) {
        if (confirm("댓글을 삭제하시겠습니까?")) {
            try {
                const querySnapshot = await getDocs(query(collection(db, "guestbook")));
                querySnapshot.forEach(async (docSnap) => {
                    if (docSnap.id === docId) {
                        let comments = docSnap.data().comments || [];
                        comments.splice(commentIndex, 1);

                        await updateDoc(doc(db, "guestbook", docId), { comments: comments });
                        alert("댓글이 삭제되었습니다.");
                        renderGuestbook();
                    }
                });
            } catch (e) {
                console.error("댓글 삭제 실패: ", e);
            }
        }
    } else {
        alert("비밀번호가 일치하지 않습니다! ❌");
    }
};

// 8. 방명록 글 삭제 기능
window.deleteEntry = async function(id, originalPassword) {
    const inputPassword = prompt("비밀번호를 입력하세요:");
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

// 9. 방명록 글 수정 기능
window.editEntry = async function(id, originalPassword) {
    const inputPassword = prompt("비밀번호를 입력하세요:");
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
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
