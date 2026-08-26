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
        if (typeof document.createElement === "function" &&
            document.head &&
            !document.getElementById("consistent-problem-typography")) {
            const typographyStyle = document.createElement("style");
            typographyStyle.id = "consistent-problem-typography";
            typographyStyle.textContent = `
                #problem, #problemText, #question, .problem,
                #problem strong, #problem b,
                #problemText strong, #problemText b,
                #question strong, #question b,
                .problem strong, .problem b {
                    font-family: Arial, sans-serif;
                    font-weight: 600 !important;
                }
            `;
            document.head.appendChild(typographyStyle);
        }

        const heading = document.querySelector("h1");
        const card = document.querySelector(".card") || document.querySelector("main") || document.body;
        if (heading && card && !document.querySelector(".site-breadcrumb")) {
            const headingParts = heading.innerText.split(/\n+/).map(part => part.trim()).filter(Boolean);
            const pageName = headingParts[headingParts.length - 1] || document.title;
            const breadcrumb = document.createElement("nav");
            breadcrumb.className = "site-breadcrumb";
            breadcrumb.setAttribute("aria-label", "Du är här");
            breadcrumb.style.cssText = "margin:0 0 18px;color:#666;font-size:.95rem;";
            breadcrumb.innerHTML = '<a href="index.html" target="_top" style="color:#1166cc;text-decoration:none;">Startsida</a> <span aria-hidden="true">›</span> <span></span>';
            breadcrumb.querySelector("span:last-child").textContent = pageName;
            card.insertBefore(breadcrumb, heading);
        }

        if (card && !document.querySelector(".site-version")) {
            const version = document.createElement("p");
            version.className = "site-version";
            version.textContent = "Senast uppdaterad augusti 2026";
            version.style.cssText = "margin:22px 0 0;color:#777;font-size:.85rem;text-align:center;";
            card.appendChild(version);
        }

        const answerElement = document.querySelector("input[type='text'], input[type='number']");
        if (answerElement) {
            if (typeof answerElement.setAttribute === "function") {
                answerElement.setAttribute("placeholder", "Ditt svar");
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

        const answerLabel = document.getElementById("answerLabel") ||
            (answerElement && answerElement.id ? document.querySelector(`label[for='${answerElement.id}']`) : null);
        if (answerLabel) {
            const normalizeLabel = () => {
                const normalizedText = answerLabel.textContent
                    .replace(/^Ange ditt svar/, "Skriv ditt svar")
                    .replace(/^Ange antal/, "Skriv antal")
                    .replace(/^Ange flaska/, "Skriv flaska");
                if (normalizedText !== answerLabel.textContent) {
                    answerLabel.textContent = normalizedText;
                }
            };
            normalizeLabel();
            const labelObserver = new MutationObserver(normalizeLabel);
            labelObserver.observe(answerLabel, { childList: true, subtree: true, characterData: true });
        }

        const questionElement = findElement(["problem", "problemText", "question"]) || document.querySelector(".problem");
        const randomizeButtonForVariation = Array.from(document.querySelectorAll("button"))
            .find(button => button.textContent.trim().toLowerCase() === "slumpa värden");

        if (!examMode && !params.has("kvalitetskontroll") && questionElement && randomizeButtonForVariation && window.sessionStorage) {
            const storagePrefix = `medicationPractice:${window.location.pathname}:`;
            let rerollAttempts = 0;
            let variationTimer;

            const readStored = (key, fallback) => {
                try {
                    const value = window.sessionStorage.getItem(storagePrefix + key);
                    return value ? JSON.parse(value) : fallback;
                } catch (error) {
                    return fallback;
                }
            };

            const storeValue = (key, value) => {
                try {
                    window.sessionStorage.setItem(storagePrefix + key, JSON.stringify(value));
                } catch (error) {
                    // Övningen fungerar även om webbläsaren blockerar tillfällig lagring.
                }
            };

            const questionSignature = text => text
                .toLowerCase()
                .replace(/\d+(?:[.,]\d+)?/g, "#")
                .replace(/\s+/g, " ")
                .trim();

            const checkVariation = () => {
                const questionText = questionElement.textContent.trim();
                if (!questionText) return;

                const signature = questionSignature(questionText);
                const recentQuestions = readStored("recentQuestions", []);
                const previousSignature = readStored("previousSignature", "");
                const repeatedValues = recentQuestions.includes(questionText);
                const repeatedType = previousSignature === signature;

                if ((repeatedValues || repeatedType) && rerollAttempts < 10) {
                    rerollAttempts += 1;
                    randomizeButtonForVariation.click();
                    return;
                }

                rerollAttempts = 0;
                storeValue("recentQuestions", [questionText, ...recentQuestions.filter(item => item !== questionText)].slice(0, 6));
                storeValue("previousSignature", signature);
            };

            const variationObserver = new MutationObserver(() => {
                window.clearTimeout(variationTimer);
                variationTimer = window.setTimeout(checkVariation, 0);
            });
            variationObserver.observe(questionElement, { childList: true, subtree: true, characterData: true });
            window.setTimeout(checkVariation, 0);
        }

        const calculationElement = findElement(["calculation", "conversionSteps"]);
        if (calculationElement && typeof document.createElement === "function") {
            let calculationTimer;

            const formatCalculation = () => {
                if (!calculationElement.textContent.trim() || calculationElement.querySelector(".calculation-steps")) return;

                const source = calculationElement.innerHTML
                    .replace(/<br\s*\/?>/gi, "\n")
                    .replace(/<\/p>|<\/div>/gi, "\n");
                const holder = document.createElement("div");
                holder.innerHTML = source;
                const plainText = holder.textContent
                    .replace(/^\s*Beräkning:\s*/i, "")
                    .trim();
                if (!plainText) return;

                const steps = plainText
                    .split(/\n+|\.\s+(?=[A-ZÅÄÖ0-9(])/)
                    .map(step => step.trim().replace(/\.$/, ""))
                    .filter(Boolean);
                if (steps.length === 0) return;

                const lastStep = steps[steps.length - 1];
                let answer = lastStep;
                if (/^alltså/i.test(lastStep)) {
                    answer = lastStep.replace(/^alltså\s*/i, "");
                } else {
                    const approximateIndex = lastStep.lastIndexOf("≈");
                    const equalsIndex = lastStep.lastIndexOf("=");
                    const separatorIndex = approximateIndex >= 0 ? approximateIndex : equalsIndex;
                    if (separatorIndex >= 0) answer = lastStep.slice(separatorIndex + 1).trim();
                }

                const wrapper = document.createElement("div");
                wrapper.className = "calculation-steps";
                wrapper.style.lineHeight = "1.6";

                steps.forEach((step, index) => {
                    const row = document.createElement("div");
                    const label = document.createElement("strong");
                    label.textContent = `Steg ${index + 1}: `;
                    row.append(label, document.createTextNode(step));
                    wrapper.appendChild(row);
                });

                const answerRow = document.createElement("div");
                answerRow.style.marginTop = "8px";
                const answerLabel = document.createElement("strong");
                answerLabel.textContent = "Svar: ";
                answerRow.append(answerLabel, document.createTextNode(answer));
                wrapper.appendChild(answerRow);

                calculationElement.replaceChildren(wrapper);
            };

            const calculationObserver = new MutationObserver(() => {
                window.clearTimeout(calculationTimer);
                calculationTimer = window.setTimeout(formatCalculation, 0);
            });
            calculationObserver.observe(calculationElement, { childList: true, subtree: true, characterData: true });
            window.setTimeout(formatCalculation, 0);
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
            const observer = new MutationObserver(() => window.setTimeout(sendAnswer, 30));
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
