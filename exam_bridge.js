(function () {
    const params = new URLSearchParams(window.location.search);
    const examMode = params.has("tentamen") && window.parent !== window;

    let answerSent = false;

    function findElement(ids) {
        for (const id of ids) {
            const element = document.getElementById(id);
            if (element) return element;
        }
        return null;
    }

    function sendAnswer() {
        if (answerSent) return;

        const resultElement = findElement(["result", "response"]);
        const resultText = resultElement ? resultElement.textContent.trim() : "";
        if (!resultText || /giltigt tal|skriv ett svar|ange ett svar/i.test(resultText)) return;

        const answerElement = document.querySelector("input[type='text'], input[type='number']");
        const problemElement = findElement(["problem", "problemText", "question"]) || document.querySelector(".problem");
        const calculationElement = findElement(["calculation", "conversionSteps"]);

        answerSent = true;
        resultElement.style.display = "none";
        if (calculationElement) calculationElement.style.display = "none";
        window.parent.postMessage({
            type: "medicationExamAnswer",
            correct: /^rätt/i.test(resultText),
            problem: problemElement ? problemElement.textContent.trim() : "Uppgift",
            studentAnswer: answerElement ? answerElement.value.trim() : "",
            feedback: resultText,
            calculation: calculationElement ? calculationElement.textContent.trim() : ""
        }, "*");
    }

    function connect() {
        const answerElement = document.querySelector("input[type='text'], input[type='number']");
        if (answerElement) {
            if (typeof answerElement.setAttribute === "function") {
                answerElement.setAttribute("inputmode", "decimal");
            }
            const focusAnswer = () => {
                if (typeof answerElement.focus === "function") {
                    answerElement.focus({ preventScroll: true });
                }
            };
            focusAnswer();

            const problemElement = findElement(["problem", "problemText", "question"]) || document.querySelector(".problem");
            if (problemElement) {
                const focusObserver = new MutationObserver(() => {
                    window.setTimeout(focusAnswer, 0);
                });
                focusObserver.observe(problemElement, { childList: true, subtree: true, characterData: true });
            }
        }

        if (!examMode) return;

        const randomizeButton = Array.from(document.querySelectorAll("button"))
            .find(button => button.textContent.trim().toLowerCase() === "slumpa värden");
        if (randomizeButton) randomizeButton.style.display = "none";

        const checkButton = Array.from(document.querySelectorAll("button"))
            .find(button => button.textContent.trim().toLowerCase() === "kontrollera svar");
        if (!checkButton) return;
        checkButton.textContent = "Registrera svar och gå till nästa uppgift";

        const resultElement = findElement(["result", "response"]);
        if (resultElement) {
            const observer = new MutationObserver(sendAnswer);
            observer.observe(resultElement, { childList: true, subtree: true, characterData: true });
        }

        checkButton.addEventListener("click", () => window.setTimeout(sendAnswer, 80));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", connect);
    } else {
        connect();
    }
}());
