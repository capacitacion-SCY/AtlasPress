function fillCategoryOptions(categories) {
  const select = document.querySelector('#storyForm select[name="category"]');
  if (!select) return;

  select.innerHTML = categories.map((category) => `<option value="${category}">${category}</option>`).join("");
}

function getField(form, name) {
  return form?.elements.namedItem(name);
}

const ADS_PAGE_SIZE = 8;
const DEFAULT_ADMIN_TAB = "quick-settings";
const adsViewState = {
  query: "",
  sort: "recent",
  page: 1
};

const ROLE_CONFIG = {
  admin: {
    label: "Administrador",
    permissions: ["stories", "settings", "impact", "ads", "users"]
  },
  editor: {
    label: "Editor",
    permissions: ["stories", "settings", "impact", "ads"]
  },
  redactor: {
    label: "Redactor",
    permissions: ["stories"]
  },
  publicidad: {
    label: "Publicidad",
    permissions: ["ads"]
  },
  revisor: {
    label: "Revisor",
    permissions: ["stories"]
  }
};

const PERMISSION_LABELS = {
  stories: "Notas",
  settings: "Ajustes rapidos",
  impact: "Franja de impacto",
  ads: "Publicidad",
  users: "Usuarios"
};

const TAB_PERMISSIONS = {
  "quick-settings": "settings",
  "story-editor": "stories",
  "ad-editor": "ads",
  "impact-strip": "impact",
  "stories-library": "stories",
  "active-ads": "ads",
  "import-export": "stories",
  "account-settings": null,
  "editorial-team": "users"
};

function formatLockRemaining(lockedUntil) {
  const remainingMs = Math.max(0, Number(lockedUntil) - Date.now());
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  return remainingMinutes <= 1 ? "1 minuto" : `${remainingMinutes} minutos`;
}

function setLoginStatus(message = "", tone = "muted") {
  const target = document.getElementById("loginStatus");
  if (!target) return;

  target.textContent = message;
  target.classList.toggle("hidden", !message);
  target.dataset.tone = tone;
}

function refreshLoginStateUI() {
  const loginForm = document.getElementById("loginForm");
  const submitButton = loginForm?.querySelector('button[type="submit"]');
  const { lockedUntil } = getAuthLockState();
  const isLocked = Boolean(lockedUntil && lockedUntil > Date.now());

  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = isLocked;
    submitButton.textContent = isLocked ? "Acceso temporalmente bloqueado" : "Entrar";
  }

  if (isLocked) {
    setLoginStatus(`Demasiados intentos fallidos. Espera ${formatLockRemaining(lockedUntil)} antes de volver a intentar.`, "warning");
    return;
  }

  setLoginStatus("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getBackupDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function exportStoriesBackup() {
  const data = getSiteData();
  downloadJsonFile(`atlas-publicaciones-${getBackupDateStamp()}.json`, {
    type: "atlas-stories",
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    site: data.settings.siteName,
    stories: data.stories
  });
}

function exportFullBackup() {
  const data = getSiteData();
  downloadJsonFile(`atlas-backup-completo-${getBackupDateStamp()}.json`, {
    type: "atlas-full-backup",
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    data
  });
}

function normalizeImportedStory(story, index = 0) {
  const title = String(story?.title || "").trim();
  const content = String(story?.content || "").trim();
  if (!title || !content) return null;

  return {
    id: String(story.id || `story-import-${Date.now()}-${index}`).trim(),
    title,
    excerpt: String(story.excerpt || "").trim() || title,
    category: String(story.category || "Historias").trim(),
    author: String(story.author || "Redaccion").trim(),
    image: sanitizeUrl(story.image || ""),
    videoUrl: sanitizeUrl(story.videoUrl || ""),
    featured: Boolean(story.featured),
    editorsPick: Boolean(story.editorsPick),
    featuredTextPosition: ["auto", "left", "right"].includes(story.featuredTextPosition) ? story.featuredTextPosition : "auto",
    publishedAt: story.publishedAt || toDateTimeLocalValue(new Date().toISOString()),
    featuredOrder: story.featuredOrder ? Number(story.featuredOrder) : null,
    content,
    sourceLabel: String(story.sourceLabel || "").trim(),
    sourceUrl: sanitizeUrl(story.sourceUrl || "")
  };
}

function extractStoriesFromImportPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.stories)) return payload.stories;
  if (Array.isArray(payload?.data?.stories)) return payload.data.stories;
  return [];
}

function analyzeImportPayload(payload) {
  const currentData = getSiteData();
  const currentIds = new Set(currentData.stories.map((story) => story.id));
  const rawStories = extractStoriesFromImportPayload(payload);
  const stories = rawStories
    .map((story, index) => normalizeImportedStory(story, index))
    .filter(Boolean);
  const categories = [...new Set(stories.map((story) => story.category))];
  const duplicateIds = stories.filter((story) => currentIds.has(story.id)).map((story) => story.id);

  return {
    rawCount: rawStories.length,
    validCount: stories.length,
    invalidCount: rawStories.length - stories.length,
    categories,
    duplicateIds,
    stories
  };
}

function renderImportPreview(analysis) {
  const target = document.getElementById("importPreview");
  if (!target) return;

  target.classList.remove("hidden");
  target.innerHTML = `
    <div>
      <strong>${analysis.validCount}</strong>
      <span>notas validas</span>
    </div>
    <div>
      <strong>${analysis.duplicateIds.length}</strong>
      <span>coinciden por ID</span>
    </div>
    <div>
      <strong>${analysis.categories.length}</strong>
      <span>categorias detectadas</span>
    </div>
    <div>
      <strong>${analysis.invalidCount}</strong>
      <span>registros omitidos</span>
    </div>
  `;
}

function applyStoriesImport(stories, mode) {
  const data = getSiteData();
  const importedIds = new Set(stories.map((story) => story.id));
  const existingById = new Map(data.stories.map((story) => [story.id, story]));
  let added = 0;
  let updated = 0;
  let skipped = 0;

  if (mode === "replace") {
    data.stories = stories;
    added = stories.length;
  } else {
    stories.forEach((story) => {
      if (existingById.has(story.id)) {
        if (mode === "upsert") {
          const index = data.stories.findIndex((item) => item.id === story.id);
          data.stories[index] = story;
          updated += 1;
        } else {
          skipped += 1;
        }
        return;
      }

      data.stories.unshift(story);
      added += 1;
    });
  }

  data.categories = mergeCategories([
    ...data.categories,
    ...stories.map((story) => story.category)
  ]);

  if (mode === "replace") {
    data.stories = data.stories.filter((story) => importedIds.has(story.id));
  }

  setSiteData(data);
  return { added, updated, skipped, total: stories.length };
}

function defaultPermissionsForRole(role) {
  return [...(ROLE_CONFIG[role]?.permissions || ROLE_CONFIG.editor.permissions)];
}

function getRoleLabel(role) {
  return ROLE_CONFIG[role]?.label || "Usuario";
}

function getUserPermissions(user) {
  if (!user) return [];
  if (Array.isArray(user.permissions) && user.permissions.length) {
    return [...new Set(user.permissions)];
  }

  return defaultPermissionsForRole(user.role);
}

function getCurrentUserRecord() {
  const session = getSession();
  if (!session) return null;
  const data = getSiteData();
  return data.users.find((user) => user.username === session.username && user.active !== false) || null;
}

function hasPermission(permission) {
  if (!permission) return true;
  const user = getCurrentUserRecord();
  if (!user) return false;
  return getUserPermissions(user).includes(permission);
}

function setActiveAdminTab(tabId) {
  const tabButtons = document.querySelectorAll("[data-tab-target]");
  const tabPanels = document.querySelectorAll("[data-tab-panel]");

  tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabTarget === tabId);
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.tabPanel === tabId);
  });
}

function getFirstAvailableTab() {
  const buttons = Array.from(document.querySelectorAll("[data-tab-target]"));
  const availableButton = buttons.find((button) => !button.hidden);
  return availableButton?.dataset.tabTarget || DEFAULT_ADMIN_TAB;
}

function switchAdminTab(tabId) {
  if (!hasPermission(TAB_PERMISSIONS[tabId])) {
    setActiveAdminTab(getFirstAvailableTab());
    return;
  }

  setActiveAdminTab(tabId);
}

function applyPermissionVisibility() {
  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    const permission = TAB_PERMISSIONS[button.dataset.tabTarget];
    button.hidden = !hasPermission(permission);
  });

  const activeButton = document.querySelector("[data-tab-target].is-active:not([hidden])");
  if (!activeButton) {
    setActiveAdminTab(getFirstAvailableTab());
  }
}

function initializeAdminTabs() {
  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    button.addEventListener("click", () => {
      switchAdminTab(button.dataset.tabTarget);
    });
  });
}

function bindImagePickerToField(form, fileFieldName, targetFieldName) {
  const fileInput = getField(form, fileFieldName);
  const imageInput = getField(form, targetFieldName);
  if (!fileInput || !imageInput) return;

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      window.alert("Elegi un archivo de imagen valido.");
      fileInput.value = "";
      return;
    }

    const maxSize = 900 * 1024;
    if (file.size > maxSize) {
      window.alert("Para esta demo, usa una imagen menor a 900 KB. En produccion la subiremos a Supabase Storage.");
      fileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      imageInput.value = String(reader.result);
    });
    reader.readAsDataURL(file);
  });
}

function bindImagePicker(form) {
  bindImagePickerToField(form, "imageFile", "image");
}

function renderImpactSettingsPreview(url = "") {
  const frame = document.getElementById("impactPreviewFrame");
  if (!frame) return;

  if (isDirectImageUrl(url)) {
    frame.innerHTML = "";
    frame.style.backgroundImage = `linear-gradient(180deg, rgba(255,252,247,0.34), rgba(255,252,247,0.56)), url("${url}")`;
    frame.style.backgroundSize = "cover";
    frame.style.backgroundPosition = "center";
    frame.style.backgroundRepeat = "no-repeat";
    return;
  }

  frame.style.backgroundImage = "none";
  frame.innerHTML = `<span class="impact-preview__empty">Todavia no hay imagen cargada.</span>`;
}

function renderStoriesTable() {
  const data = getSiteData();
  const target = document.getElementById("storiesTable");
  if (!target) return;

  const stories = getSortedStories(data);
  if (!stories.length) {
    target.innerHTML = `<div class="empty-state">Todavia no hay notas cargadas.</div>`;
    return;
  }

  target.innerHTML = stories.map((story) => `
    <article class="story-row story-library-row">
      <div class="story-library-row__thumb">
        ${isDirectImageUrl(story.image)
          ? `<img src="${sanitizeUrl(story.image)}" alt="${escapeHtml(story.title)}">`
          : `<span>${escapeHtml(story.category || "Nota")}</span>`}
      </div>
      <div class="story-library-row__content">
        <strong>${escapeHtml(story.title)}</strong>
        <p>${escapeHtml(story.excerpt)}</p>
        <div class="story-library-row__meta">
          <span>${escapeHtml(story.category)}</span>
          <span>${formatDate(story.publishedAt)}</span>
        </div>
      </div>
      <div class="story-row__actions">
        <a class="button button--ghost" href="${createStoryLink(story)}">Ver</a>
        <button type="button" class="button button--ghost" data-duplicate-id="${story.id}">Duplicar</button>
        <button type="button" class="button button--ghost" data-edit-id="${story.id}">Editar</button>
        <button type="button" class="button button--ghost" data-delete-id="${story.id}">Borrar</button>
      </div>
    </article>
  `).join("");
}

function renderAdsTable() {
  const data = getSiteData();
  const target = document.getElementById("adsTable");
  const countLabel = document.getElementById("adsCountLabel");
  const pageLabel = document.getElementById("adsPageLabel");
  const prevButton = document.getElementById("adsPrevButton");
  const nextButton = document.getElementById("adsNextButton");
  if (!target) return;

  const ads = Array.isArray(data.ads) ? [...data.ads] : [];
  if (!ads.length) {
    target.innerHTML = `<div class="empty-state">Todavia no hay publicidades cargadas.</div>`;
    if (countLabel) countLabel.textContent = "0 piezas";
    if (pageLabel) pageLabel.textContent = "Pagina 1 de 1";
    if (prevButton) prevButton.disabled = true;
    if (nextButton) nextButton.disabled = true;
    return;
  }

  const normalizedQuery = adsViewState.query.trim().toLowerCase();
  const filteredAds = ads.filter((ad) => {
    if (!normalizedQuery) return true;
    return [ad.title, ad.description, ad.label]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery));
  });

  const sortedAds = filteredAds.sort((a, b) => {
    if (adsViewState.sort === "oldest") {
      return Number(String(a.id).split("-").pop()) - Number(String(b.id).split("-").pop());
    }

    if (adsViewState.sort === "title-asc") {
      return String(a.title || "").localeCompare(String(b.title || ""), "es");
    }

    if (adsViewState.sort === "title-desc") {
      return String(b.title || "").localeCompare(String(a.title || ""), "es");
    }

    return Number(String(b.id).split("-").pop()) - Number(String(a.id).split("-").pop());
  });

  const totalPages = Math.max(1, Math.ceil(sortedAds.length / ADS_PAGE_SIZE));
  adsViewState.page = Math.min(adsViewState.page, totalPages);
  const pageStart = (adsViewState.page - 1) * ADS_PAGE_SIZE;
  const pagedAds = sortedAds.slice(pageStart, pageStart + ADS_PAGE_SIZE);

  target.innerHTML = pagedAds.map((ad) => {
    const safeAdUrl = sanitizeUrl(ad.url);
    const safeAdImage = sanitizeUrl(ad.image);
    return `
      <article class="ad-admin-card">
        <div class="ad-admin-card__media">
          ${isDirectImageUrl(safeAdImage)
            ? `<img src="${safeAdImage}" alt="${escapeHtml(ad.title)}">`
            : `<span>Sin imagen</span>`}
        </div>
        <div class="ad-admin-card__body">
          <div class="ad-admin-card__meta">
            <span>${escapeHtml(ad.label || "Publicidad")}</span>
            <small>${safeAdUrl ? "Link activo" : "Sin link valido"}</small>
          </div>
          <h4>${escapeHtml(ad.title)}</h4>
          <p>${escapeHtml(ad.description)}</p>
          <div class="ad-admin-card__url">${escapeHtml(safeAdUrl || "Destino no configurado")}</div>
          <div class="ad-admin-card__actions">
            <a class="button button--ghost" href="${safeAdUrl || "#"}" target="_blank" rel="noopener noreferrer">Ver link</a>
            <button type="button" class="button button--ghost" data-duplicate-ad-id="${ad.id}">Duplicar</button>
            <button type="button" class="button button--ghost" data-edit-ad-id="${ad.id}">Editar</button>
            <button type="button" class="button button--ghost" data-delete-ad-id="${ad.id}">Borrar</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  if (!pagedAds.length) {
    target.innerHTML = `<div class="empty-state">No hay publicidades que coincidan con la busqueda.</div>`;
  }

  if (countLabel) {
    countLabel.textContent = `${filteredAds.length} ${filteredAds.length === 1 ? "pieza" : "piezas"}`;
  }

  if (pageLabel) {
    pageLabel.textContent = `Pagina ${adsViewState.page} de ${totalPages}`;
  }

  if (prevButton) prevButton.disabled = adsViewState.page <= 1;
  if (nextButton) nextButton.disabled = adsViewState.page >= totalPages;
}

function renderAdPreview() {
  const data = getSiteData();
  const target = document.getElementById("adPreview");
  if (!target) return;

  const ad = data.ads?.[0];
  if (!ad) {
    target.innerHTML = `<div class="empty-state">La publicidad activa se previsualiza aca.</div>`;
    return;
  }

  const safeAdUrl = sanitizeUrl(ad.url);
  const safeAdImage = sanitizeUrl(ad.image);

  target.innerHTML = `
    <p class="eyebrow">Vista previa</p>
    <a class="sponsor-card" href="${safeAdUrl || "#"}" target="_blank" rel="noopener noreferrer">
      <span class="sponsor-card__label">${escapeHtml(ad.label || "Publicidad")}</span>
      ${isDirectImageUrl(safeAdImage)
        ? `<span class="sponsor-card__image" style="background-image:url('${safeAdImage}')"></span>`
        : `<span class="sponsor-card__image sponsor-card__image--link">Foto</span>`}
      <span class="sponsor-card__body">
        <strong>${escapeHtml(ad.title)}</strong>
        <small>${escapeHtml(ad.description)}</small>
      </span>
      <span class="sponsor-card__cta">Abrir</span>
    </a>
  `;
}

function populateQuickSettingsForm() {
  const data = getSiteData();
  const form = document.getElementById("quickSettingsForm");
  if (!form) return;

  getField(form, "siteName").value = data.settings.siteName;
  getField(form, "tagline").value = data.settings.tagline;
}

function populateImpactForm() {
  const data = getSiteData();
  const form = document.getElementById("impactForm");
  if (!form) return;

  const impactStrip = getImpactStripConfig(data);
  getField(form, "impactBackgroundImage").value = impactStrip.backgroundImage || "";
  renderImpactSettingsPreview(impactStrip.backgroundImage || "");
  impactStrip.cards.forEach((card, index) => {
    const cardIndex = index + 1;
    getField(form, `impactLabel${cardIndex}`).value = card.label || "";
    getField(form, `impactTitle${cardIndex}`).value = card.title || "";
    getField(form, `impactText${cardIndex}`).value = card.text || "";
  });
}

function populateAccountForm() {
  const user = getCurrentUserRecord();
  const form = document.getElementById("accountForm");
  if (!user || !form) return;

  getField(form, "displayName").value = user.displayName || user.username;
  getField(form, "username").value = user.username;
  getField(form, "currentPassword").value = "";
  getField(form, "newPassword").value = "";
  getField(form, "confirmPassword").value = "";
}

function resetStoryForm() {
  const data = getSiteData();
  const form = document.getElementById("storyForm");
  if (!form) return;

  form.reset();
  getField(form, "id").value = "";
  fillCategoryOptions(data.categories);
  getField(form, "featuredTextPosition").value = "auto";
  getField(form, "publishedAt").value = toDateTimeLocalValue(new Date().toISOString());
  getField(form, "featuredOrder").value = "";
}

function resetAdForm() {
  const form = document.getElementById("adForm");
  if (!form) return;

  form.reset();
  getField(form, "id").value = "";
  getField(form, "label").value = "Publicidad";
}

function resetUserForm() {
  const form = document.getElementById("userForm");
  if (!form) return;

  form.reset();
  getField(form, "originalUsername").value = "";
  getField(form, "role").value = "editor";
  getField(form, "active").checked = true;
  applyRolePresetToUserForm();
}

function applyRolePresetToUserForm() {
  const form = document.getElementById("userForm");
  if (!form) return;

  const permissions = defaultPermissionsForRole(getField(form, "role").value);
  form.querySelectorAll('input[name="permissions"]').forEach((checkbox) => {
    checkbox.checked = permissions.includes(checkbox.value);
  });
}

function fillStoryForm(storyId) {
  const data = getSiteData();
  const story = data.stories.find((item) => item.id === storyId);
  const form = document.getElementById("storyForm");
  if (!story || !form) return;

  getField(form, "id").value = story.id;
  getField(form, "title").value = story.title;
  getField(form, "excerpt").value = story.excerpt;
  getField(form, "category").value = story.category;
  getField(form, "author").value = story.author;
  getField(form, "publishedAt").value = toDateTimeLocalValue(story.publishedAt);
  getField(form, "featuredOrder").value = story.featuredOrder || "";
  getField(form, "image").value = story.image;
  getField(form, "videoUrl").value = story.videoUrl || "";
  getField(form, "featured").checked = story.featured;
  getField(form, "editorsPick").checked = story.editorsPick;
  getField(form, "featuredTextPosition").value = story.featuredTextPosition || "auto";
  getField(form, "content").value = story.content;
  switchAdminTab("story-editor");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function saveStory(form) {
  const data = getSiteData();
  const now = toDateTimeLocalValue(new Date().toISOString());
  const id = getField(form, "id").value || `story-${Date.now()}`;
  const existingStory = data.stories.find((item) => item.id === id);
  const story = {
    id,
    title: getField(form, "title").value.trim(),
    excerpt: getField(form, "excerpt").value.trim(),
    category: getField(form, "category").value,
    author: getField(form, "author").value.trim(),
    image: sanitizeUrl(getField(form, "image").value.trim()),
    videoUrl: sanitizeUrl(getField(form, "videoUrl").value.trim()),
    featured: getField(form, "featured").checked,
    editorsPick: getField(form, "editorsPick").checked,
    featuredTextPosition: getField(form, "featuredTextPosition").value || "auto",
    publishedAt: getField(form, "publishedAt").value || now,
    featuredOrder: getField(form, "featuredOrder").value ? Number(getField(form, "featuredOrder").value) : null,
    content: getField(form, "content").value.trim(),
    sourceLabel: existingStory?.sourceLabel || "",
    sourceUrl: existingStory?.sourceUrl || ""
  };

  const existingIndex = data.stories.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    data.stories[existingIndex] = story;
  } else {
    data.stories.unshift(story);
  }

  setSiteData(data);
  return story;
}

function showPublishFeedback(targetId, message) {
  const target = document.getElementById(targetId);
  if (!target) return;

  if (!message) {
    target.classList.add("hidden");
    target.innerHTML = "";
    return;
  }

  target.classList.remove("hidden");
  target.innerHTML = message;
}

function removeStory(id) {
  const data = getSiteData();
  data.stories = data.stories.filter((story) => story.id !== id);
  setSiteData(data);
}

function duplicateStory(id) {
  const data = getSiteData();
  const sourceStory = data.stories.find((story) => story.id === id);
  if (!sourceStory) return null;

  const duplicate = {
    ...sourceStory,
    id: `story-${Date.now()}`,
    title: `${sourceStory.title} (Copia)`,
    publishedAt: toDateTimeLocalValue(new Date().toISOString())
  };

  data.stories.unshift(duplicate);
  setSiteData(data);
  return duplicate;
}

function fillAdForm(adId) {
  const data = getSiteData();
  const ad = data.ads?.find((item) => item.id === adId);
  const form = document.getElementById("adForm");
  if (!ad || !form) return;

  getField(form, "id").value = ad.id;
  getField(form, "label").value = ad.label || "Publicidad";
  getField(form, "title").value = ad.title;
  getField(form, "description").value = ad.description;
  getField(form, "image").value = ad.image;
  getField(form, "url").value = ad.url;
  switchAdminTab("ad-editor");
}

function saveAd(form) {
  const data = getSiteData();
  const id = getField(form, "id").value || `ad-${Date.now()}`;
  const ad = {
    id,
    label: getField(form, "label").value.trim() || "Publicidad",
    title: getField(form, "title").value.trim(),
    description: getField(form, "description").value.trim(),
    image: sanitizeUrl(getField(form, "image").value.trim()),
    url: sanitizeUrl(getField(form, "url").value.trim())
  };

  const ads = Array.isArray(data.ads) ? data.ads : [];
  const existingIndex = ads.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    ads[existingIndex] = ad;
    data.ads = [ad, ...ads.filter((item) => item.id !== id)];
  } else {
    data.ads = [ad, ...ads];
  }

  setSiteData(data);
  return ad;
}

function removeAd(id) {
  const data = getSiteData();
  data.ads = (data.ads || []).filter((ad) => ad.id !== id);
  setSiteData(data);
}

function duplicateAd(id) {
  const data = getSiteData();
  const sourceAd = (data.ads || []).find((ad) => ad.id === id);
  if (!sourceAd) return null;

  const duplicate = {
    ...sourceAd,
    id: `ad-${Date.now()}`,
    title: `${sourceAd.title} (Copia)`
  };

  data.ads = [duplicate, ...(data.ads || [])];
  setSiteData(data);
  return duplicate;
}

function renderUsersTable() {
  const target = document.getElementById("usersTable");
  if (!target) return;

  const data = getSiteData();
  const currentUser = getCurrentUserRecord();
  if (!hasPermission("users")) {
    target.innerHTML = `<div class="empty-state">No tienes acceso para administrar usuarios.</div>`;
    return;
  }

  if (!data.users.length) {
    target.innerHTML = `<div class="empty-state">Todavia no hay usuarios editoriales cargados.</div>`;
    return;
  }

  target.innerHTML = data.users.map((user) => {
    const permissionSummary = getUserPermissions(user).map((permission) => PERMISSION_LABELS[permission] || permission).join(", ");
    const canDelete = currentUser && currentUser.username !== user.username;
    return `
      <article class="story-row user-row">
        <div>
          <strong>${escapeHtml(user.displayName || user.username)}</strong>
          <p class="meta-line">@${escapeHtml(user.username)} · ${escapeHtml(getRoleLabel(user.role))}</p>
          <p class="field-hint">${escapeHtml(permissionSummary || "Sin permisos asignados")}</p>
        </div>
        <div>${user.active === false ? "Inactivo" : "Activo"}</div>
        <div>${user.lastLogin ? escapeHtml(formatDate(user.lastLogin)) : "Nunca"}</div>
        <div class="story-row__actions">
          <button type="button" class="button button--ghost" data-edit-user="${user.username}">Editar</button>
          <button type="button" class="button button--ghost" data-toggle-user="${user.username}">${user.active === false ? "Activar" : "Desactivar"}</button>
          ${canDelete ? `<button type="button" class="button button--ghost" data-delete-user="${user.username}">Borrar</button>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function fillUserForm(username) {
  const data = getSiteData();
  const user = data.users.find((item) => item.username === username);
  const form = document.getElementById("userForm");
  if (!user || !form) return;

  getField(form, "originalUsername").value = user.username;
  getField(form, "displayName").value = user.displayName || user.username;
  getField(form, "username").value = user.username;
  getField(form, "role").value = user.role || "editor";
  getField(form, "active").checked = user.active !== false;
  getField(form, "password").value = "";
  getField(form, "confirmPassword").value = "";
  const permissions = getUserPermissions(user);
  form.querySelectorAll('input[name="permissions"]').forEach((checkbox) => {
    checkbox.checked = permissions.includes(checkbox.value);
  });
  switchAdminTab("editorial-team");
}

async function saveUser(form) {
  const data = getSiteData();
  const originalUsername = getField(form, "originalUsername").value.trim();
  const username = getField(form, "username").value.trim();
  const displayName = getField(form, "displayName").value.trim();
  const role = getField(form, "role").value;
  const active = getField(form, "active").checked;
  const password = getField(form, "password").value;
  const confirmPassword = getField(form, "confirmPassword").value;
  const permissions = Array.from(form.querySelectorAll('input[name="permissions"]:checked')).map((checkbox) => checkbox.value);

  if (!username || !displayName) {
    throw new Error("Completa nombre visible y usuario.");
  }

  if (password !== confirmPassword) {
    throw new Error("Las contrasenas no coinciden.");
  }

  const existingUser = data.users.find((user) => user.username === originalUsername);
  const duplicateUsername = data.users.find((user) => user.username === username && user.username !== originalUsername);
  if (duplicateUsername) {
    throw new Error("Ya existe un usuario con ese nombre.");
  }

  if (!existingUser && !password) {
    throw new Error("La contrasena es obligatoria para un usuario nuevo.");
  }

  const userRecord = existingUser ? { ...existingUser } : {};
  userRecord.displayName = displayName;
  userRecord.username = username;
  userRecord.role = role;
  userRecord.active = active;
  userRecord.permissions = permissions.length ? permissions : defaultPermissionsForRole(role);

  if (password) {
    userRecord.passwordSalt = DEMO_PASSWORD_SALT;
    userRecord.passwordHash = await hashPassword(password, DEMO_PASSWORD_SALT);
    delete userRecord.password;
  }

  if (existingUser) {
    const index = data.users.findIndex((user) => user.username === originalUsername);
    data.users[index] = userRecord;
  } else {
    data.users.push(userRecord);
  }

  setSiteData(data);

  const session = getSession();
  if (session?.username === originalUsername && session.username !== username) {
    setSession({ username, role: userRecord.role });
  }

  if (session?.username === username && active === false) {
    clearSession();
  }

  return userRecord;
}

function removeUser(username) {
  const data = getSiteData();
  data.users = data.users.filter((user) => user.username !== username);
  setSiteData(data);
}

function toggleUserActive(username) {
  const data = getSiteData();
  const user = data.users.find((item) => item.username === username);
  if (!user) return null;

  user.active = user.active === false;
  setSiteData(data);
  return user;
}

async function saveOwnAccount(form) {
  const data = getSiteData();
  const session = getSession();
  const currentUser = data.users.find((user) => user.username === session?.username);
  if (!currentUser) {
    throw new Error("No se encontro el usuario actual.");
  }

  const displayName = getField(form, "displayName").value.trim();
  const username = getField(form, "username").value.trim();
  const currentPassword = getField(form, "currentPassword").value;
  const newPassword = getField(form, "newPassword").value;
  const confirmPassword = getField(form, "confirmPassword").value;

  if (!(await verifyUserPassword(currentUser, currentPassword))) {
    throw new Error("La contrasena actual no es correcta.");
  }

  if (newPassword && newPassword !== confirmPassword) {
    throw new Error("La nueva contrasena no coincide.");
  }

  const duplicateUsername = data.users.find((user) => user.username === username && user.username !== currentUser.username);
  if (duplicateUsername) {
    throw new Error("Ya existe un usuario con ese nombre.");
  }

  currentUser.displayName = displayName;
  currentUser.username = username;
  if (newPassword) {
    currentUser.passwordSalt = DEMO_PASSWORD_SALT;
    currentUser.passwordHash = await hashPassword(newPassword, DEMO_PASSWORD_SALT);
    delete currentUser.password;
  }

  setSiteData(data);
  setSession({ username: currentUser.username, role: currentUser.role });
  return currentUser;
}

function hydrateDashboard() {
  const data = getSiteData();
  fillCategoryOptions(data.categories);
  populateQuickSettingsForm();
  populateImpactForm();
  populateAccountForm();
  renderStoriesTable();
  renderAdsTable();
  renderAdPreview();
  renderUsersTable();
  resetStoryForm();
  resetAdForm();
  resetUserForm();
  applyPermissionVisibility();
}

function togglePanels() {
  const session = getSession();
  const loginPanel = document.getElementById("loginPanel");
  const dashboardPanel = document.getElementById("dashboardPanel");
  if (!loginPanel || !dashboardPanel) return;

  if (session) {
    const data = getSiteData();
    const user = data.users.find((item) => item.username === session.username);
    if (!user || user.active === false) {
      clearSession();
    }
  }

  const activeSession = getSession();
  loginPanel.classList.toggle("hidden", Boolean(activeSession));
  dashboardPanel.classList.toggle("hidden", !activeSession);
  refreshLoginStateUI();

  if (activeSession) {
    hydrateDashboard();
  }
}

function bindAdminEvents() {
  const loginForm = document.getElementById("loginForm");
  const logoutButton = document.getElementById("logoutButton");
  const quickSettingsForm = document.getElementById("quickSettingsForm");
  const impactForm = document.getElementById("impactForm");
  const storyForm = document.getElementById("storyForm");
  const resetFormButton = document.getElementById("resetFormButton");
  const restoreSeedButton = document.getElementById("restoreSeedButton");
  const storiesTable = document.getElementById("storiesTable");
  const adForm = document.getElementById("adForm");
  const resetAdButton = document.getElementById("resetAdButton");
  const adsTable = document.getElementById("adsTable");
  const adsSearchInput = document.getElementById("adsSearchInput");
  const adsSortSelect = document.getElementById("adsSortSelect");
  const adsPrevButton = document.getElementById("adsPrevButton");
  const adsNextButton = document.getElementById("adsNextButton");
  const accountForm = document.getElementById("accountForm");
  const userForm = document.getElementById("userForm");
  const usersTable = document.getElementById("usersTable");
  const resetUserButton = document.getElementById("resetUserButton");
  const exportStoriesButton = document.getElementById("exportStoriesButton");
  const exportFullBackupButton = document.getElementById("exportFullBackupButton");
  const importStoriesForm = document.getElementById("importStoriesForm");
  const clearImportButton = document.getElementById("clearImportButton");
  let pendingImportAnalysis = null;

  initializeAdminTabs();
  if (storyForm) bindImagePicker(storyForm);
  if (adForm) bindImagePicker(adForm);
  if (impactForm) bindImagePickerToField(impactForm, "impactBackgroundFile", "impactBackgroundImage");
  if (adsSearchInput) adsSearchInput.value = adsViewState.query;
  if (adsSortSelect) adsSortSelect.value = adsViewState.sort;
  refreshLoginStateUI();
  window.addEventListener("focus", refreshLoginStateUI);
  window.setInterval(refreshLoginStateUI, 15000);

  getField(impactForm, "impactBackgroundImage")?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    renderImpactSettingsPreview(target.value.trim());
  });

  getField(userForm, "role")?.addEventListener("change", applyRolePresetToUserForm);

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    refreshLoginStateUI();
    const authLockState = getAuthLockState();
    if (authLockState.lockedUntil && authLockState.lockedUntil > Date.now()) {
      refreshLoginStateUI();
      return;
    }

    const data = getSiteData();
    const username = getField(loginForm, "username").value.trim();
    const password = getField(loginForm, "password").value;
    const user = data.users.find((item) => item.username === username && item.active !== false);

    if (!user || !(await verifyUserPassword(user, password))) {
      const nextState = registerFailedAuthAttempt();
      if (nextState.lockedUntil) {
        refreshLoginStateUI();
      } else {
        setLoginStatus("Usuario o contrasena incorrectos.", "warning");
      }
      return;
    }

    if (typeof user.password === "string" && user.password) {
      user.passwordSalt = DEMO_PASSWORD_SALT;
      user.passwordHash = await hashPassword(password, DEMO_PASSWORD_SALT);
      delete user.password;
    }
    user.lastLogin = new Date().toISOString();
    setSiteData(data);

    clearAuthLockState();
    setLoginStatus("");
    setSession({ username: user.username, role: user.role });
    loginForm.reset();
    togglePanels();
  });

  logoutButton?.addEventListener("click", () => {
    clearSession();
    setLoginStatus("La sesion editorial se cerro correctamente.", "muted");
    togglePanels();
  });

  quickSettingsForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = getSiteData();
    data.settings.siteName = getField(quickSettingsForm, "siteName").value.trim();
    data.settings.tagline = getField(quickSettingsForm, "tagline").value.trim();
    setSiteData(data);
    window.alert("Ajustes guardados.");
  });

  impactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = getSiteData();
    data.settings.impactStrip = {
      backgroundImage: getField(impactForm, "impactBackgroundImage").value.trim(),
      cards: [1, 2, 3].map((index) => ({
        label: getField(impactForm, `impactLabel${index}`).value.trim(),
        title: getField(impactForm, `impactTitle${index}`).value.trim(),
        text: getField(impactForm, `impactText${index}`).value.trim()
      }))
    };
    setSiteData(data);
    renderImpactSettingsPreview(data.settings.impactStrip.backgroundImage);
    window.alert("Franja de impacto guardada.");
  });

  storyForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const imageValue = getField(storyForm, "image").value.trim();
    const videoValue = getField(storyForm, "videoUrl").value.trim();
    if (!imageValue && !videoValue) {
      window.alert("Agrega una imagen o una URL de video para la publicacion.");
      return;
    }
    const story = saveStory(storyForm);
    resetStoryForm();
    renderStoriesTable();
    switchAdminTab("stories-library");
    showPublishFeedback(
      "publishFeedback",
      `<strong>Nota guardada.</strong> Ya podes verla en <a href="${createStoryLink(story)}">su pagina</a> o volver a <a href="index.html?v=${Date.now()}">la portada actualizada</a>.`
    );
  });

  resetFormButton?.addEventListener("click", () => {
    resetStoryForm();
    document.getElementById("publishFeedback")?.classList.add("hidden");
  });

  adForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const ad = saveAd(adForm);
    adsViewState.page = 1;
    resetAdForm();
    renderAdsTable();
    renderAdPreview();
    switchAdminTab("active-ads");
    showPublishFeedback("adFeedback", `<strong>Publicidad guardada.</strong> Ya aparece en <a href="index.html?v=${Date.now()}">la portada actualizada</a>.`);
  });

  resetAdButton?.addEventListener("click", () => {
    resetAdForm();
    document.getElementById("adFeedback")?.classList.add("hidden");
  });

  adsSearchInput?.addEventListener("input", () => {
    adsViewState.query = adsSearchInput.value;
    adsViewState.page = 1;
    renderAdsTable();
  });

  adsSortSelect?.addEventListener("change", () => {
    adsViewState.sort = adsSortSelect.value;
    adsViewState.page = 1;
    renderAdsTable();
  });

  adsPrevButton?.addEventListener("click", () => {
    adsViewState.page = Math.max(1, adsViewState.page - 1);
    renderAdsTable();
  });

  adsNextButton?.addEventListener("click", () => {
    adsViewState.page += 1;
    renderAdsTable();
  });

  restoreSeedButton?.addEventListener("click", () => {
    resetSiteData();
    hydrateDashboard();
    document.getElementById("adFeedback")?.classList.add("hidden");
    document.getElementById("publishFeedback")?.classList.add("hidden");
    document.getElementById("userFeedback")?.classList.add("hidden");
    document.getElementById("accountFeedback")?.classList.add("hidden");
    window.alert("Contenido demo restaurado.");
  });

  accountForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const user = await saveOwnAccount(accountForm);
      populateAccountForm();
      renderUsersTable();
      showPublishFeedback("accountFeedback", `<strong>Cuenta actualizada.</strong> Ahora ingresas como <strong>${escapeHtml(user.username)}</strong>.`);
    } catch (error) {
      showPublishFeedback("accountFeedback", `<strong>No se pudo guardar.</strong> ${escapeHtml(error.message)}`);
    }
  });

  userForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const user = await saveUser(userForm);
      resetUserForm();
      renderUsersTable();
      togglePanels();
      showPublishFeedback("userFeedback", `<strong>Usuario guardado.</strong> ${escapeHtml(user.displayName || user.username)} ya forma parte del equipo editorial.`);
    } catch (error) {
      showPublishFeedback("userFeedback", `<strong>No se pudo guardar.</strong> ${escapeHtml(error.message)}`);
    }
  });

  resetUserButton?.addEventListener("click", () => {
    resetUserForm();
    document.getElementById("userFeedback")?.classList.add("hidden");
  });

  exportStoriesButton?.addEventListener("click", exportStoriesBackup);
  exportFullBackupButton?.addEventListener("click", exportFullBackup);

  getField(importStoriesForm, "importFile")?.addEventListener("change", async () => {
    const file = getField(importStoriesForm, "importFile").files?.[0];
    pendingImportAnalysis = null;
    document.getElementById("importFeedback")?.classList.add("hidden");

    if (!file) {
      document.getElementById("importPreview")?.classList.add("hidden");
      return;
    }

    try {
      const payload = JSON.parse(await file.text());
      pendingImportAnalysis = analyzeImportPayload(payload);
      renderImportPreview(pendingImportAnalysis);
    } catch (error) {
      document.getElementById("importPreview")?.classList.add("hidden");
      showPublishFeedback("importFeedback", "<strong>No se pudo leer el archivo.</strong> Verifica que sea un JSON valido.");
    }
  });

  importStoriesForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pendingImportAnalysis || !pendingImportAnalysis.validCount) {
      showPublishFeedback("importFeedback", "<strong>No hay publicaciones validas para importar.</strong>");
      return;
    }

    const mode = getField(importStoriesForm, "importMode").value;
    if (mode === "replace") {
      const confirmed = window.confirm("Este modo reemplaza la biblioteca de publicaciones. ¿Queres continuar?");
      if (!confirmed) return;
    }

    const result = applyStoriesImport(pendingImportAnalysis.stories, mode);
    renderStoriesTable();
    fillCategoryOptions(getSiteData().categories);
    showPublishFeedback(
      "importFeedback",
      `<strong>Importacion completada.</strong> Agregadas: ${result.added}. Actualizadas: ${result.updated}. Omitidas: ${result.skipped}.`
    );
  });

  clearImportButton?.addEventListener("click", () => {
    pendingImportAnalysis = null;
    importStoriesForm?.reset();
    document.getElementById("importPreview")?.classList.add("hidden");
    document.getElementById("importFeedback")?.classList.add("hidden");
  });

  storiesTable?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.editId) {
      fillStoryForm(target.dataset.editId);
    }

    if (target.dataset.duplicateId) {
      const duplicatedStory = duplicateStory(target.dataset.duplicateId);
      renderStoriesTable();
      if (duplicatedStory) {
        showPublishFeedback("publishFeedback", `<strong>Nota duplicada.</strong> Puedes seguir editando la nueva copia desde la seccion de notas.`);
        switchAdminTab("story-editor");
      }
    }

    if (target.dataset.deleteId) {
      const confirmed = window.confirm("¿Queres borrar esta nota?");
      if (!confirmed) return;
      removeStory(target.dataset.deleteId);
      renderStoriesTable();
    }
  });

  adsTable?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.editAdId) {
      fillAdForm(target.dataset.editAdId);
    }

    if (target.dataset.duplicateAdId) {
      const duplicatedAd = duplicateAd(target.dataset.duplicateAdId);
      adsViewState.page = 1;
      renderAdsTable();
      renderAdPreview();
      if (duplicatedAd) {
        showPublishFeedback("adFeedback", `<strong>Publicidad duplicada.</strong> Ya tienes una nueva pieza para editar.`);
      }
    }

    if (target.dataset.deleteAdId) {
      const confirmed = window.confirm("¿Queres borrar esta publicidad?");
      if (!confirmed) return;
      removeAd(target.dataset.deleteAdId);
      renderAdsTable();
      renderAdPreview();
    }
  });

  usersTable?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.editUser) {
      fillUserForm(target.dataset.editUser);
    }

    if (target.dataset.toggleUser) {
      const updatedUser = toggleUserActive(target.dataset.toggleUser);
      renderUsersTable();
      if (updatedUser && updatedUser.active === false && getSession()?.username === updatedUser.username) {
        clearSession();
        togglePanels();
      }
    }

    if (target.dataset.deleteUser) {
      const confirmed = window.confirm("¿Queres borrar este usuario editorial?");
      if (!confirmed) return;
      removeUser(target.dataset.deleteUser);
      renderUsersTable();
      resetUserForm();
    }
  });
}

if (document.body.dataset.page === "admin") {
  togglePanels();
  bindAdminEvents();
}
