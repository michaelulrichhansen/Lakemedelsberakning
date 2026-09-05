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
        const methodChooser = document.getElementById("methodChooser") || document.getElementById("genericMethodChooser");
        if (methodChooser) methodChooser.style.display = "none";
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
                .dimensional-fraction {
                    display: inline-grid;
                    grid-template-rows: auto auto;
                    vertical-align: middle;
                    margin: 0 .25em;
                    text-align: center;
                    line-height: 1.2;
                }
                .dimensional-numerator {
                    border-bottom: 1.5px solid currentColor;
                    padding: 0 .25em .12em;
                }
                .dimensional-denominator {
                    padding: .12em .25em 0;
                }
                .cancelled-unit {
                    text-decoration: line-through;
                    text-decoration-thickness: 1.5px;
                    text-decoration-color: #a33;
                }
                .visually-hidden {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border: 0;
                }
                .generic-method-chooser { margin-top: 18px; }
                .generic-method-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
                .generic-method-button {
                    margin-top: 0; padding: 8px 12px; border-radius: 6px;
                    background: #fff; color: #195; border: 2px solid #3b7; cursor: pointer;
                }
                .generic-method-button.active { background: #176b45; border-color: #176b45; color: #fff; }
                .generic-method-panel { display: none; color: #555; margin-top: 16px; line-height: 1.6; overflow-x: auto; }
                .generic-proportion-table { border-collapse: collapse; margin: 6px 0 10px; min-width: 250px; }
                .generic-proportion-table th, .generic-proportion-table td {
                    border: 1px solid #aaa; padding: 6px 10px; text-align: center;
                }
                .generic-proportion-table th { background: #f1f1f1; }
                @media (max-width: 500px) {
                    .generic-method-buttons { display: grid; grid-template-columns: 1fr; }
                    .generic-method-button { width: 100%; }
                    .generic-proportion-table { width: 100%; min-width: 0; }
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

            const unitGroups = [
                ["mikrogram", "µg"], ["milligram", "mg"], ["mikroliter", "µL"], ["milliliter", "mL"],
                ["mikromol", "µmol"], ["millimol", "mmol"], ["mol"],
                ["timme", "timmar", "h"], ["minut", "minuter", "min"],
                ["liter", "L"], ["gram", "g"], ["kilogram", "kg"], ["bar"], ["m²"],
                ["enhet", "enheter", "E"], ["droppe", "droppar"],
                ["tablett", "tabletter"], ["inhalation", "inhalationer"]
            ];

            const escapeHtml = value => value.replace(/[&<>"']/g, character => ({
                "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
            })[character]);

            const findUnitGroup = denominator => {
                const denominatorUnit = denominator.replace(/^\s*[-+]?\d+(?:[.,]\d+)?\s*/, "").trim();
                return unitGroups.find(group => group.some(unit => denominatorUnit === unit)) || null;
            };

            const cancelFirstMatchingUnit = (text, group) => {
                if (!group) return { html: escapeHtml(text), matched: false };
                const sortedUnits = [...group].sort((a, b) => b.length - a.length);
                const escapedUnits = sortedUnits.map(unit => unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
                const pattern = new RegExp(`(^|[^A-Za-zÅÄÖåäöµ])(${escapedUnits.join("|")})(?=$|[^A-Za-zÅÄÖåäöµ])`, "i");
                const match = text.match(pattern);
                if (!match) return { html: escapeHtml(text), matched: false };
                const unitStart = match.index + match[1].length;
                return {
                    html: escapeHtml(text.slice(0, unitStart)) +
                        `<span class="cancelled-unit">${escapeHtml(text.slice(unitStart, unitStart + match[2].length))}</span>` +
                        escapeHtml(text.slice(unitStart + match[2].length)),
                    matched: true
                };
            };

            const renderStepExpression = (row, step) => {
                const factorMatch = step.match(/^(.*?)\s+×\s+(.+?)\/(\s*[-+]?\d+(?:[.,]\d+)?\s+[A-Za-zÅÄÖåäöµ²]+)\s*=\s*(.+)$/);
                if (!factorMatch) {
                    row.appendChild(document.createTextNode(step));
                    return;
                }

                const [, leftSide, numeratorText, denominatorText, resultText] = factorMatch;
                const numberAndUnit = text => text.trim().match(/^([-+]?\d+(?:[.,]\d+)?)\s*(.*)$/);
                const numerator = numberAndUnit(numeratorText);
                const denominator = numberAndUnit(denominatorText);

                if (!numerator || !denominator) {
                    row.appendChild(document.createTextNode(step));
                    return;
                }

                const numeratorValue = Number(numerator[1].replace(",", "."));
                const denominatorValue = Number(denominator[1].replace(",", "."));
                const numeratorUnit = numerator[2].trim();
                const denominatorUnit = denominator[2].trim();
                let formula;

                if (numeratorValue === 1 && denominatorValue !== 1) {
                    // Exempel: 0,75 mg/min × 1 mL/50 mg
                    // visas med formelmetod som 0,75 mg/min ÷ 50 mg/mL.
                    const divisorUnit = numeratorUnit
                        ? `${denominatorUnit}/${numeratorUnit}`
                        : denominatorUnit;
                    formula = `${leftSide} ÷ ${denominator[1]} ${divisorUnit}`.trim();
                } else if (denominatorValue === 1) {
                    // Exempel: 3 mL × 2,5 mg/1 mL
                    // visas som 3 mL × 2,5 mg/mL.
                    const multiplierUnit = denominatorUnit
                        ? `${numeratorUnit}/${denominatorUnit}`
                        : numeratorUnit;
                    formula = `${leftSide} × ${numerator[1]} ${multiplierUnit}`.trim();
                } else {
                    formula = `${leftSide} × ${numeratorText}/${denominatorText}`;
                }

                row.appendChild(document.createTextNode(`${formula} = ${resultText}`));
            };

            const dimensionalStepHtml = step => {
                const factorMatch = step.match(/^(.*?)\s+×\s+(.+?)\/(\s*[-+]?\d+(?:[.,]\d+)?\s+[A-Za-zÅÄÖåäöµ²]+)\s*=\s*(.+)$/);
                if (factorMatch) {
                    const [, leftSide, numeratorText, denominatorText, resultText] = factorMatch;
                    const unitGroup = findUnitGroup(denominatorText);
                    const leftRendered = cancelFirstMatchingUnit(leftSide, unitGroup);
                    const numeratorRendered = leftRendered.matched
                        ? { html: escapeHtml(numeratorText), matched: false }
                        : cancelFirstMatchingUnit(numeratorText, unitGroup);
                    const hasCancellablePair = leftRendered.matched || numeratorRendered.matched;
                    const denominatorRendered = hasCancellablePair
                        ? cancelFirstMatchingUnit(denominatorText, unitGroup)
                        : { html: escapeHtml(denominatorText), matched: false };

                    return `${leftRendered.html} × <span class="dimensional-fraction">` +
                        `<span class="dimensional-numerator">${numeratorRendered.html}</span>` +
                        `<span class="visually-hidden"> delat med </span>` +
                        `<span class="dimensional-denominator">${denominatorRendered.html}</span>` +
                        `</span> = ${escapeHtml(resultText)}`;
                }

                const splitComposite = text => {
                    const match = text.trim().match(/^([-+]?\d+(?:[.,]\d+)?)\s*([^/]+)\/([^/]+)$/);
                    return match ? { value: match[1], numeratorUnit: match[2].trim(), denominatorUnit: match[3].trim() } : null;
                };

                const multiplicationMatch = step.match(/^(.*?)\s+×\s+(.+?)\s*=\s*(.+)$/);
                if (multiplicationMatch) {
                    const [, leftSide, rightSide, resultText] = multiplicationMatch;
                    const rightComposite = splitComposite(rightSide);
                    const leftComposite = splitComposite(leftSide);

                    if (rightComposite) {
                        const group = findUnitGroup(`1 ${rightComposite.denominatorUnit}`);
                        const leftRendered = cancelFirstMatchingUnit(leftSide, group);
                        const denominatorRendered = leftRendered.matched
                            ? cancelFirstMatchingUnit(`1 ${rightComposite.denominatorUnit}`, group)
                            : { html: escapeHtml(`1 ${rightComposite.denominatorUnit}`) };
                        return `${leftRendered.html} × <span class="dimensional-fraction">` +
                            `<span class="dimensional-numerator">${escapeHtml(`${rightComposite.value} ${rightComposite.numeratorUnit}`)}</span>` +
                            `<span class="dimensional-denominator">${denominatorRendered.html}</span></span> = ${escapeHtml(resultText)}`;
                    }

                    if (leftComposite) {
                        const group = findUnitGroup(`1 ${leftComposite.denominatorUnit}`);
                        const rightRendered = cancelFirstMatchingUnit(rightSide, group);
                        const denominatorRendered = rightRendered.matched
                            ? cancelFirstMatchingUnit(`1 ${leftComposite.denominatorUnit}`, group)
                            : { html: escapeHtml(`1 ${leftComposite.denominatorUnit}`) };
                        return `<span class="dimensional-fraction"><span class="dimensional-numerator">${escapeHtml(`${leftComposite.value} ${leftComposite.numeratorUnit}`)}</span>` +
                            `<span class="dimensional-denominator">${denominatorRendered.html}</span></span> × ${rightRendered.html} = ${escapeHtml(resultText)}`;
                    }
                }

                const divisionMatch = step.match(/^(.*?)\s+÷\s+(.+?)\s*=\s*(.+)$/);
                if (divisionMatch) {
                    const [, leftSide, divisor, resultText] = divisionMatch;
                    const compositeDivisor = splitComposite(divisor);
                    if (compositeDivisor) {
                        const group = findUnitGroup(`1 ${compositeDivisor.numeratorUnit}`);
                        const leftRendered = cancelFirstMatchingUnit(leftSide, group);
                        const denominatorRendered = leftRendered.matched
                            ? cancelFirstMatchingUnit(`${compositeDivisor.value} ${compositeDivisor.numeratorUnit}`, group)
                            : { html: escapeHtml(`${compositeDivisor.value} ${compositeDivisor.numeratorUnit}`) };
                        return `${leftRendered.html} × <span class="dimensional-fraction">` +
                            `<span class="dimensional-numerator">1 ${escapeHtml(compositeDivisor.denominatorUnit)}</span>` +
                            `<span class="dimensional-denominator">${denominatorRendered.html}</span></span> = ${escapeHtml(resultText)}`;
                    }

                    return `${escapeHtml(leftSide)} × <span class="dimensional-fraction">` +
                        `<span class="dimensional-numerator">1</span><span class="dimensional-denominator">${escapeHtml(divisor)}</span></span> = ${escapeHtml(resultText)}`;
                }

                return escapeHtml(step);
            };

            const quantityHeading = quantity => {
                const unit = quantity.trim().replace(/^[-+]?\d+(?:[.,]\d+)?\s*/, "").trim();
                const normalized = unit.toLowerCase();
                if (/^kg$|kilogram/.test(normalized)) return "Kroppsvikt (kg)";
                if (/^m²$/.test(normalized)) return "Kroppsyta (m²)";
                if (/^mg$|milligram/.test(normalized)) return "Dos (mg)";
                if (/^µg$|mikrogram/.test(normalized)) return "Dos (µg)";
                if (/^g$|gram/.test(normalized)) return "Mängd (g)";
                if (/^e$|enhet/.test(normalized)) return "Dos (E)";
                if (/^ml$|milliliter/.test(normalized)) return "Volym (mL)";
                if (/^µl$|mikroliter/.test(normalized)) return "Volym (µL)";
                if (/^l$|liter/.test(normalized)) return "Volym (L)";
                if (/^min$|minut/.test(normalized)) return "Tid (min)";
                if (/^h$|timme/.test(normalized)) return "Tid (h)";
                if (/^bar$/.test(normalized)) return "Tryck (bar)";
                if (/droppe|droppar/.test(normalized)) return "Antal droppar";
                if (/tablett/.test(normalized)) return "Antal tabletter";
                if (/inhalation/.test(normalized)) return "Antal inhalationer";
                if (/mg\s*\/\s*ml/.test(normalized)) return "Styrka (mg/mL)";
                if (/e\s*\/\s*ml/.test(normalized)) return "Styrka (E/mL)";
                if (/mg\s*\/\s*kg/.test(normalized)) return "Dosering (mg/kg)";
                if (/e\s*\/\s*kg/.test(normalized)) return "Dosering (E/kg)";
                if (/mg\s*\/\s*m²/.test(normalized)) return "Dosering (mg/m²)";
                if (/mg\s*\/\s*min/.test(normalized)) return "Doshastighet (mg/min)";
                if (/ml\s*\/\s*min/.test(normalized)) return "Volymhastighet (mL/min)";
                if (/l\s*\/\s*min/.test(normalized)) return "Syrgasflöde (L/min)";
                return unit ? `Storhet (${escapeHtml(unit)})` : "Storhet";
            };

            const tableHtml = (leftTop, rightTop, leftBottom, rightBottom) =>
                `<table class="generic-proportion-table"><tr><th>${quantityHeading(leftTop)}</th><th>${quantityHeading(rightTop)}</th></tr>` +
                `<tr><td>${escapeHtml(leftTop)}</td><td>${escapeHtml(rightTop)}</td></tr>` +
                `<tr><td>${escapeHtml(leftBottom)}</td><td>${escapeHtml(rightBottom)}</td></tr></table>`;

            const splitCompositeQuantity = text => {
                const match = text.trim().match(/^([-+]?\d+(?:[.,]\d+)?)\s*([^/]+)\/([^/]+)$/);
                if (!match) return null;
                return { value: match[1], numeratorUnit: match[2].trim(), denominatorUnit: match[3].trim() };
            };

            const proportionEquations = (leftTop, rightTop, leftBottom, resultText) => {
                const numberPart = value => {
                    const match = value.trim().match(/^[-+]?\d+(?:[.,]\d+)?/);
                    return match ? match[0] : value.trim();
                };
                const a = numberPart(leftTop);
                const b = numberPart(rightTop);
                const c = numberPart(leftBottom);
                return `<div style="margin-top:8px"><strong>Direkt proportionellt samband:</strong> motsvarande storheter placeras i samma kolumn.</div>` +
                    `<div>${escapeHtml(leftTop)} : ${escapeHtml(rightTop)} = ${escapeHtml(leftBottom)} : x</div>` +
                    `<div>${escapeHtml(a)} × x = ${escapeHtml(b)} × ${escapeHtml(c)}</div>` +
                    `<div>x = (${escapeHtml(b)} × ${escapeHtml(c)}) ÷ ${escapeHtml(a)} = ${escapeHtml(resultText)}</div>`;
            };

            const proportionStepHtml = step => {
                const singularUnit = unit => unit.trim()
                    .replace(/^minuter$/i, "minut")
                    .replace(/^timmar$/i, "timme")
                    .replace(/^droppar$/i, "droppe")
                    .replace(/^tabletter$/i, "tablett")
                    .replace(/^inhalationer$/i, "inhalation");
                const factorMatch = step.match(/^(.*?)\s+×\s+(.+?)\/(\s*[-+]?\d+(?:[.,]\d+)?\s+[A-Za-zÅÄÖåäöµ²]+)\s*=\s*(.+)$/);
                if (factorMatch) {
                    const [, leftSide, numeratorText, denominatorText, resultText] = factorMatch;
                    const numerator = numeratorText.trim().match(/^([-+]?\d+(?:[.,]\d+)?)\s*(.*)$/);
                    if (numerator && Number(numerator[1].replace(",", ".")) === 1 && !numerator[2].trim()) {
                        const denominatorUnit = singularUnit(denominatorText.trim().replace(/^[-+]?\d+(?:[.,]\d+)?\s*/, ""));
                        const leftTop = denominatorText.trim();
                        const rightTop = leftSide.trim();
                        const leftBottom = `1 ${denominatorUnit}`.trim();
                        return tableHtml(leftTop, rightTop, leftBottom, "x") +
                            proportionEquations(leftTop, rightTop, leftBottom, resultText);
                    }
                    return tableHtml(denominatorText.trim(), numeratorText.trim(), leftSide.trim(), "x") +
                        proportionEquations(denominatorText.trim(), numeratorText.trim(), leftSide.trim(), resultText);
                }

                const divisionMatch = step.match(/^(.*?)\s+÷\s+(.+?)\s*=\s*(.+)$/);
                if (divisionMatch) {
                    const [, leftSide, divisor, resultText] = divisionMatch;
                    const compositeDivisor = splitCompositeQuantity(divisor);
                    if (compositeDivisor) {
                        const leftTop = `${compositeDivisor.value} ${compositeDivisor.numeratorUnit}`;
                        const rightTop = `1 ${compositeDivisor.denominatorUnit}`;
                        return tableHtml(leftTop, rightTop, leftSide.trim(), "x") +
                            proportionEquations(leftTop, rightTop, leftSide.trim(), resultText);
                    }
                    const divisorUnit = singularUnit(divisor.trim().replace(/^[-+]?\d+(?:[.,]\d+)?\s*/, ""));
                    const leftBottom = `1 ${divisorUnit}`.trim();
                    return tableHtml(divisor.trim(), leftSide.trim(), leftBottom, "x") +
                        proportionEquations(divisor.trim(), leftSide.trim(), leftBottom, resultText);
                }

                const multiplicationMatch = step.match(/^(.*?)\s+×\s+(.+?)\s*=\s*(.+)$/);
                if (multiplicationMatch) {
                    const [, leftSide, multiplier, resultText] = multiplicationMatch;
                    const compositeMultiplier = splitCompositeQuantity(multiplier);
                    if (compositeMultiplier) {
                        const leftTop = `1 ${compositeMultiplier.denominatorUnit}`;
                        const rightTop = `${compositeMultiplier.value} ${compositeMultiplier.numeratorUnit}`;
                        return tableHtml(leftTop, rightTop, leftSide.trim(), "x") +
                            proportionEquations(leftTop, rightTop, leftSide.trim(), resultText);
                    }
                    const compositeLeft = splitCompositeQuantity(leftSide);
                    if (compositeLeft) {
                        const leftTop = `1 ${compositeLeft.denominatorUnit}`;
                        const rightTop = `${compositeLeft.value} ${compositeLeft.numeratorUnit}`;
                        return tableHtml(leftTop, rightTop, multiplier.trim(), "x") +
                            proportionEquations(leftTop, rightTop, multiplier.trim(), resultText);
                    }
                    return null;
                }

                return null;
            };

            const addMethodChooser = (steps, answer) => {
                const customChooser = document.getElementById("methodChooser");
                if (customChooser) return;
                if (/avrundningsregler/i.test(document.title)) return;
                document.getElementById("genericMethodChooser")?.remove();

                const proportionSteps = steps.map(proportionStepHtml);
                const customProportion = typeof window.getCustomProportionSolution === "function"
                    ? window.getCustomProportionSolution()
                    : "";
                const hasProportion = Boolean(customProportion) || proportionSteps.some(Boolean);

                const chooser = document.createElement("div");
                chooser.id = "genericMethodChooser";
                chooser.className = "generic-method-chooser";
                chooser.innerHTML = `<div class="generic-method-buttons" role="group" aria-label="Välj lösningsmetod">` +
                    `<button type="button" class="generic-method-button active" data-method="formula" aria-pressed="true">✓ Formelmetoden</button>` +
                    `<button type="button" class="generic-method-button" data-method="dimension" aria-pressed="false">Dimensionsanalys</button>` +
                    (hasProportion ? `<button type="button" class="generic-method-button" data-method="proportion" aria-pressed="false">Proportionsmetoden</button>` : "") + `</div>` +
                    `<div class="generic-method-panel" data-panel="dimension"><strong>Dimensionsanalys</strong>` +
                    steps.map((step, index) => `<div><strong>Steg ${index + 1}:</strong> ${dimensionalStepHtml(step)}</div>`).join("") +
                    `<div style="margin-top:8px"><strong>Svar:</strong> ${escapeHtml(answer)}</div></div>` +
                    (hasProportion ? `<div class="generic-method-panel" data-panel="proportion"><strong>Proportionsmetoden</strong>` +
                    (customProportion || proportionSteps.map((step, index) => step
                        ? `<div style="margin-top:8px"><strong>Steg ${index + 1}:</strong>${step}</div>`
                        : `<div style="margin-top:8px"><strong>Steg ${index + 1} – jämförelse eller vanlig beräkning:</strong> ${escapeHtml(steps[index])}</div>`).join("")) +
                    `<div style="margin-top:8px"><strong>Svar:</strong> ${escapeHtml(answer)}</div></div>` : "");

                const selectMethod = method => {
                    calculationElement.style.display = method === "formula" ? "block" : "none";
                    chooser.querySelectorAll("[data-panel]").forEach(panel => {
                        panel.style.display = panel.dataset.panel === method ? "block" : "none";
                    });
                    chooser.querySelectorAll("[data-method]").forEach(button => {
                        const active = button.dataset.method === method;
                        button.classList.toggle("active", active);
                        button.setAttribute("aria-pressed", active ? "true" : "false");
                        const label = button.dataset.method === "formula" ? "Formelmetoden" :
                            button.dataset.method === "dimension" ? "Dimensionsanalys" : "Proportionsmetoden";
                        button.textContent = `${active ? "✓ " : ""}${label}`;
                    });
                };
                chooser.querySelectorAll("[data-method]").forEach(button =>
                    button.addEventListener("click", () => selectMethod(button.dataset.method)));
                calculationElement.insertAdjacentElement("afterend", chooser);
                // En tidigare vald alternativ metod kan ha lämnat formellösningen
                // dold. Varje ny rättning ska alltid börja med synlig formelmetod.
                selectMethod("formula");
            };

            const formatCalculation = () => {
                if (!calculationElement.textContent.trim()) {
                    document.getElementById("genericMethodChooser")?.remove();
                    return;
                }
                if (calculationElement.querySelector(".calculation-steps")) return;

                const source = calculationElement.innerHTML
                    .replace(/<br\s*\/?>/gi, "\n")
                    .replace(/<\/p>|<\/div>/gi, "\n");
                const holder = document.createElement("div");
                holder.innerHTML = source;
                const plainText = holder.textContent
                    .replace(/<br\s*\/?>/gi, "\n")
                    .replace(/^\s*Beräkning:\s*/i, "")
                    .trim();
                if (!plainText) return;

                const steps = plainText
                    .split(/\n+|\.\s+(?=[A-ZÅÄÖ0-9(])/)
                    // Äldre facit kan redan börja med "Steg 1:". Ta bort den
                    // märkningen innan den gemensamma numreringen läggs till.
                    .map(step => step.trim().replace(/^Steg\s+\d+:\s*/i, "").replace(/\.$/, ""))
                    .filter(Boolean);
                if (steps.length === 0) return;

                const lastStep = steps[steps.length - 1];
                let answer = lastStep;
                if (/^avrundat till/i.test(lastStep) && lastStep.includes(":")) {
                    answer = lastStep.slice(lastStep.indexOf(":") + 1).trim();
                } else if (/^alltså/i.test(lastStep)) {
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
                    row.appendChild(label);
                    renderStepExpression(row, step);
                    wrapper.appendChild(row);
                });

                const answerRow = document.createElement("div");
                answerRow.style.marginTop = "8px";
                const answerLabel = document.createElement("strong");
                answerLabel.textContent = "Svar: ";
                answerRow.append(answerLabel, document.createTextNode(answer));
                wrapper.appendChild(answerRow);

                calculationElement.replaceChildren(wrapper);
                addMethodChooser(steps, answer);
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
