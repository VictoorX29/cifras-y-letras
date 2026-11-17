-- Ejecuta esto en Supabase > SQL Editor
create table public.partidas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha timestamptz not null default now(),
  resultado text not null,
  puntuacion int not null check (puntuacion >= 0),
  duracion int not null check (duracion >= 0),
  detalle jsonb
);

alter table public.partidas enable row level security;

create policy "Ver mis partidas" on public.partidas
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Guardar mis partidas" on public.partidas
  for insert to authenticated with check (user_id = (select auth.uid()));
