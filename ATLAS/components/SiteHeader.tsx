"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Category, SiteSettings } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function SiteHeader({
  settings,
  categories,
  selectedCategorySlug = ""
}: {
  settings: SiteSettings;
  categories: Category[];
  selectedCategorySlug?: string;
}) {
  const [isMetaDropdownOpen, setIsMetaDropdownOpen] = useState(false);
  const metaDropdownRef = useRef<HTMLDetailsElement | null>(null);
  const primaryCategories = categories.slice(0, 12);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const dropdown = metaDropdownRef.current;
      if (!dropdown) {
        return;
      }
      const target = event.target as Node | null;
      if (target && dropdown.contains(target)) {
        return;
      }
      setIsMetaDropdownOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar__meta">
        <Link className="topbar__admin-link" href="/admin">
          Acceso editorial
        </Link>
        <div className="topbar__meta-main">
          <span>{formatDate(new Date().toISOString())}</span>
          <nav className="section-nav section-nav--meta category-mobile category-mobile--meta" id="sectionNav">
            <details
              className="meta-dropdown section-nav__dropdown"
              data-meta-dropdown
              data-section-nav-dropdown
              ref={metaDropdownRef}
              open={isMetaDropdownOpen}
              onToggle={(event) => {
                setIsMetaDropdownOpen((event.currentTarget as HTMLDetailsElement).open);
              }}
            >
              <summary className="meta-dropdown__trigger section-nav__trigger" data-section-nav-trigger>
                <span className="meta-dropdown__icon" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="meta-dropdown__label">Abrir categorias</span>
              </summary>
              <div className="meta-dropdown__panel section-nav__panel">
                <Link
                  href="/"
                  className={selectedCategorySlug ? "" : "is-active"}
                  data-category="portada"
                  onClick={() => setIsMetaDropdownOpen(false)}
                >
                  Portada
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/?category=${category.slug}`}
                    className={selectedCategorySlug === category.slug ? "is-active" : ""}
                    data-category={category.slug}
                    onClick={() => setIsMetaDropdownOpen(false)}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </details>
          </nav>
        </div>
      </div>
      <div className="brand-row logo-wrap">
        <p className="tagline">Buenos Aires, Argentina</p>
        <Link className="brand" href="/">
          <span className="brand__main">{settings.site_name.replace(/\s+Argentina$/i, "")}</span>
          <span className="brand__sub">Argentina</span>
        </Link>
        <p className="brand-copy">{settings.tagline}</p>
      </div>
      <nav className="section-nav">
        <div className="category-links" aria-label="Principal">
          {primaryCategories.map((category) => (
            <Link
              key={category.id}
              href={`/?category=${category.slug}`}
              className={selectedCategorySlug === category.slug ? "is-active" : ""}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
