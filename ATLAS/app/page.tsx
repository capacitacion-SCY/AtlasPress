import { FeatureStoryCard } from "@/components/StoryCards";
import { HomepageAutoColumns } from "@/components/HomepageAutoColumns";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveAds, getCategories, getImpactCards, getPublishedStories, getSiteSettings } from "@/lib/content";
import type { Story } from "@/lib/types";

export const dynamic = "force-dynamic";

function homepageStoryOrder(story: Story) {
  return typeof story.featured_order === "number" && Number.isFinite(story.featured_order) && story.featured_order > 0
    ? story.featured_order
    : Number.MAX_SAFE_INTEGER;
}

function sortStoriesForHomepage(stories: Story[]) {
  return [...stories].sort((a, b) =>
    homepageStoryOrder(a) - homepageStoryOrder(b) ||
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime() ||
    a.id.localeCompare(b.id)
  );
}

function storyHomepagePosition(story: Story) {
  if (story.featured) return "center";
  if (story.featured_text_position === "left") return "left";
  if (story.featured_text_position === "right") return "right";
  return "auto";
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const categories = await getCategories();
  const rawCategory = (params.category ?? "").trim();
  const selectedCategory = rawCategory ? categories.find((category) => category.slug === rawCategory) : null;
  const isFiltered = Boolean(selectedCategory);
  const [settings, stories, ads, impactCards] = await Promise.all([
    getSiteSettings(),
    getPublishedStories(selectedCategory?.slug),
    getActiveAds(),
    getImpactCards()
  ]);
  const featuredStories = sortStoriesForHomepage(stories.filter((story) => storyHomepagePosition(story) === "center"));
  const centerFallbackStories = sortStoriesForHomepage(
    stories.filter((story) => {
      const position = storyHomepagePosition(story);
      return position === "center" || position === "auto";
    })
  ).slice(0, 4);
  const emergencyCenterStories = sortStoriesForHomepage(stories).slice(0, 4);
  const mainStories = isFiltered
    ? stories
    : featuredStories.length > 0
      ? featuredStories
      : centerFallbackStories.length > 0
        ? centerFallbackStories
        : emergencyCenterStories;
  const remainingStories = stories.filter((story) => !mainStories.some((item) => item.id === story.id));
  const explicitLeftStories = sortStoriesForHomepage(remainingStories.filter((story) => storyHomepagePosition(story) === "left"));
  const explicitRightStories = sortStoriesForHomepage(remainingStories.filter((story) => storyHomepagePosition(story) === "right"));
  const automaticStories = sortStoriesForHomepage(remainingStories.filter((story) => storyHomepagePosition(story) === "auto"));

  return (
    <div className="site-shell">
      <SiteHeader settings={settings} categories={categories} selectedCategorySlug={selectedCategory?.slug ?? ""} />
      {selectedCategory && (
        <section className="category-heading">
          <p className="eyebrow">Categoria</p>
          <h1>{selectedCategory.name}</h1>
          <p>Publicaciones disponibles sobre {selectedCategory.name}.</p>
        </section>
      )}
      <main className="layout">
        <section className={`newsroom-grid ${isFiltered ? "newsroom-grid--filtered" : ""}`}>
          {!isFiltered && (
            <HomepageAutoColumns
              explicitLeftStories={explicitLeftStories}
              explicitRightStories={explicitRightStories}
              automaticStories={automaticStories}
              ads={ads}
              rotationSeconds={settings.auto_rotation_seconds}
              rightImageRotationSeconds={settings.right_image_rotation_seconds}
            >
              {mainStories.length > 0 && (
                <section className="news-column news-column--center">
                  <div id="centerColumn">
                    {mainStories.map((story, index) => (
                      <FeatureStoryCard
                        key={story.id}
                        story={story}
                        index={index}
                        imageRotationSeconds={settings.center_image_rotation_seconds}
                      />
                    ))}
                  </div>
                </section>
              )}
            </HomepageAutoColumns>
          )}

          {isFiltered && mainStories.length > 0 && (
            <section className="news-column news-column--center">
              <div id="centerColumn">
                {mainStories.map((story, index) => (
                  <FeatureStoryCard
                    key={story.id}
                    story={story}
                    index={index}
                    imageRotationSeconds={settings.center_image_rotation_seconds}
                  />
                ))}
              </div>
            </section>
          )}
        </section>

        {stories.length === 0 && <div className="empty-state category-filter-empty">No hay notas publicadas en esta categoria por el momento.</div>}
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
