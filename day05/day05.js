// =========================
// 타이핑 효과 (Apple 스타일)
// =========================
const subtitle = document.querySelector(".subtitle");

if (subtitle) {
    const text = "CSS Animation Playground";
    subtitle.textContent = ""; // 💡 핵심: 기존에 적혀있던 텍스트를 깨끗하게 비우고 시작!
    let index = 0;

    function typing() {
        if (index < text.length) {
            subtitle.textContent += text.charAt(index);
            index++;
            setTimeout(typing, 60); // 타이핑 속도를 살짝 업하여 청량감 추가
        }
    }

    // 약간의 딜레이 후 자연스럽게 타이핑 시작
    setTimeout(typing, 300);
}

// =========================
// 스크롤 등장 효과 (시차 연출 추가)
// =========================
const cards = document.querySelectorAll(".card");

if (cards.length > 0) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                // 여러 카드가 동시에 감지되면 인덱스(index) 순서대로 시차를 주고 등장!
                const card = entry.target;
                const index = Array.from(cards).indexOf(card);
                
                setTimeout(() => {
                    card.classList.add("show");
                }, index * 150); // 0.15초씩 차이를 두고 순차적으로 짠!

                observer.unobserve(card); // 관찰 종료
            }
        });
    }, {
        threshold: 0.1 // 10% 정도 화면에 보이면 감지
    });

    cards.forEach((card) => observer.observe(card));
}

// =========================
// 개발일기 스크롤 감지 & 타이핑 효과
// =========================
const diaryElement = document.getElementById("diaryText");

if (diaryElement) {
    // 타이핑될 개발일기 내용 (\n은 줄바꿈)
    const diaryContent = `오늘은 홈페이지를 조금 더\n세련되고 자연스럽게 보이게 하는\n애니메이션을 공부했다.🎞️\n\n작은 효과 하나만 추가해도\n홈페이지 분위기가 완전히 달라지는 것이\n정말 신기했다.⭐\n\n앞으로도 이런 작은 디테일들을\n꾸준히 공부하고 적용해야겠다.📝
    \n방명록도 그렇고 신기한 기능들을 구현할 때마다\n내가 직접 코드를 작성하고\n결과물을 만들어낸다는 것이\n정말 뿌듯하다.💻\n\n앞으로도 계속해서\n나만의 홈페이지를 발전시켜야겠다.🚀`;

    let diaryIndex = 0;
    let isTypingStarted = false; // 중복 실행 방지 플래그

    function startDiaryTyping() {
        diaryElement.classList.add("typing"); // 커서 표시 클래스 추가

        function type() {
            if (diaryIndex < diaryContent.length) {
                diaryElement.textContent += diaryContent.charAt(diaryIndex);
                diaryIndex++;
                setTimeout(type, 50); // 타이핑 속도 (50ms)
            } else {
                // 타이핑 완료 후 1초 뒤 커서 제거
                setTimeout(() => {
                    diaryElement.classList.remove("typing");
                }, 1000);
            }
        }

        type();
    }

    // 개발일기 영역이 스크롤에 도달했을 때 타이핑 시작하는 IntersectionObserver
    const diaryObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting && !isTypingStarted) {
                isTypingStarted = true;
                startDiaryTyping();
                diaryObserver.unobserve(entry.target); // 한 번 시작하면 감지 종료
            }
        });
    }, {
        threshold: 0.3 // 개발일기 상자가 30% 이상 화면에 보일 때 시작
    });

    diaryObserver.observe(diaryElement);
}