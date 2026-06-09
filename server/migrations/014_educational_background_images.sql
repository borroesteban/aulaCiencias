ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS educational_background_images text;

UPDATE app_settings
SET educational_background_images = COALESCE(
  NULLIF(educational_background_images, ''),
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=3200&q=82
https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=3200&q=82
https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=3200&q=82
https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=3200&q=82'
);
