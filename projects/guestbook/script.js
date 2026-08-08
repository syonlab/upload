// 1. Firebase SDK 모듈 불러오기
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

// 2. Firebase 설정 정보
const firebaseConfig = {
    apiKey: "AIzaSyAgseOOUy38gg8QyqDVyavhpl0XiXPrRAQ",
    authDomain: "syon-guestbook.firebaseapp.com",
    projectId: "syon-guestbook",
    storageBucket: "syon-guestbook.firebasestorage.app",
    messagingSenderId: "167775993647",
    appId: "1:167775993647:web:cc44e661e6c9ee5eaa6bda",
    measurementId: "G-PM3FG7VKV3"
};

const MASTER_PASSWORD = "syon0107"; 

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", renderGuestbook);

// 3. 방명록 등록
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
                comments: [],
                createdAt: serverTimestamp()
            });

            alert("응원 감사합니다! 💜");
            nameInput.value = "";
            passwordInput.value = "";
            messageInput.value = "";

            renderGuestbook();
        } catch (e) {
            console.error("저장 에러: ", e);
            alert("방명록 등록 중 오류가 발생했습니다.");
        }
    });
}

// 4. 방명록 및 댓글/답글 랜더링
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

            // 댓글 및 답글 HTML 생성
            let commentsHTML = comments.map((comment, index) => {
                const isOwner = comment.isOwner;       // 👑 주인장 여부
                const isAuthor = comment.isAuthor;     // ✏️ 글 작성자 여부
                const isReply = comment.isReply;       // 💬 대댓글(답글) 여부

                let badgeHTML = "";
                let itemClass = "comment-item";

                if (isOwner) {
                    badgeHTML = `<span class="owner-badge">👑 주인장</span>`;
                    itemClass += " owner-comment";
                } else if (isAuthor) {
                    badgeHTML = `<span class="author-badge">✏️ 작성자</span>`;
                    itemClass += " author-comment";
                }

                if (isReply) {
                    itemClass += " reply-item";
                }

                return `
                    <div class="${itemClass}">
                        <div class="comment-header">
                            <div>
                                ${isReply ? '<span class="reply-arrow">↳</span> ' : ''}
                                <span class="comment-author">${escapeHtml(comment.author)}</span>
                                ${badgeHTML}
                            </div>
                            <div class="comment-btn-group">
                                ${!isReply ? `<button class="reply-toggle-btn" onclick="toggleReplyForm('${id}', ${index})">답글</button>` : ''}
                                <button class="comment-edit-btn" onclick="editComment('${id}', ${index}, '${comment.password}')">✏️</button>
                                <button class="comment-del-btn" onclick="deleteComment('${id}', ${index}, '${comment.password}')">✕</button>
                            </div>
                        </div>
                        <div class="comment-content" id="comment-text-${id}-${index}">${escapeHtml(comment.content)}</div>
                    </div>

                    <!-- 💬 답글 작성 입력창 (숨겨져 있음) -->
                    <div id="reply-form-${id}-${index}" class="reply-form" style="display: none;">
                        <div class="comment-form-top">
                            <input type="text" id="reply-author-${id}-${index}" placeholder="닉네임" class="comment-input author">
                            <input type="password" id="reply-password-${id}-${index}" placeholder="비밀번호" class="comment-input password">
                        </div>
                        <div class="comment-form-bottom">
                            <textarea id="reply-text-${id}-${index}" placeholder="답글을 입력하세요!" class="comment-textarea"></textarea>
                            <button class="comment-submit-btn" onclick="addReply('${id}', ${index})">답글 등록</button>
                        </div>
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

                    <!-- 💬 댓글 영역 -->
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
                                <textarea id="comment-text-${id}" placeholder="댓글을 입력하세요!" class="comment-textarea"></textarea>
                                <button class="comment-submit-btn" onclick="addComment('${id}', '${escapeHtml(entry.name)}', '${entry.password}')">등록</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        guestbook.innerHTML = html;
    } catch (e) {
        console.error("불러오기 에러: ", e);
        guestbook.innerHTML = "<p class='empty-msg'>데이터를 불러오지 못했습니다.</p>";
    }
}

// 💬 5. 일반 댓글 작성
window.addComment = async function(docId, postAuthorName, postPassword) {
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

    // 👑 주인장 체크
    const isOwner = (author === "시온" || author === "주인장") && (password === MASTER_PASSWORD);
    // ✏️ 최초 게시글 작성자 체크 (동일한 닉네임 + 동일한 비밀번호)
    const isAuthor = (!isOwner) && (author === postAuthorName && password === postPassword);

    try {
        const querySnapshot = await getDocs(query(collection(db, "guestbook")));
        querySnapshot.forEach(async (docSnap) => {
            if (docSnap.id === docId) {
                let comments = docSnap.data().comments || [];
                comments.push({
                    author: author,
                    password: password,
                    content: content,
                    isOwner: isOwner,
                    isAuthor: isAuthor,
                    isReply: false,
                    createdAt: new Date().toISOString()
                });

                await updateDoc(doc(db, "guestbook", docId), { comments: comments });
                renderGuestbook();
            }
        });
    } catch (e) {
        console.error("댓글 등록 실패: ", e);
        alert("댓글 등록에 실패했습니다.");
    }
};

// 💬 6. 답글 입력창 토글 (보이기/숨기기)
window.toggleReplyForm = function(docId, commentIndex) {
    const form = document.getElementById(`reply-form-${docId}-${commentIndex}`);
    if (form) {
        form.style.display = (form.style.display === "none" || form.style.display === "") ? "flex" : "none";
    }
};

// 💬 7. 답글(대댓글) 작성
window.addReply = async function(docId, targetCommentIndex) {
    const authorInput = document.getElementById(`reply-author-${docId}-${targetCommentIndex}`);
    const passwordInput = document.getElementById(`reply-password-${docId}-${targetCommentIndex}`);
    const textInput = document.getElementById(`reply-text-${docId}-${targetCommentIndex}`);

    const author = authorInput.value.trim();
    const password = passwordInput.value.trim();
    const content = textInput.value.trim();

    if (!author || !password || !content) {
        alert("닉네임, 비밀번호, 답글 내용을 모두 입력해 주세요! 💬");
        return;
    }

    try {
        const querySnapshot = await getDocs(query(collection(db, "guestbook")));
        querySnapshot.forEach(async (docSnap) => {
            if (docSnap.id === docId) {
                const entry = docSnap.data();
                let comments = entry.comments || [];

                const isOwner = (author === "시온" || author === "주인장") && (password === MASTER_PASSWORD);
                const isAuthor = (!isOwner) && (author === entry.name && password === entry.password);

                const newReply = {
                    author: author,
                    password: password,
                    content: content,
                    isOwner: isOwner,
                    isAuthor: isAuthor,
                    isReply: true,
                    createdAt: new Date().toISOString()
                };

                // 해당 댓글 바로 뒤에 답글 삽입
                comments.splice(targetCommentIndex + 1, 0, newReply);

                await updateDoc(doc(db, "guestbook", docId), { comments: comments });
                renderGuestbook();
            }
        });
    } catch (e) {
        console.error("답글 등록 실패: ", e);
    }
};

// 💬 8. 댓글 수정
window.editComment = async function(docId, commentIndex, originalPassword) {
    const inputPassword = prompt("댓글 작성 시 설정한 비밀번호를 입력하세요:");
    if (!inputPassword) return;

    if (inputPassword === originalPassword || inputPassword === MASTER_PASSWORD) {
        const currentText = document.getElementById(`comment-text-${docId}-${commentIndex}`).innerText;
        const newContent = prompt("수정할 내용을 입력하세요:", currentText);

        if (newContent && newContent.trim() !== "") {
            try {
                const querySnapshot = await getDocs(query(collection(db, "guestbook")));
                querySnapshot.forEach(async (docSnap) => {
                    if (docSnap.id === docId) {
                        let comments = docSnap.data().comments || [];
                        comments[commentIndex].content = newContent.trim();

                        await updateDoc(doc(db, "guestbook", docId), { comments: comments });
                        alert("수정되었습니다. ✨");
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

// 💬 9. 댓글 삭제
window.deleteComment = async function(docId, commentIndex, originalPassword) {
    const inputPassword = prompt("댓글 작성 시 설정한 비밀번호를 입력하세요:");
    if (!inputPassword) return;

    if (inputPassword === originalPassword || inputPassword === MASTER_PASSWORD) {
        if (confirm("삭제하시겠습니까?")) {
            try {
                const querySnapshot = await getDocs(query(collection(db, "guestbook")));
                querySnapshot.forEach(async (docSnap) => {
                    if (docSnap.id === docId) {
                        let comments = docSnap.data().comments || [];
                        comments.splice(commentIndex, 1);

                        await updateDoc(doc(db, "guestbook", docId), { comments: comments });
                        alert("삭제되었습니다.");
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

// 10. 방명록 글 삭제/수정
window.deleteEntry = async function(id, originalPassword) {
    const inputPassword = prompt("비밀번호를 입력하세요:");
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

window.editEntry = async function(id, originalPassword) {
    const inputPassword = prompt("비밀번호를 입력하세요:");
    const inputPassword = prompt("비밀번호를 입력하세요:");
    if (!inputPassword) return;

    if (inputPassword === originalPassword || inputPassword === MASTER_PASSWORD) {
        const currentMsg = document.getElementById(`msg-${id}`).innerText;
        const newMsg = prompt("수정할 내용을 입력하세요:", currentMsg);

        if (newMsg && newMsg.trim() !== "") {
            await updateDoc(doc(db, "guestbook", id), { message: newMsg.trim() });
            alert("수정되었습니다. ✨");
            renderGuestbook();
        }
    } else {
        alert("비밀번호가 일치하지 않습니다! ❌");
    }
};

function escapeHtml(text) {
    if (!text) return "";
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
