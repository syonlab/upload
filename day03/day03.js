function sayHello() {
    document.getElementById("hellomessage").textContent =
    "안녕하세요! 저는 SYON입니다. 💜 만나서 반가워요 !";
}

const quotes = [
    "💜 포기하지 않는 사람이 결국 개발자가 된다.",
    "🚀 오늘의 에러는 내일의 실력이다.",
    "🌸 작은 기능 하나가 큰 자신감을 만든다.",
    "✨ 완벽한 코드는 없지만 계속 성장하는 개발자는 있다.",
    "☕ 버그는 적이 아니라 선생님이다.",
    "🌟 코드를 짜는 것은 기술이지만, 코드를 읽는 것은 예술이다.",
    "💡 개발은 문제를 해결하는 과정에서 창의성을 발휘하는 것이다.",
    "🔥 실패는 성공의 어머니, 디버깅은 개발자의 스승이다.",
    "💻 코드 한 줄이 세상을 바꿀 수 있다.",
    "🎯 목표를 향해 한 줄씩 나아가는 것이 진정한 개발자의 길이다.",
    "🌈 다양한 언어를 배우는 것은 개발자의 색깔을 넓히는 것이다.",
    "🛠️ 도구를 잘 다루는 것보다 문제를 잘 이해하는 것이 더 중요하다.",
    "⭐⭐⭐⭐ 행운의 발견! 오늘 좋은 일 있을 거예요.⭐⭐⭐⭐",
];

function showQuote() {
    const random = Math.floor(Math.random() * quotes.length);
    document.getElementById("quotemessage").textContent = quotes[random];
}

function showAccount() {
    const account = document.getElementById("account");

    if (account.style.display === "none" || account.style.display === "") {
        account.style.display = "block";
        account.innerHTML =
        `
        😊 감사합니다! 🙇‍♀️<br><br>
        🏦 카카오뱅크<br>
        3333-18-9723016<br>
        김⁎연
        `;
    } else {
        account.style.display = "none";
    }
}

function getDogImage() {
    fetch("https://dog.ceo/api/breeds/image/random")
        .then(response => response.json())
        .then(data => {
            const imgElement = document.getElementById("dogImage");
            imgElement.src = data.message;
            imgElement.style.display = "block";
        })
        .catch(error => {
            console.error("에러 발생:", error);
        });
}

function getGwangjuWeather() {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=35.1595&longitude=126.8526&current=temperature_2m,precipitation";

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const temp = data.current.temperature_2m;
            const rain = data.current.precipitation;

            const resultContainer = document.getElementById("weatherResult");
            const iconElement = document.getElementById("weatherIcon");
            const tempElement = document.getElementById("weatherTemp");
            const statusElement = document.getElementById("weatherStatus");

            let iconCode = "";
            let rainStatus = "";

            if (rain > 0) {
                iconCode = "☔";
                rainStatus = `비 내리는 중 (${rain} mm)`;
            } else {
                iconCode = "☀️";
                rainStatus = `비 안 옴 (0 mm)`;
            }

            if (temp >= 25) {
                tempElement.style.color = "#ff4757";
            } else if (temp <= 10) {
                tempElement.style.color = "#2e86de";
            } else {
                tempElement.style.color = "#333";
            }

            iconElement.innerText = iconCode;
            tempElement.innerText = `${temp}°C`;
            statusElement.innerText = rainStatus;
            
            resultContainer.style.display = "flex"; 
        })
        .catch(error => {
            console.error("날씨 데이터를 가져오는 중 에러 발생:", error);
            document.getElementById("weatherResult").innerText = "날씨 정보를 불러오지 못했습니다. 😢";
            document.getElementById("weatherResult").style.display = "block";
        });
}