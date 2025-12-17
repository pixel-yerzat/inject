/**
 * SmartQA v3.1 - Исправленная версия
 * Один вопрос = один лучший ответ
 * 
 * F12 → Console → Вставить → Enter
 */

;(async () => {
  
  const DB_URL = "https://gist.githubusercontent.com/pixel-yerzat/4201fecb406c3e99883f2dd0c97c84d4/raw/";
  
  const CFG = {
    threshold: 0.6,
    showAnswers: true,
    debug: true
  };

  const normalize = (txt) => {
    return String(txt || "")
      .toLowerCase()
      .replace(/[^\wа-яёәіңғүұқөһ\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const compare = (a, b) => {
    const s1 = normalize(a);
    const s2 = normalize(b);
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.95;
    
    const w1 = s1.split(" ").filter(w => w.length > 2);
    const w2 = s2.split(" ").filter(w => w.length > 2);
    
    if (!w1.length || !w2.length) return 0;
    
    const common = w1.filter(w => w2.includes(w)).length;
    return common / Math.max(w1.length, w2.length);
  };

  console.log("%c🔍 SmartQA v3.1", "font-size:18px;color:#2196F3;font-weight:bold");

  // 1. Загрузка базы
  console.log("📥 Загрузка базы...");
  let database;
  try {
    const res = await fetch(DB_URL + "?_=" + Date.now());
    database = await res.json();
  } catch (e) {
    console.error("❌ Ошибка загрузки:", e);
    return;
  }
  
  if (!database?.questions?.length) {
    console.error("❌ База пустая");
    return;
  }
  console.log(`✅ База: ${database.questions.length} записей`);

  // 2. Собираем текст со страницы
  console.log("📄 Сканирование...");
  
  const allElements = document.body.querySelectorAll("*");
  const textBlocks = [];
  const seen = new Set();
  
  allElements.forEach(el => {
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "NOSCRIPT") return;
    if (el.offsetParent === null && el.tagName !== "BODY") return;
    
    const directText = Array.from(el.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent.trim())
      .join(" ")
      .trim();
    
    const fullText = el.textContent?.trim() || "";
    const text = directText.length > 10 ? directText : fullText;
    
    if (text.length >= 10 && text.length <= 1000 && !seen.has(text)) {
      seen.add(text);
      textBlocks.push({ el, text });
    }
  });
  
  console.log(`✅ Блоков: ${textBlocks.length}`);

  // 3. Для каждого блока ищем ОДИН лучший ответ
  console.log("🔎 Поиск...");
  
  const results = [];
  const usedElements = new WeakSet();
  
  textBlocks.forEach(block => {
    // Уже обработан этот элемент - пропускаем
    if (usedElements.has(block.el)) return;
    
    let bestMatch = null;
    let bestScore = 0;
    
    // Ищем лучшее совпадение среди ВСЕХ вопросов базы
    database.questions.forEach(item => {
      const score = compare(block.text, item.question);
      
      if (score >= CFG.threshold && score > bestScore) {
        bestScore = score;
        bestMatch = {
          element: block.el,
          pageText: block.text,
          answer: item.answer,
          score: score
        };
      }
    });
    
    // Если нашли - добавляем только лучший
    if (bestMatch) {
      results.push(bestMatch);
      usedElements.add(block.el);
    }
  });

  console.log(`✅ Совпадений: ${results.length}`);

  // 4. Показываем ответы
  if (CFG.showAnswers && results.length > 0) {
    const style = document.createElement("style");
    style.textContent = `
      .sqa-answer {
        display: block;    
        font-size: 14px;
        color: #000;
        border-radius: 0 6px 6px 0;
      }
    `;
    document.head.appendChild(style);
    
    results.forEach(r => {
      const div = document.createElement("div");
      div.className = "sqa-answer";
      div.textContent =  r.answer;
      
      r.element.insertAdjacentElement("afterend", div);
    });
  }

  // 5. Отчёт
  console.log("\n%c📊 РЕЗУЛЬТАТЫ", "font-size:14px;font-weight:bold;color:#4caf50");
  
  if (results.length > 0) {
    console.table(results.map(r => ({
      "Вопрос": r.pageText.substring(0, 60) + "...",
      "Ответ": r.answer,
      "%": Math.round(r.score * 100)
    })));
  } else {
    console.log("⚠️ Совпадений нет. Попробуй: SmartQA.cfg.threshold = 0.4");
  }

  window.SmartQA = { cfg: CFG, results, database };
  
})();
