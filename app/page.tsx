import { CompactAdCard, CompactStoryCard, FeatureStoryCard, BriefStoryCard } from "@/components/StoryCards";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveAds, getCategories, getImpactCards, getPublishedStories, getSiteSettings } from "@/lib/content";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const [settings, categories, stories, ads, impactCards] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getPublishedStories(params.category),
    getActiveAds(),
    getImpactCards()
  ]);

  const featuredStories = stories
    .filter((story) => story.featured)
    .sort((a, b) => (a.featured_order ?? 999) - (b.featured_order ?? 999));
  const mainStories = (featuredStories.length ? featuredStories : stories).slice(0, 4);
  const remainingStories = stories.filter((story) => !mainStories.some((item) => item.id === story.id));
  const leftStories = remainingStories.filter((_, index) => index % 2 === 0);
  const rightStories = remainingStories.filter((_, index) => index % 2 === 1);

  return (
    <div className="site-shell">
      <SiteHeader settings={settings} categories={categories} />
      <main className="layout">
        <section className={`newsroom-grid ${params.category ? "newsroom-grid--filtered" : ""}`}>
          {leftStories.length > 0 && (
            <aside className="news-column news-column--left">
              {!params.category && (
                <div className="section-heading section-heading--compact">
                  <div>
                    <p className="eyebrow">Cobertura breve</p>
                    <h2>Últimas noticias</h2>
                  </div>
                </div>
              )}
              <div id="leftColumn">{leftStories.map((story) => <BriefStoryCard key={story.id} story={story} />)}</div>
            </aside>
          )}

          {mainStories.length > 0 && (
            <section className="news-column news-column--center">
              {!params.category && (
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Destacadas</p>
                    <h2>Historias principales</h2>
                  </div>
                </div>
              )}
              <div id="centerColumn">{mainStories.map((story, index) => <FeatureStoryCard key={story.id} story={story} index={index} />)}</div>
            </section>
          )}

          {(rightStories.length > 0 || (!params.category && ads.length > 0)) && (
            <aside className="news-column news-column--right">
              {!params.category && (
                <div className="section-heading section-heading--compact">
                  <div>
                    <p className="eyebrow">Agenda y publicidad</p>
                    <h2>Más para leer</h2>
                  </div>
                </div>
              )}
              <div id="rightColumn">
                {rightStories.map((story) => <CompactStoryCard key={story.id} story={story} />)}
                {!params.category && ads.map((ad) => <CompactAdCard key={ad.id} ad={ad} />)}
              </div>
            </aside>
          )}
        </section>

        {stories.length === 0 && <div className="empty-state category-filter-empty">No hay notas publicadas en esta categoría por el momento.</div>}
      </main>

      <section
        className={`impact-strip ${settings.impact_background_image ? "impact-strip--with-image" : ""}`}
        style={settings.impact_background_image ? { backgroundImage: `var(--impact-overlay), url("${settings.impact_background_image}")` } : undefined}
      >
        {impactCards.map((card) => (
          <article className="impact-card" key={card.id}>
            <p className="eyebrow">{card.label}</p>
            <strong>{card.title}</strong>
            <p>{card.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
