"use client";

import { useEffect } from "react";

const tabIds = [
  "ajustes-rapidos",
  "nueva-nota",
  "crear-publicidad",
  "franja-impacto",
  "notas-publicadas",
  "publicidad-activa",
  "importar-exportar",
  "equipo-editorial"
];

const storageKey = "atlas-admin-active-tab";

function getActiveTabId() {
  const hash = window.location.hash.replace("#", "");
  if (tabIds.includes(hash)) return hash;

  const storedTab = window.sessionStorage.getItem(storageKey);
  if (storedTab && tabIds.includes(storedTab)) return storedTab;

  return "ajustes-rapidos";
}

export function AdminTabsController() {
  useEffect(() => {
    const panel = document.querySelector(".admin-panel");
    const tabs = Array.from(document.querySelectorAll<HTMLAnchorElement>(".admin-tab"));
    const sections = tabIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    function activateTab() {
      const activeId = getActiveTabId();

      panel?.classList.add("admin-panel--tabs-ready");
      window.sessionStorage.setItem(storageKey, activeId);

      sections.forEach((section) => {
        const isActive = section.id === activeId;
        section.classList.toggle("is-active", isActive);
        section.hidden = !isActive;
      });

      tabs.forEach((tab) => {
        tab.classList.toggle("is-active", tab.getAttribute("href") === `#${activeId}`);
      });
    }

    activateTab();
    window.requestAnimationFrame(activateTab);
    window.setTimeout(activateTab, 80);
    window.addEventListener("hashchange", activateTab);

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabId = tab.getAttribute("href")?.replace("#", "");
        if (tabId && tabIds.includes(tabId)) {
          window.sessionStorage.setItem(storageKey, tabId);
        }
        window.requestAnimationFrame(activateTab);
      });
    });

    sections.forEach((section) => {
      section.querySelectorAll("form").forEach((form) => {
        form.addEventListener("submit", () => {
          window.sessionStorage.setItem(storageKey, section.id);
        });
      });
    });

    return () => {
      window.removeEventListener("hashchange", activateTab);
    };
  }, []);

  return null;
}
