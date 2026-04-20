-- Atlas Press Argentina - retoques visuales y ortográficos
-- Ejecutar si el esquema ya estaba cargado y quieres corregir textos existentes.

update public.site_settings
set tagline = 'Buenas noticias, campañas humanitarias y encuentros interreligiosos con foco en Scientology Argentina.'
where tagline = 'Buenas noticias, campanas humanitarias y encuentros interreligiosos con foco en Scientology Argentina.';

update public.categories set name = 'Prevención' where slug = 'prevencion';
update public.categories set name = 'Jóvenes por los Derechos Humanos' where slug = 'jovenes-por-los-derechos-humanos';
update public.categories set name = 'Librería' where slug = 'libreria';

update public.impact_cards set label = 'Prevención' where label = 'Prevencion';
update public.impact_cards set label = 'Diálogo' where label = 'Dialogo';
update public.impact_cards
set body = 'Distribuidos en Plaza Moreno, La Plata, en una acción educativa comunitaria.'
where body = 'Distribuidos en Plaza Moreno, La Plata, en una accion educativa comunitaria.';
