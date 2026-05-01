export type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export type Story = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string;
  video_url: string;
  gallery_videos?: string[];
  featured: boolean;
  editors_pick: boolean;
  featured_order: number | null;
  featured_text_position: "auto" | "left" | "right";
  source_label: string;
  source_url: string;
  status: "draft" | "published" | "archived";
  published_at: string;
  author_name: string;
  gallery_images: string[];
  categories?: Category | null;
};

export type Ad = {
  id: string;
  label: string;
  title: string;
  description: string;
  image_url: string;
  url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SiteSettings = {
  id: string;
  site_name: string;
  tagline: string;
  impact_background_image: string;
  auto_rotation_seconds?: number;
  center_image_rotation_seconds?: number;
  right_image_rotation_seconds?: number;
};

export type ImpactCard = {
  id: string;
  label: string;
  title: string;
  body: string;
  sort_order: number;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "editor" | "redactor" | "publicidad" | "revisor";
  permissions: string[];
  active: boolean;
};
