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

update public.categories set name = 'Derechos Humanos' where slug = 'voces-para-la-humanidad';
update public.categories set name = 'Religion' where slug = 'interreligioso';
update public.categories set name = 'Mundo' where slug = 'libertad-religiosa';
update public.categories set name = 'Salud' where slug = 'el-camino-a-la-felicidad';
update public.categories set name = 'Ciencia y tecnologia' where slug = 'mundo-libre-de-drogas';
update public.categories set name = 'Medio Ambiente' where slug = 'unidos-por-los-derechos-humanos';
update public.categories set name = 'Politica' where slug = 'jovenes-por-los-derechos-humanos';
update public.categories set name = 'Latinoamerica' where slug = 'scientology-argentina';
update public.categories set name = 'Economia' where slug = 'cchr';
update public.categories set name = 'IA al dia' where slug = 'narconon';
