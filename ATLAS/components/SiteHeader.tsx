"use client";

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
  return (
    <header className="topbar">
      <div className="topbar__meta">
        <span>{formatDate(new Date().toISOString())}</span>
        <Link href="/admin">Acceso editorial</Link>
      </div>
      <div className="brand-row">
        <div>
          <p className="eyebrow">Prensa Digital</p>
          <div className="brand-line">
            <Link className="brand" href="/">
              <span className="brand__main">{settings.site_name.replace(/\s+Argentina$/i, "")}</span>
              <span className="brand__sub">Argentina</span>
            </Link>
            <p className="brand-copy">{settings.tagline}</p>
          </div>
        </div>
      </div>
      <nav className="section-nav">
        <div className="category-mobile">
          <select
            className="category-select"
            defaultValue={selectedCategorySlug}
            onChange={(event) => {
              const value = event.currentTarget.value;
              window.location.href = value ? `/?category=${value}` : "/";
            }}
          >
            <option value="">Categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </nav>
    </header>
  );
}
