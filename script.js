(() => {
  const timerDisplay = document.querySelector("#timer");
  const phaseTitle = document.querySelector("#phase-title");
  const hint = document.querySelector("#hint");
  const startButton = document.querySelector("#start-button");
  const startLabel = document.querySelector("#start-label");
  const resetButton = document.querySelector("#reset-button");
  const progressFill = document.querySelector("#progress-fill");
  const focusInput = document.querySelector("#focus-input");
  const restInput = document.querySelector("#rest-input");
  const settingsMessage = document.querySelector("#settings-message");
  const modeButtons = [...document.querySelectorAll(".mode-button")];
  const reviewTab = document.querySelector("#review-tab");
  const createTab = document.querySelector("#create-tab");
  const reviewPanel = document.querySelector("#review-panel");
  const createPanel = document.querySelector("#create-panel");
  const flashcard = document.querySelector("#flashcard");
  const cardFront = document.querySelector("#card-front");
  const cardBack = document.querySelector("#card-back");
  const flipButton = document.querySelector("#flip-button");
  const reviewActions = document.querySelector("#review-actions");
  const reviewCardArea = document.querySelector("#review-card-area");
  const reviewEmpty = document.querySelector("#review-empty");
  const reviewMeta = document.querySelector("#review-meta");
  const dueCount = document.querySelector("#due-count");
  const flashcardForm = document.querySelector("#flashcard-form");
  const newFront = document.querySelector("#new-front");
  const newBack = document.querySelector("#new-back");
  const formMessage = document.querySelector("#form-message");
  const exportButton = document.querySelector("#export-button");
  const importButton = document.querySelector("#import-button");
  const importInput = document.querySelector("#import-input");
  const backupMessage = document.querySelector("#backup-message");
  const deckSelect = document.querySelector("#deck-select");
  const deleteDeckButton = document.querySelector("#delete-deck-button");
  const deckForm = document.querySelector("#deck-form");
  const deckNameInput = document.querySelector("#deck-name");
  const deckMessage = document.querySelector("#deck-message");
  const selectedDeckName = document.querySelector("#selected-deck-name");
  const cardList = document.querySelector("#card-list");
  const libraryCount = document.querySelector("#library-count");
  const monthlyFocus = document.querySelector("#monthly-focus");
  const weeklyFocus = document.querySelector("#weekly-focus");
  const monthlyFocusState = document.querySelector("#monthly-focus-state");
  const weeklyFocusState = document.querySelector("#weekly-focus-state");
  const monthlyStart = document.querySelector("#monthly-start");
  const monthlyEnd = document.querySelector("#monthly-end");
  const weeklyStart = document.querySelector("#weekly-start");
  const weeklyEnd = document.querySelector("#weekly-end");
  const themeButtons = [...document.querySelectorAll("[data-theme-choice]")];
  const todoForm = document.querySelector("#todo-form");
  const todoEditId = document.querySelector("#todo-edit-id");
  const todoTitleInput = document.querySelector("#todo-title-input");
  const todoStart = document.querySelector("#todo-start");
  const todoEnd = document.querySelector("#todo-end");
  const todoPriority = document.querySelector("#todo-priority");
  const todoSubmit = document.querySelector("#todo-submit");
  const todoCancel = document.querySelector("#todo-cancel");
  const todoList = document.querySelector("#todo-list");
  const todoCount = document.querySelector("#todo-count");
  const todoMessage = document.querySelector("#todo-message");

  const FLASHCARDS_KEY = "ritmo.flashcards.v1";
  const DECKS_KEY = "ritmo.decks.v1";
  const SELECTED_DECK_KEY = "ritmo.selectedDeck.v1";
  const FOCUS_GOALS_KEY = "ritmo.focusGoals.v1";
  const TODO_KEY = "ritmo.todo.v1";
  const THEME_KEY = "ritmo.theme.v1";
  const DAY_MS = 24 * 60 * 60 * 1000;
  const EASY_INTERVALS = [3, 7, 15, 30];
  let decks = loadDecks();
  if (!decks.length) {
    decks = [{ id: "deck-default", name: "Geral" }];
  }
  let selectedDeckId = localStorage.getItem(SELECTED_DECK_KEY);
  if (!decks.some((deck) => deck.id === selectedDeckId)) selectedDeckId = decks[0].id;
  saveDecks();
  let flashcards = loadFlashcards();
  let tasks = loadTasks();
  let selectedTheme = localStorage.getItem(THEME_KEY);
  const migrateLegacyTheme = selectedTheme === "gray";
  if (selectedTheme === "gray") selectedTheme = "blue";
  if (!["white", "pink", "blue", "black"].includes(selectedTheme)) selectedTheme = "black";
  let currentCardId = null;

  const durations = { focus: 25, rest: 5 };
  const hints = { focus: "Um bloco de cada vez. Você consegue.", rest: "Respire fundo. Você merece essa pausa." };
  let mode = "focus";
  let remaining = durations.focus * 60;
  let endAt = 0;
  let intervalId = null;
  let audioContext = null;

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  }

  function applyTheme(theme, persist = true) {
    selectedTheme = theme;
    document.body.dataset.theme = theme;
    themeButtons.forEach((button) => {
      const selected = button.dataset.themeChoice === theme;
      button.setAttribute("aria-pressed", String(selected));
    });
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (error) {
        // Keep the selected theme for this page even if storage is unavailable.
      }
    }
  }

  function loadFocusGoals() {
    try {
      const saved = JSON.parse(localStorage.getItem(FOCUS_GOALS_KEY) || "{}");
      return {
        month: typeof saved.month === "string" ? saved.month : "",
        week: typeof saved.week === "string" ? saved.week : "",
        monthStart: typeof saved.monthStart === "string" ? saved.monthStart : "",
        monthEnd: typeof saved.monthEnd === "string" ? saved.monthEnd : "",
        weekStart: typeof saved.weekStart === "string" ? saved.weekStart : "",
        weekEnd: typeof saved.weekEnd === "string" ? saved.weekEnd : "",
      };
    } catch (error) {
      return { month: "", week: "", monthStart: "", monthEnd: "", weekStart: "", weekEnd: "" };
    }
  }

  function updateFocusDateConstraints() {
    monthlyEnd.min = monthlyStart.value;
    weeklyEnd.min = weeklyStart.value;
    monthlyEnd.setCustomValidity(monthlyStart.value && monthlyEnd.value && monthlyEnd.value < monthlyStart.value
      ? "A data final deve ser igual ou posterior à data de início." : "");
    weeklyEnd.setCustomValidity(weeklyStart.value && weeklyEnd.value && weeklyEnd.value < weeklyStart.value
      ? "A data final deve ser igual ou posterior à data de início." : "");
  }

  function saveFocusGoals() {
    updateFocusDateConstraints();
    try {
      localStorage.setItem(FOCUS_GOALS_KEY, JSON.stringify({
        month: monthlyFocus.value,
        week: weeklyFocus.value,
        monthStart: monthlyStart.value,
        monthEnd: monthlyEnd.value,
        weekStart: weeklyStart.value,
        weekEnd: weeklyEnd.value,
      }));
      monthlyFocusState.textContent = monthlyEnd.validity.valid ? "Salvo automaticamente" : "A data final deve ser após o início";
      weeklyFocusState.textContent = weeklyEnd.validity.valid ? "Salvo automaticamente" : "A data final deve ser após o início";
    } catch (error) {
      monthlyFocusState.textContent = "Não foi possível salvar";
      weeklyFocusState.textContent = "Não foi possível salvar";
    }
  }

  function render() {
    timerDisplay.textContent = formatTime(remaining);
    timerDisplay.setAttribute("aria-label", `${Math.floor(remaining / 60)} minutos e ${remaining % 60} segundos restantes`);
    document.title = `${formatTime(remaining)} — ${mode === "focus" ? "Foco" : "Repouso"} | Ritmo`;
    const total = durations[mode] * 60;
    progressFill.style.width = `${Math.max(0, Math.min(100, ((total - remaining) / total) * 100))}%`;
  }

  function updateModeButtons() {
    modeButtons.forEach((button) => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.body.dataset.mode = mode;
    phaseTitle.textContent = mode === "focus" ? "HORA DE CONCENTRAR" : "HORA DE RESPIRAR";
    hint.textContent = hints[mode];
    startLabel.textContent = mode === "focus" ? "Começar foco" : "Começar repouso";
  }

  function stop() {
    if (intervalId !== null) window.clearInterval(intervalId);
    intervalId = null;
    startButton.classList.remove("is-running");
    startButton.setAttribute("aria-label", "Iniciar temporizador");
    startLabel.textContent = mode === "focus" ? "Começar foco" : "Começar repouso";
  }

  function bell() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioContext ??= new AudioContextClass();
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      [0, 0.24, 0.48].forEach((delay, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(index === 1 ? 880 : 1046.5, now + delay);
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.22, now + delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.15);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now + delay);
        oscillator.stop(now + delay + 1.2);
      });
    } catch (error) {
      // Audio is optional; some browsers block it until the user interacts with the page.
    }
  }

  function finishPhase() {
    stop();
    bell();
    mode = mode === "focus" ? "rest" : "focus";
    remaining = durations[mode] * 60;
    updateModeButtons();
    render();
    startButton.focus();
  }

  function tick() {
    remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    render();
    if (remaining <= 0) finishPhase();
  }

  function toggleTimer() {
    if (intervalId !== null) {
      remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      stop();
      render();
      return;
    }
    if (remaining <= 0) remaining = durations[mode] * 60;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext ??= new AudioContextClass();
        if (audioContext.state === "suspended") audioContext.resume();
      }
    } catch (error) {
      // The timer still works when audio is unavailable.
    }
    endAt = Date.now() + remaining * 1000;
    startButton.classList.add("is-running");
    startButton.setAttribute("aria-label", "Pausar temporizador");
    startLabel.textContent = "Pausar";
    intervalId = window.setInterval(tick, 200);
  }

  function selectMode(nextMode) {
    if (nextMode === mode) return;
    stop();
    mode = nextMode;
    remaining = durations[mode] * 60;
    updateModeButtons();
    render();
  }

  function applyDuration(input, key, max) {
    const value = Number.parseInt(input.value, 10);
    if (!Number.isFinite(value) || value < 1 || value > max) {
      input.value = durations[key];
      settingsMessage.textContent = `Use um valor entre 1 e ${max} minutos.`;
      return;
    }
    durations[key] = value;
    input.value = value;
    settingsMessage.textContent = "Tempos atualizados. Ajuste quando quiser.";
    if (mode === key && intervalId === null) {
      remaining = value * 60;
      render();
    }
  }

  function loadFlashcards() {
    try {
      const saved = JSON.parse(localStorage.getItem(FLASHCARDS_KEY) || "[]");
      return Array.isArray(saved) ? saved.filter(isValidCard).map((card) => ({
        ...card,
        deckId: decks.some((deck) => deck.id === card.deckId) ? card.deckId : decks[0].id,
      })) : [];
    } catch (error) {
      return [];
    }
  }

  function loadDecks() {
    try {
      const saved = JSON.parse(localStorage.getItem(DECKS_KEY) || "[]");
      return Array.isArray(saved) ? saved.filter((deck) => deck && typeof deck.id === "string" && typeof deck.name === "string") : [];
    } catch (error) {
      return [];
    }
  }

  function saveDecks() {
    try {
      localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
      localStorage.setItem(SELECTED_DECK_KEY, selectedDeckId || decks[0]?.id || "");
      return true;
    } catch (error) {
      return false;
    }
  }

  function makeId(prefix) {
    return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  }

  function loadTasks() {
    try {
      const saved = JSON.parse(localStorage.getItem(TODO_KEY) || "[]");
      return Array.isArray(saved) ? saved.filter((task) => task && typeof task.id === "string"
        && typeof task.title === "string" && typeof task.startDate === "string" && typeof task.endDate === "string"
        && ["urgent", "attention", "relaxed"].includes(task.priority)) : [];
    } catch (error) {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(TODO_KEY, JSON.stringify(tasks));
      return true;
    } catch (error) {
      todoMessage.textContent = "Não foi possível salvar as tasks neste navegador.";
      return false;
    }
  }

  function dateToDayNumber(dateString) {
    if (!dateString) return NaN;
    const [year, month, day] = dateString.split("-").map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
  }

  function updateTodoDateConstraints() {
    todoEnd.min = todoStart.value;
    todoStart.max = todoEnd.value;
    const invalidPeriod = todoStart.value && todoEnd.value && todoEnd.value < todoStart.value;
    todoEnd.setCustomValidity(invalidPeriod ? "A data final deve ser igual ou posterior à data de início." : "");
    todoStart.setCustomValidity(invalidPeriod ? "A data de início deve ser anterior à data final." : "");
  }

  function taskCountdown(task) {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const today = dateToDayNumber(todayKey);
    const startDelta = dateToDayNumber(task.startDate) - today;
    const endDelta = dateToDayNumber(task.endDate) - today;
    if (startDelta > 0) return `Começa em ${startDelta} ${startDelta === 1 ? "dia" : "dias"} · prazo em ${endDelta} ${endDelta === 1 ? "dia" : "dias"}`;
    if (endDelta < 0) return `Prazo vencido há ${Math.abs(endDelta)} ${Math.abs(endDelta) === 1 ? "dia" : "dias"}`;
    if (endDelta === 0) return "Prazo termina hoje";
    return `Faltam ${endDelta} ${endDelta === 1 ? "dia" : "dias"} para o prazo`;
  }

  function renderTasks() {
    todoList.replaceChildren();
    todoCount.textContent = tasks.length;
    todoCount.setAttribute("aria-label", `${tasks.length} ${tasks.length === 1 ? "task cadastrada" : "tasks cadastradas"}`);
    if (!tasks.length) {
      const empty = document.createElement("p");
      empty.className = "todo-empty";
      empty.textContent = "Suas tasks aparecerão aqui. Adicione a primeira acima.";
      todoList.append(empty);
      return;
    }
    const labels = { urgent: "Urgente", attention: "Atenção", relaxed: "Sem pressa" };
    const priorityOrder = { urgent: 0, attention: 1, relaxed: 2 };
    [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      || a.endDate.localeCompare(b.endDate)).forEach((task) => {
      const item = document.createElement("article");
      item.className = "todo-item";
      const copy = document.createElement("div");
      copy.className = "todo-item-copy";
      const title = document.createElement("h2");
      title.className = "todo-item-title";
      title.textContent = task.title;
      const dates = document.createElement("p");
      dates.className = "todo-item-dates";
      dates.textContent = `${new Date(`${task.startDate}T12:00:00`).toLocaleDateString("pt-BR")} – ${new Date(`${task.endDate}T12:00:00`).toLocaleDateString("pt-BR")}`;
      const countdown = document.createElement("p");
      countdown.className = "todo-countdown";
      countdown.textContent = taskCountdown(task);
      const priority = document.createElement("span");
      priority.className = `todo-priority priority-${task.priority}`;
      priority.textContent = labels[task.priority];
      const actions = document.createElement("div");
      actions.className = "todo-item-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "todo-edit-button";
      edit.textContent = "Editar";
      edit.setAttribute("aria-label", `Editar task: ${task.title}`);
      edit.addEventListener("click", () => editTask(task));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "todo-delete-button";
      remove.textContent = "Excluir";
      remove.setAttribute("aria-label", `Excluir task: ${task.title}`);
      remove.addEventListener("click", () => deleteTask(task));
      copy.append(title, dates, countdown);
      actions.append(edit, remove);
      item.append(copy, priority, actions);
      todoList.append(item);
    });
  }

  function resetTodoForm() {
    todoForm.reset();
    todoEditId.value = "";
    todoSubmit.textContent = "Adicionar task";
    todoCancel.hidden = true;
    todoMessage.textContent = "";
    updateTodoDateConstraints();
  }

  function editTask(task) {
    todoEditId.value = task.id;
    todoTitleInput.value = task.title;
    todoStart.value = task.startDate;
    todoEnd.value = task.endDate;
    todoPriority.value = task.priority;
    todoSubmit.textContent = "Salvar alterações";
    todoCancel.hidden = false;
    todoMessage.textContent = "Editando task.";
    updateTodoDateConstraints();
    todoTitleInput.focus();
    todoForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function deleteTask(task) {
    if (!window.confirm(`Excluir a task “${task.title}”?`)) return;
    tasks = tasks.filter((item) => item.id !== task.id);
    saveTasks();
    if (todoEditId.value === task.id) resetTodoForm();
    renderTasks();
  }

  function saveTask(event) {
    event.preventDefault();
    updateTodoDateConstraints();
    if (!todoForm.reportValidity()) return;
    const title = todoTitleInput.value.trim();
    if (!title) {
      todoTitleInput.setCustomValidity("Informe o nome da task.");
      todoTitleInput.reportValidity();
      todoTitleInput.setCustomValidity("");
      return;
    }
    const existing = tasks.find((task) => task.id === todoEditId.value);
    const task = {
      id: existing?.id || makeId("task"),
      title,
      startDate: todoStart.value,
      endDate: todoEnd.value,
      priority: todoPriority.value,
      createdAt: existing?.createdAt || Date.now(),
    };
    if (existing) tasks = tasks.map((item) => item.id === task.id ? task : item);
    else tasks.push(task);
    if (saveTasks()) {
      resetTodoForm();
      todoMessage.textContent = existing ? "Task atualizada." : "Task adicionada.";
    }
    renderTasks();
  }

  function isValidCard(card) {
    return card && typeof card.id === "string" && typeof card.front === "string" && typeof card.back === "string"
      && Number.isFinite(card.nextReview) && Number.isFinite(card.stage);
  }

  function saveFlashcards() {
    try {
      localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(flashcards));
      return true;
    } catch (error) {
      backupMessage.textContent = "Não foi possível salvar. Exporte um backup para guardar seus cartões.";
      return false;
    }
  }

  function dueFlashcards() {
    const now = Date.now();
    return flashcards.filter((card) => card.deckId === selectedDeckId && card.nextReview <= now).sort((a, b) => a.nextReview - b.nextReview);
  }

  function renderFlashcards() {
    renderDeckManager();
    const due = dueFlashcards();
    const selectedDeckCards = flashcards.filter((card) => card.deckId === selectedDeckId);
    dueCount.textContent = due.length;
    dueCount.setAttribute("aria-label", `${due.length} ${due.length === 1 ? "cartão" : "cartões"} para revisar hoje`);
    const currentCard = due.find((card) => card.id === currentCardId) || due[0];
    currentCardId = currentCard?.id ?? null;
    reviewMeta.textContent = due.length ? `${due.length} ${due.length === 1 ? "cartão para revisar" : "cartões para revisar"}` : "Sua fila de revisão";
    reviewCardArea.hidden = !currentCard;
    reviewEmpty.hidden = Boolean(currentCard);
    libraryCount.textContent = selectedDeckCards.length;
    selectedDeckName.textContent = decks.find((deck) => deck.id === selectedDeckId)?.name || "Geral";
    renderCardLibrary(selectedDeckCards);
    if (currentCard) {
      cardFront.textContent = currentCard.front;
      cardBack.textContent = currentCard.back;
      flashcard.classList.remove("is-flipped");
      flipButton.hidden = false;
      reviewActions.hidden = true;
    }
  }

  function renderDeckManager() {
    deckSelect.replaceChildren();
    decks.forEach((deck) => {
      const option = document.createElement("option");
      option.value = deck.id;
      option.textContent = deck.name;
      option.selected = deck.id === selectedDeckId;
      deckSelect.append(option);
    });
    deleteDeckButton.disabled = decks.length === 0;
  }

  function renderCardLibrary(cards) {
    cardList.replaceChildren();
    if (!cards.length) {
      const empty = document.createElement("p");
      empty.className = "card-list-empty";
      empty.textContent = "Este baralho ainda não tem cartões.";
      cardList.append(empty);
      return;
    }
    [...cards].sort((a, b) => a.nextReview - b.nextReview).forEach((card) => {
      const row = document.createElement("div");
      row.className = "card-list-item";
      const copy = document.createElement("div");
      copy.className = "card-list-copy";
      const front = document.createElement("div");
      front.className = "card-list-front";
      front.textContent = card.front;
      const due = document.createElement("div");
      due.className = "card-list-due";
      due.textContent = card.nextReview <= Date.now() ? "Disponível para revisar" : `Próxima revisão: ${new Date(card.nextReview).toLocaleDateString("pt-BR")}`;
      const remove = document.createElement("button");
      remove.className = "delete-card-button";
      remove.type = "button";
      remove.textContent = "Excluir";
      remove.setAttribute("aria-label", `Excluir cartão: ${card.front.slice(0, 60)}`);
      remove.addEventListener("click", () => deleteFlashcard(card));
      copy.append(front, due);
      row.append(copy, remove);
      cardList.append(row);
    });
  }

  function showFlashcardTab(tab) {
    const reviewing = tab === "review";
    reviewTab.classList.toggle("active", reviewing);
    createTab.classList.toggle("active", !reviewing);
    reviewTab.setAttribute("aria-selected", String(reviewing));
    createTab.setAttribute("aria-selected", String(!reviewing));
    reviewPanel.hidden = !reviewing;
    createPanel.hidden = reviewing;
    if (!reviewing) newFront.focus();
  }

  function createFlashcard(event) {
    event.preventDefault();
    const front = newFront.value.trim();
    const back = newBack.value.trim();
    if (!front || !back) {
      formMessage.textContent = "Preencha a frente e o verso do cartão.";
      return;
    }
    const card = {
      id: makeId("card"),
      front,
      back,
      deckId: selectedDeckId,
      createdAt: Date.now(),
      nextReview: Date.now() + DAY_MS,
      stage: 0,
    };
    flashcards.push(card);
    saveFlashcards();
    flashcardForm.reset();
    formMessage.textContent = "Cartão salvo. Ele aparecerá para revisão em 24 horas.";
    renderFlashcards();
    showFlashcardTab("review");
  }

  function answerCard(wasEasy) {
    const card = flashcards.find((item) => item.id === currentCardId);
    if (!card) return;
    if (wasEasy) {
      const intervalDays = EASY_INTERVALS[Math.min(card.stage, EASY_INTERVALS.length - 1)];
      card.nextReview = Date.now() + intervalDays * DAY_MS;
      card.stage = Math.min(card.stage + 1, EASY_INTERVALS.length - 1);
    } else {
      card.nextReview = Date.now() + DAY_MS;
    }
    saveFlashcards();
    currentCardId = null;
    renderFlashcards();
  }

  function createDeck(event) {
    event.preventDefault();
    const name = deckNameInput.value.trim();
    if (!name) return;
    if (decks.some((deck) => deck.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
      deckMessage.textContent = "Já existe um baralho com esse nome.";
      return;
    }
    const deck = { id: makeId("deck"), name };
    decks.push(deck);
    selectedDeckId = deck.id;
    deckNameInput.value = "";
    deckMessage.textContent = `Baralho “${name}” criado.`;
    saveDecks();
    currentCardId = null;
    renderFlashcards();
  }

  function deleteFlashcard(card) {
    if (!window.confirm(`Excluir este flashcard?\n\n${card.front.slice(0, 120)}`)) return;
    flashcards = flashcards.filter((item) => item.id !== card.id);
    if (currentCardId === card.id) currentCardId = null;
    saveFlashcards();
    renderFlashcards();
    backupMessage.textContent = "Flashcard excluído.";
  }

  function deleteSelectedDeck() {
    const deck = decks.find((item) => item.id === selectedDeckId);
    if (!deck) return;
    const cardCount = flashcards.filter((card) => card.deckId === deck.id).length;
    const cardText = cardCount === 1 ? "1 flashcard" : `${cardCount} flashcards`;
    if (!window.confirm(`Excluir o baralho “${deck.name}” e ${cardText}? Essa ação não pode ser desfeita.`)) return;
    decks = decks.filter((item) => item.id !== deck.id);
    flashcards = flashcards.filter((card) => card.deckId !== deck.id);
    if (!decks.length) decks.push({ id: makeId("deck"), name: "Geral" });
    selectedDeckId = decks[0].id;
    currentCardId = null;
    saveDecks();
    saveFlashcards();
    deckMessage.textContent = `Baralho “${deck.name}” excluído.`;
    renderFlashcards();
  }

  function exportBackup() {
    const backup = {
      format: "myfocus-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      decks,
      cards: flashcards,
      selectedDeckId,
      tasks,
      focusGoals: {
        month: monthlyFocus.value,
        week: weeklyFocus.value,
        monthStart: monthlyStart.value,
        monthEnd: monthlyEnd.value,
        weekStart: weeklyStart.value,
        weekEnd: weeklyEnd.value,
      },
      theme: selectedTheme,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `myfocus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    backupMessage.textContent = `Backup exportado: ${flashcards.length} flashcards e ${tasks.length} tasks, além dos baralhos, focos e tema. Guarde o arquivo em outro local.`;
  }

  function isValidTask(task) {
    return task && typeof task.id === "string" && typeof task.title === "string"
      && typeof task.startDate === "string" && typeof task.endDate === "string"
      && ["urgent", "attention", "relaxed"].includes(task.priority);
  }

  async function importBackup() {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const imported = Array.isArray(parsed) ? parsed : parsed.cards;
      const importedTasks = !Array.isArray(parsed) && Array.isArray(parsed.tasks) ? parsed.tasks : [];
      const hasCardData = Array.isArray(imported);
      const hasTaskData = !Array.isArray(parsed) && Array.isArray(parsed.tasks);
      if (!hasCardData && !hasTaskData) throw new Error("Formato inválido");
      const validSourceCards = hasCardData ? imported.filter(isValidCard) : [];
      const validSourceTasks = importedTasks.filter(isValidTask);
      if (hasCardData && validSourceCards.length === 0 && imported.length > 0 && validSourceTasks.length === 0) {
        throw new Error("Nenhum dado válido");
      }
      const importedDecks = !Array.isArray(parsed) && Array.isArray(parsed.decks)
        ? parsed.decks.filter((deck) => deck && typeof deck.id === "string" && typeof deck.name === "string" && deck.name.trim())
        : [];
      const deckIdMap = new Map();
      importedDecks.forEach((importedDeck) => {
        const normalizedName = importedDeck.name.trim().toLocaleLowerCase("pt-BR");
        const matchingDeck = decks.find((deck) => deck.id === importedDeck.id)
          || decks.find((deck) => deck.name.toLocaleLowerCase("pt-BR") === normalizedName);
        if (matchingDeck) {
          deckIdMap.set(importedDeck.id, matchingDeck.id);
        } else {
          const newDeck = { id: makeId("deck"), name: importedDeck.name.trim() };
          decks.push(newDeck);
          deckIdMap.set(importedDeck.id, newDeck.id);
        }
      });
      const fallbackDeckId = deckIdMap.values().next().value || selectedDeckId || decks[0].id;
      const validCards = validSourceCards.map((card) => ({
        ...card,
        deckId: deckIdMap.get(card.deckId) || (decks.some((deck) => deck.id === card.deckId) ? card.deckId : fallbackDeckId),
        stage: Math.max(0, Math.min(EASY_INTERVALS.length - 1, Math.floor(card.stage))),
      }));
      const seenIds = new Set(flashcards.map((card) => card.id));
      const newCards = validCards.filter((card) => {
        if (seenIds.has(card.id)) return false;
        seenIds.add(card.id);
        return true;
      });
      flashcards = [...flashcards, ...newCards];

      const seenTaskIds = new Set(tasks.map((task) => task.id));
      const newTasks = validSourceTasks.filter((task) => {
        if (seenTaskIds.has(task.id)) return false;
        seenTaskIds.add(task.id);
        return true;
      });
      tasks = [...tasks, ...newTasks];

      const importedSelection = !Array.isArray(parsed) && typeof parsed.selectedDeckId === "string"
        ? deckIdMap.get(parsed.selectedDeckId) || (decks.some((deck) => deck.id === parsed.selectedDeckId) ? parsed.selectedDeckId : null)
        : null;
      if (importedSelection) selectedDeckId = importedSelection;
      saveDecks();
      saveFlashcards();

      if (newTasks.length || hasTaskData) saveTasks();
      if (!Array.isArray(parsed) && parsed.focusGoals && typeof parsed.focusGoals === "object") {
        const goals = parsed.focusGoals;
        monthlyFocus.value = typeof goals.month === "string" ? goals.month : "";
        weeklyFocus.value = typeof goals.week === "string" ? goals.week : "";
        monthlyStart.value = typeof goals.monthStart === "string" ? goals.monthStart : "";
        monthlyEnd.value = typeof goals.monthEnd === "string" ? goals.monthEnd : "";
        weeklyStart.value = typeof goals.weekStart === "string" ? goals.weekStart : "";
        weeklyEnd.value = typeof goals.weekEnd === "string" ? goals.weekEnd : "";
        saveFocusGoals();
      }
      if (!Array.isArray(parsed) && ["white", "pink", "blue", "gray", "black"].includes(parsed.theme)) {
        applyTheme(parsed.theme === "gray" ? "blue" : parsed.theme);
      }

      currentCardId = null;
      renderFlashcards();
      renderTasks();
      const importedParts = [];
      if (newCards.length || hasCardData) importedParts.push(`${newCards.length} flashcards`);
      if (newTasks.length || hasTaskData) importedParts.push(`${newTasks.length} tasks`);
      backupMessage.textContent = importedParts.length
        ? `Backup importado: ${importedParts.join(" e ")} adicionados; itens com IDs duplicados foram ignorados.`
        : "Nenhum dado novo encontrado; os itens duplicados foram ignorados.";
    } catch (error) {
      backupMessage.textContent = "Não foi possível importar. Selecione um backup JSON válido do MyFocus.";
    } finally {
      importInput.value = "";
    }
  }

  startButton.addEventListener("click", toggleTimer);
  resetButton.addEventListener("click", () => {
    stop();
    remaining = durations[mode] * 60;
    render();
  });
  modeButtons.forEach((button) => button.addEventListener("click", () => selectMode(button.dataset.mode)));
  focusInput.addEventListener("change", () => applyDuration(focusInput, "focus", 180));
  restInput.addEventListener("change", () => applyDuration(restInput, "rest", 60));
  reviewTab.addEventListener("click", () => showFlashcardTab("review"));
  createTab.addEventListener("click", () => showFlashcardTab("create"));
  flashcardForm.addEventListener("submit", createFlashcard);
  flipButton.addEventListener("click", () => {
    flashcard.classList.add("is-flipped");
    flipButton.hidden = true;
    reviewActions.hidden = false;
  });
  document.querySelector("#easy-button").addEventListener("click", () => answerCard(true));
  document.querySelector("#wrong-button").addEventListener("click", () => answerCard(false));
  exportButton.addEventListener("click", exportBackup);
  importButton.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", importBackup);
  const focusGoals = loadFocusGoals();
  monthlyFocus.value = focusGoals.month;
  weeklyFocus.value = focusGoals.week;
  monthlyStart.value = focusGoals.monthStart;
  monthlyEnd.value = focusGoals.monthEnd;
  weeklyStart.value = focusGoals.weekStart;
  weeklyEnd.value = focusGoals.weekEnd;
  updateFocusDateConstraints();
  [monthlyFocus, weeklyFocus, monthlyStart, monthlyEnd, weeklyStart, weeklyEnd].forEach((input) => {
    input.addEventListener("input", saveFocusGoals);
    input.addEventListener("change", saveFocusGoals);
  });
  deckForm.addEventListener("submit", createDeck);
  deckSelect.addEventListener("change", () => {
    selectedDeckId = deckSelect.value;
    currentCardId = null;
    saveDecks();
    deckMessage.textContent = "Baralho selecionado.";
    renderFlashcards();
  });
  deleteDeckButton.addEventListener("click", deleteSelectedDeck);
  themeButtons.forEach((button) => button.addEventListener("click", () => applyTheme(button.dataset.themeChoice)));
  todoForm.addEventListener("submit", saveTask);
  todoCancel.addEventListener("click", resetTodoForm);
  todoStart.addEventListener("input", updateTodoDateConstraints);
  todoEnd.addEventListener("input", updateTodoDateConstraints);

  applyTheme(selectedTheme, migrateLegacyTheme);
  updateModeButtons();
  render();
  renderFlashcards();
  renderTasks();
  window.setInterval(renderTasks, 60 * 1000);
})();
