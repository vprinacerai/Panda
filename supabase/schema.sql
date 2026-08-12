-- ============================================
-- PANDA Fantasy Football - Supabase Schema
-- ============================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLA: torneos
-- Cada fila = un torneo/liga independiente
-- ============================================
create table public.torneos (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  descripcion text,
  organizador_email text not null,
  premio_campeon    integer default 0,
  premio_fecha      integer default 0,
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- ============================================
-- TABLA: usuarios
-- Un usuario pertenece a un torneo específico
-- ============================================
create table public.usuarios (
  id          uuid primary key default uuid_generate_v4(),
  torneo_id   uuid references public.torneos(id) on delete cascade not null,
  email       text not null,
  password_hash text not null,
  nombre_dt   text not null,
  rol         text default 'jugador' check (rol in ('jugador', 'admin')),
  codigo_recuperacion text,
  created_at  timestamptz default now(),
  unique(torneo_id, email)
);

-- ============================================
-- TABLA: jugadores
-- Jugadores reales del torneo (cargados por admin)
-- ============================================
create table public.jugadores (
  id          uuid primary key default uuid_generate_v4(),
  torneo_id   uuid references public.torneos(id) on delete cascade not null,
  nombre      text not null,
  equipo      text not null,
  posicion    text not null check (posicion in ('ARQ', 'DEF', 'VOL', 'DEL')),
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- ============================================
-- TABLA: config_fechas
-- Controla el ciclo de vida de cada fecha del torneo
-- Resuelve el deadline dinámico y la reapertura de mercado
-- ============================================
create table public.config_fechas (
  id              uuid primary key default uuid_generate_v4(),
  torneo_id       uuid references public.torneos(id) on delete cascade not null,
  nombre_fecha    text not null,   -- "Fecha 1", "Fecha 2", etc.
  numero          integer not null,
  deadline_cierre timestamptz,     -- 3h antes del inicio → bloquea edición
  fecha_fin       timestamptz,     -- fin del partido → reapertura = fecha_fin + 24h
  publicada       boolean default false,
  created_at      timestamptz default now(),
  unique(torneo_id, numero)
);

-- ============================================
-- TABLA: equipos_usuarios
-- Alineación guardada por usuario por fecha
-- Incluye soporte de capitán (+5 pts)
-- ============================================
create table public.equipos_usuarios (
  id              uuid primary key default uuid_generate_v4(),
  torneo_id       uuid references public.torneos(id) on delete cascade not null,
  usuario_id      uuid references public.usuarios(id) on delete cascade not null,
  fecha_config_id uuid references public.config_fechas(id) on delete cascade not null,
  nombre_equipo   text not null,
  capitan_id      uuid references public.jugadores(id),  -- jugador designado como capitán
  jugadores_ids   uuid[] not null,                        -- array de 7 IDs de jugadores
  updated_at      timestamptz default now(),
  unique(usuario_id, fecha_config_id)
);

-- ============================================
-- TABLA: estadisticas
-- Stats post-partido cargados por el admin
-- puntos_totales se calcula al insertar/actualizar
-- ============================================
create table public.estadisticas (
  id                uuid primary key default uuid_generate_v4(),
  torneo_id         uuid references public.torneos(id) on delete cascade not null,
  jugador_id        uuid references public.jugadores(id) on delete cascade not null,
  fecha_config_id   uuid references public.config_fechas(id) on delete cascade not null,
  goles             integer default 0,
  valla_invicta     boolean default false,
  amarillas         integer default 0,
  roja              boolean default false,
  penales_atajados  integer default 0,
  penales_errados   integer default 0,
  es_figura         boolean default false,
  jugo              boolean default false,
  puntos_totales    integer default 0,
  unique(jugador_id, fecha_config_id)
);

-- ============================================
-- FUNCIÓN: calcular puntos según la matriz
-- ============================================
create or replace function calcular_puntos(
  posicion text,
  goles int,
  valla_invicta boolean,
  amarillas int,
  roja boolean,
  penales_atajados int,
  penales_errados int,
  es_figura boolean,
  jugo boolean
) returns integer language plpgsql as $$
declare
  pts integer := 0;
  pts_por_gol integer;
begin
  if not jugo then return 0; end if;

  -- Presencia
  pts := pts + 2;

  -- Goles según posición
  pts_por_gol := case posicion
    when 'ARQ' then 10
    when 'DEF' then 8
    when 'VOL' then 6
    when 'DEL' then 4
    else 0
  end;
  pts := pts + (goles * pts_por_gol);

  -- Valla invicta
  if valla_invicta then
    pts := pts + case posicion
      when 'ARQ' then 7
      when 'DEF' then 4
      else 0
    end;
  end if;

  -- Figura del partido
  if es_figura then pts := pts + 5; end if;

  -- Penal atajado (solo ARQ)
  if posicion = 'ARQ' then pts := pts + (penales_atajados * 4); end if;

  -- Penalizaciones
  pts := pts - (amarillas * 2);
  if roja then pts := pts - 5; end if;
  pts := pts - (penales_errados * 2);

  return pts;
end;
$$;

-- ============================================
-- TRIGGER: auto-calcular puntos_totales al guardar stats
-- ============================================
create or replace function trigger_calcular_puntos()
returns trigger language plpgsql as $$
declare
  pos text;
begin
  select posicion into pos from public.jugadores where id = NEW.jugador_id;

  NEW.puntos_totales := calcular_puntos(
    pos,
    NEW.goles,
    NEW.valla_invicta,
    NEW.amarillas,
    NEW.roja,
    NEW.penales_atajados,
    NEW.penales_errados,
    NEW.es_figura,
    NEW.jugo
  );
  return NEW;
end;
$$;

create trigger calcular_puntos_trigger
before insert or update on public.estadisticas
for each row execute function trigger_calcular_puntos();

-- ============================================
-- ROW LEVEL SECURITY — aísla datos por torneo
-- ============================================
alter table public.torneos         enable row level security;
alter table public.usuarios        enable row level security;
alter table public.jugadores       enable row level security;
alter table public.config_fechas   enable row level security;
alter table public.equipos_usuarios enable row level security;
alter table public.estadisticas    enable row level security;

-- Los datos son visibles públicamente (lectura) pero solo el backend con service_key escribe
create policy "lectura publica torneos"     on public.torneos         for select using (true);
create policy "lectura publica jugadores"   on public.jugadores       for select using (activo = true);
create policy "lectura publica config"      on public.config_fechas   for select using (true);
create policy "lectura publica estadisticas" on public.estadisticas   for select using (true);
create policy "lectura publica equipos"     on public.equipos_usuarios for select using (true);
create policy "lectura publica usuarios"    on public.usuarios        for select using (true);

-- ============================================
-- ÍNDICES para las queries más frecuentes
-- ============================================
create index idx_jugadores_torneo     on public.jugadores(torneo_id);
create index idx_equipos_usuario      on public.equipos_usuarios(usuario_id);
create index idx_equipos_fecha        on public.equipos_usuarios(fecha_config_id);
create index idx_estadisticas_fecha   on public.estadisticas(fecha_config_id);
create index idx_estadisticas_jugador on public.estadisticas(jugador_id);
create index idx_usuarios_email       on public.usuarios(torneo_id, email);
