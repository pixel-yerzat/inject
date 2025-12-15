/**
 * QA Injector - ГОТОВЫЙ СКРИПТ
 * Автоматически загружает вопросы из вашего GitHub Gist
 *
 * ИСПОЛЬЗОВАНИЕ:
 * 1. Скопируйте ВЕСЬ этот файл
 * 2. Откройте страницу с тестом
 * 3. Нажмите F12 (консоль)
 * 4. Вставьте скрипт и нажмите Enter
 * 5. Готово! Ответы автоматически добавятся!
 */

(function () {
  "use strict";

  // ============================================
  // НАСТРОЙКИ
  // ============================================
  const CONFIG = {
    // ВАШ GITHUB GIST (уже настроен!)
    gistUrl:
      "https://gist.githubusercontent.com/pixel-yerzat/71074b58c72489de15c87f5aad698b2f/raw/",

    // Настройки отображения
    debug: true, // true = показывать логи в консоли
    mode: "visible", // hidden = скрытно, subtle = иконка 💡, visible = видимо
    autoFill: false, // false = не заполнять поля автоматически
    matchThreshold: 0.9, // 0.6 = средняя точность (меньше = больше совпадений)
    delay: 1000, // Задержка перед инъекцией (мс)
  };

  class GistQAInjector {
    constructor(config) {
      this.config = config;
      this.qaData = null;
    }

    log(message, data = "") {
      if (this.config.debug) {
        console.log(`[QA Gist] ${message}`, data);
      }
    }

    // Загрузка JSON из GitHub Gist
    async loadFromGist() {
      try {
        this.log("🌐 Загрузка JSON из GitHub Gist...");
        this.log("📍 URL:", this.config.gistUrl);

        const response = await fetch(this.config.gistUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.log("✅ JSON успешно загружен!");
        this.log("📊 Вопросов загружено:", data.questions.length);

        return data;
      } catch (error) {
        console.error("❌ Ошибка загрузки Gist:", error.message);
        console.log("💡 Проверьте что Gist публичный и URL правильный");
        return null;
      }
    }

    // Поиск вопросов на странице
    findQuestions() {
      const questions = [];
      const selectors = [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "label",
        "p",
        '[class*="question"]',
        '[class*="quiz"]',
        '[class*="test"]',
        ".question-text",
        ".question-block",
        "div",
        "span",
      ];

      const found = new Set();

      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
          if (found.has(element)) return;

          const text = element.textContent.trim();
          if (this.isQuestion(text)) {
            questions.push({ element, text });
            found.add(element);
          }
        });
      });

      this.log(`🔍 Найдено вопросов на странице: ${questions.length}`);
      return questions;
    }

    isQuestion(text) {
      if (!text || text.length < 5 || text.length > 500) return false;

      // Проверяем признаки вопроса
      const hasQuestionMark = text.includes("?") || text.includes("қ:");
      const startsWithNumber =
        /^\d+[\.)]\s/.test(text) || /^сұрақ\s*\d+/i.test(text);
      const hasQuestionWords =
        /^(сұрақ|ақпарат|дерек|қандай|қай|не|қалай|неге|берің|көрсет|табың|анықта)/i.test(
          text
        );

      return hasQuestionMark || startsWithNumber || hasQuestionWords;
    }

    // Сопоставление вопросов
    matchQuestions(pageQuestions) {
      const matches = [];

      pageQuestions.forEach((pageQ) => {
        this.qaData.questions.forEach((jsonQ) => {
          const similarity = this.calculateSimilarity(
            this.normalize(pageQ.text),
            this.normalize(jsonQ.question)
          );

          if (similarity >= this.config.matchThreshold) {
            matches.push({
              pageElement: pageQ.element,
              pageText: pageQ.text,
              answer: jsonQ.answer,
              type: jsonQ.type || "text",
              similarity: similarity,
            });

            if (this.config.debug) {
              this.log(`✅ Совпадение (${Math.round(similarity * 100)}%):`, {
                "Вопрос на странице": pageQ.text.substring(0, 40) + "...",
                "Ответ из Gist": jsonQ.answer,
              });
            }
          }
        });
      });

      this.log(`🎯 Найдено совпадений: ${matches.length}`);
      return matches;
    }

    normalize(text) {
      return text
        .toLowerCase()
        .replace(/[^\wа-яёәіїұқңғүһөӘІҰҚҢҒҮҺӨ\s]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    calculateSimilarity(str1, str2) {
      // Точное включение
      if (str1.includes(str2) || str2.includes(str1)) {
        return 1.0;
      }

      // Сравнение по словам
      const words1 = str1.split(" ").filter((w) => w.length > 2);
      const words2 = str2.split(" ").filter((w) => w.length > 2);

      const commonWords = words1.filter((w) => words2.includes(w)).length;
      const maxWords = Math.max(words1.length, words2.length);

      return maxWords === 0 ? 0 : commonWords / maxWords;
    }

    // Скрытая инъекция (рекомендуется)
    injectHidden(match) {
      const el = match.pageElement;

      // Data атрибуты
      el.setAttribute("data-qa-answer", match.answer);
      el.setAttribute("data-qa-similarity", Math.round(match.similarity * 100));
      el.setAttribute("data-qa-source", "gist");

      // Скрытый span
      const hidden = document.createElement("span");
      hidden.style.display = "none";
      hidden.className = "qa-answer-hidden";
      hidden.textContent = match.answer;
      hidden.setAttribute("data-answer", match.answer);

      el.appendChild(hidden);
    }

    // Тонкая инъекция (иконка 💡)
    injectSubtle(match) {
      const hint = document.createElement("span");
      hint.className = "qa-hint";
      hint.style.cssText = `
                display: inline-block;
                font-size: 12px;
                color: #888;
                opacity: 0.5;
                cursor: help;
                transition: opacity 0.2s;
            `;
      hint.textContent = "💡";
      hint.title = match.answer;

      hint.addEventListener("mouseenter", () => (hint.style.opacity = "1"));
      hint.addEventListener("mouseleave", () => (hint.style.opacity = "0.5"));

      match.pageElement.appendChild(hint);
    }

    // Видимая инъекция (только для тестирования!)
    injectVisible(match) {
      const box = document.createElement("div");
      box.className = "qa-answer-visible";
      box.style.cssText = `
                font-size: 0.95em;
            `;
      box.innerHTML = `
                <span style="">${match.answer}</span>
                <span style="font-size: 0.75em; color: #666; margin-left: 10px;">
                    .
                </span>
            `;

      match.pageElement.parentNode.insertBefore(
        box,
        match.pageElement.nextSibling
      );
    }

    // Автозаполнение полей
    autoFill(match) {
      let current = match.pageElement;
      let input = null;

      // Поиск input вниз по DOM
      for (let i = 0; i < 10; i++) {
        current = current.nextElementSibling;
        if (!current) break;

        input = current.querySelector(
          'input[type="text"], textarea, input:not([type])'
        );
        if (input) break;
      }

      // Поиск внутри элемента
      if (!input) {
        input = match.pageElement.querySelector('input[type="text"], textarea');
      }

      // Поиск в родительском блоке
      if (!input) {
        const parent = match.pageElement.closest(
          ".question-block, .question, div"
        );
        if (parent) {
          input = parent.querySelector('input[type="text"], textarea');
        }
      }

      // Заполняем поле
      if (input) {
        input.value = match.answer;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        this.log("📝 Поле заполнено:", match.answer);
      }
    }

    // Инъекция ответа
    inject(match) {
      switch (this.config.mode) {
        case "hidden":
          this.injectHidden(match);
          break;
        case "subtle":
          this.injectSubtle(match);
          break;
        case "visible":
          this.injectVisible(match);
          break;
      }

      if (this.config.autoFill) {
        this.autoFill(match);
      }
    }

    // Главный метод
    async run() {
      console.log(
        "%c 🚀 QA Gist Injector Start ",
        "color: white; font-size: 16px; padding: 8px;"
      );

      try {
        // 1. Загружаем из Gist
        this.qaData = await this.loadFromGist();

        if (!this.qaData || !this.qaData.questions) {
          console.log(
            "%c ❌ Не удалось загрузить данные из Gist ",
            "background: #f44336; color: white; padding: 5px;"
          );
          return { success: false, message: "Ошибка загрузки Gist" };
        }

        // 2. Ждем задержку
        await new Promise((resolve) => setTimeout(resolve, this.config.delay));

        // 3. Находим вопросы
        const pageQuestions = this.findQuestions();

        if (pageQuestions.length === 0) {
          console.log(
            "%c ❌ Вопросы на странице не найдены ",
            "background: #f44336; color: white; padding: 5px;"
          );
          console.log("💡 Убедитесь что страница загружена полностью");
          return { success: false, message: "Вопросы не найдены" };
        }

        // 4. Сопоставляем
        const matches = this.matchQuestions(pageQuestions);

        if (matches.length === 0) {
          console.log(
            "%c ⚠️ Совпадений не найдено ",
            "background: #ff9800; color: white; padding: 5px;"
          );
          console.log("💡 Попробуйте снизить matchThreshold до 0.4 или 0.5");
          return { success: false, message: "Совпадений не найдено" };
        }

        // 5. Инжектим
        matches.forEach((match, index) => {
          setTimeout(() => this.inject(match), index * 100);
        });

        // 6. Результат
        setTimeout(() => {
          console.log(
            "%c ✅ Инъекция завершена! ",
            "background: #4caf50; color: white; font-size: 14px; padding: 5px;"
          );
          console.log("📊 Статистика:");
          console.log(`   • Вопросов на странице: ${pageQuestions.length}`);
          console.log(`   • Вопросов в Gist: ${this.qaData.questions.length}`);
          console.log(`   • Совпадений найдено: ${matches.length}`);
          console.log(`   • Режим: ${this.config.mode}`);
          console.log(
            `   • Автозаполнение: ${
              this.config.autoFill ? "включено" : "выключено"
            }`
          );

          if (this.config.mode === "hidden") {
            console.log("\n💡 Проверить ответы в консоли:");
            console.log('   document.querySelectorAll("[data-qa-answer]")');
            console.log("\n💡 Посмотреть таблицу с ответами:");
            console.log(
              '   Array.from(document.querySelectorAll("[data-qa-answer]")).map(el => ({'
            );
            console.log("       вопрос: el.textContent.substring(0, 40),");
            console.log('       ответ: el.getAttribute("data-qa-answer")');
            console.log("   }))");
          }
        }, matches.length * 100 + 200);

        return {
          success: true,
          questionsOnPage: pageQuestions.length,
          questionsInGist: this.qaData.questions.length,
          matchesFound: matches.length,
        };
      } catch (error) {
        console.error("❌ Ошибка:", error);
        return { success: false, error: error.message };
      }
    }
  }

  // ============================================
  // АВТОМАТИЧЕСКИЙ ЗАПУСК
  // ============================================

  // Создаем и запускаем инжектор
  const injector = new GistQAInjector(CONFIG);
  injector.run();

  // Сохраняем в window для повторного использования
  window.qaInjector = injector;

  console.log("\n💡 Для повторного запуска: window.qaInjector.run()");
  console.log('💡 Изменить режим: window.qaInjector.config.mode = "visible"');
  console.log(
    "💡 Включить автозаполнение: window.qaInjector.config.autoFill = true"
  );
})();
