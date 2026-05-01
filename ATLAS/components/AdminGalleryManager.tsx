"use client";

import { useState } from "react";

type AdminGalleryManagerProps = {
  galleryImages: string[];
  mainImageUrl: string;
  storyId: string;
};

function uniqueImages(images: string[]) {
  return Array.from(new Set(images.map((image) => image.trim()).filter(Boolean)));
}

export function AdminGalleryManager({ galleryImages, mainImageUrl, storyId }: AdminGalleryManagerProps) {
  const [mainImage, setMainImage] = useState(mainImageUrl);
  const [images, setImages] = useState(() => uniqueImages(galleryImages));

  const clearMainImage = () => {
    setMainImage("");
    const form = document.getElementById(`edit-story-${storyId}`);
    const input = form?.querySelector<HTMLInputElement>('input[name="image_url"]');

    if (input) {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const removeGalleryImage = (imageToRemove: string) => {
    setImages((current) => current.filter((image) => image !== imageToRemove));
  };

  const previewImages = [
    ...(mainImage ? [{ caption: "Principal", image: mainImage, onRemove: clearMainImage }] : []),
    ...images.map((image, index) => ({
      caption: `Galeria ${index + 1}`,
      image,
      onRemove: () => removeGalleryImage(image)
    }))
  ];

  return (
    <>
      <div className="story-gallery-preview" aria-label="Imagenes cargadas en esta publicacion">
        {previewImages.length > 0 ? (
          previewImages.map((item, index) => (
            <figure key={`${storyId}-${item.image}-${index}`}>
              <button
                className="story-gallery-preview__remove"
                type="button"
                aria-label={`Quitar imagen ${item.caption}`}
                onClick={item.onRemove}
              >
                ×
              </button>
              <img src={item.image} alt="" />
              <figcaption>{item.caption}</figcaption>
            </figure>
          ))
        ) : (
          <p>No hay imagenes cargadas.</p>
        )}
      </div>
      <label>
        <span>Galeria de imagenes</span>
        <textarea
          name="gallery_images"
          value={images.join("\n")}
          onChange={(event) => setImages(uniqueImages(event.currentTarget.value.split(/\r?\n/)))}
          placeholder="Una URL por linea. Borra una URL para quitarla de la rotacion."
        />
      </label>
    </>
  );
}
