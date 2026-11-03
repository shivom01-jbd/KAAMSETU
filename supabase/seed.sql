insert into public.categories (slug, name_hi, name_en, icon, sort_order) values
  ('electrician', 'इलेक्ट्रीशियन', 'Electrician', '⚡', 1),
  ('plumber', 'प्लंबर', 'Plumber', '🔧', 2),
  ('ac-fridge', 'एसी / फ्रिज टेक्नीशियन', 'AC / Fridge technician', '❄️', 3),
  ('carpenter', 'कारपेंटर', 'Carpenter', '🪚', 4),
  ('painter', 'पेंटर', 'Painter', '🎨', 5),
  ('driver', 'ड्राइवर', 'Driver', '🚗', 6),
  ('developer', 'डेवलपर', 'Developer', '💻', 7),
  ('designer', 'डिज़ाइनर', 'Designer', '✏️', 8),
  ('engineer', 'इंजीनियर', 'Engineer', '🛠️', 9),
  ('teacher', 'शिक्षक', 'Teacher', '📚', 10),
  ('media', 'मीडिया', 'Media', '🎬', 11),
  ('construction', 'निर्माण मजदूर', 'Construction manpower', '🏗️', 12)
on conflict (slug) do nothing;
