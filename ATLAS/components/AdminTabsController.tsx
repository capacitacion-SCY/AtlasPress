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

function getActiveTabId() {
  const hash = window.location.hash.replace("#", "");
  return tabIds.includes(hash) ? hash : "ajustes-rapidos";
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
    window.addEventListener("hashchange", activateTab);

    tabs.forEach((tab) => {
      tab.addEventListener("click", activateTab);
    });

    return () => {
      window.removeEventListener("hashchange", activateTab);
      tabs.forEach((tab) => {
        tab.removeEventListener("click", activateTab);
      });
    };
  }, []);

  return null;
}
