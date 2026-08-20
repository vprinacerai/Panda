import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import postgres from 'postgres'

// Ruta de inicialización única — protegida por SETUP_SECRET
// Uso: GET /api/setup?secret=TU_SETUP_SECRET
// Crea el schema completo y carga datos iniciales en la DB de Neon

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return Response.json({ error: 'No autorizado. Requerido: ?secret=SETUP_SECRET' }, { status: 401 })
  }

  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    return Response.json({ error: 'DATABASE_URL no configurada.' }, { status: 500 })
  }

  const ssl = process.env.DATABASE_SSL !== 'false' ? 'prefer' : false
  const sql = postgres(DATABASE_URL, { ssl, max: 1 })
  const log: string[] = []

  try {
    // ── SCHEMA ────────────────────────────────────────────────
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`

    await sql`CREATE TABLE IF NOT EXISTS torneos (
      id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      nombre            text NOT NULL,
      descripcion       text,
      organizador_email text NOT NULL,
      premio_campeon    integer DEFAULT 0,
      premio_fecha      integer DEFAULT 0,
      activo            boolean DEFAULT true,
      created_at        timestamptz DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS usuarios (
      id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      torneo_id           uuid REFERENCES torneos(id) ON DELETE CASCADE NOT NULL,
      email               text NOT NULL,
      password_hash       text NOT NULL,
      nombre_dt           text NOT NULL,
      rol                 text DEFAULT 'jugador' CHECK (rol IN ('jugador', 'admin')),
      codigo_recuperacion text,
      created_at          timestamptz DEFAULT now(),
      UNIQUE(torneo_id, email)
    )`

    await sql`CREATE TABLE IF NOT EXISTS jugadores (
      id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      torneo_id  uuid REFERENCES torneos(id) ON DELETE CASCADE NOT NULL,
      nombre     text NOT NULL,
      equipo     text NOT NULL,
      posicion   text NOT NULL CHECK (posicion IN ('ARQ', 'DEF', 'VOL', 'DEL')),
      activo     boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS config_fechas (
      id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      torneo_id       uuid REFERENCES torneos(id) ON DELETE CASCADE NOT NULL,
      nombre_fecha    text NOT NULL,
      numero          integer NOT NULL,
      deadline_cierre timestamptz,
      fecha_fin       timestamptz,
      publicada       boolean DEFAULT false,
      created_at      timestamptz DEFAULT now(),
      UNIQUE(torneo_id, numero)
    )`

    await sql`CREATE TABLE IF NOT EXISTS equipos_usuarios (
      id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      torneo_id       uuid REFERENCES torneos(id) ON DELETE CASCADE NOT NULL,
      usuario_id      uuid REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
      fecha_config_id uuid REFERENCES config_fechas(id) ON DELETE CASCADE NOT NULL,
      nombre_equipo   text NOT NULL,
      capitan_id      uuid REFERENCES jugadores(id),
      jugadores_ids   uuid[] NOT NULL,
      updated_at      timestamptz DEFAULT now(),
      UNIQUE(usuario_id, fecha_config_id)
    )`

    await sql`CREATE TABLE IF NOT EXISTS estadisticas (
      id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      torneo_id         uuid REFERENCES torneos(id) ON DELETE CASCADE NOT NULL,
      jugador_id        uuid REFERENCES jugadores(id) ON DELETE CASCADE NOT NULL,
      fecha_config_id   uuid REFERENCES config_fechas(id) ON DELETE CASCADE NOT NULL,
      goles             integer DEFAULT 0,
      valla_invicta     boolean DEFAULT false,
      amarillas         integer DEFAULT 0,
      roja              boolean DEFAULT false,
      penales_atajados  integer DEFAULT 0,
      penales_errados   integer DEFAULT 0,
      es_figura         boolean DEFAULT false,
      jugo              boolean DEFAULT false,
      puntos_totales    integer DEFAULT 0,
      UNIQUE(jugador_id, fecha_config_id)
    )`

    await sql`
      CREATE OR REPLACE FUNCTION calcular_puntos(
        posicion text, goles int, valla_invicta boolean, amarillas int,
        roja boolean, penales_atajados int, penales_errados int, es_figura boolean, jugo boolean
      ) RETURNS integer LANGUAGE plpgsql AS $$
      DECLARE pts integer := 0; pts_por_gol integer;
      BEGIN
        IF NOT jugo THEN RETURN 0; END IF;
        pts := 2;
        pts_por_gol := CASE posicion WHEN 'ARQ' THEN 10 WHEN 'DEF' THEN 8 WHEN 'VOL' THEN 6 WHEN 'DEL' THEN 4 ELSE 0 END;
        pts := pts + (goles * pts_por_gol);
        IF valla_invicta THEN pts := pts + CASE posicion WHEN 'ARQ' THEN 7 WHEN 'DEF' THEN 4 ELSE 0 END; END IF;
        IF es_figura THEN pts := pts + 5; END IF;
        IF posicion = 'ARQ' THEN pts := pts + (penales_atajados * 4); END IF;
        pts := pts - (amarillas * 2);
        IF roja THEN pts := pts - 5; END IF;
        pts := pts - (penales_errados * 2);
        RETURN pts;
      END; $$
    `

    await sql`
      CREATE OR REPLACE FUNCTION trigger_calcular_puntos() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE pos text;
      BEGIN
        SELECT posicion INTO pos FROM jugadores WHERE id = NEW.jugador_id;
        NEW.puntos_totales := calcular_puntos(pos, NEW.goles, NEW.valla_invicta, NEW.amarillas,
          NEW.roja, NEW.penales_atajados, NEW.penales_errados, NEW.es_figura, NEW.jugo);
        RETURN NEW;
      END; $$
    `

    await sql`DROP TRIGGER IF EXISTS calcular_puntos_trigger ON estadisticas`
    await sql`CREATE TRIGGER calcular_puntos_trigger BEFORE INSERT OR UPDATE ON estadisticas FOR EACH ROW EXECUTE FUNCTION trigger_calcular_puntos()`

    await sql`CREATE INDEX IF NOT EXISTS idx_jugadores_torneo     ON jugadores(torneo_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_equipos_usuario      ON equipos_usuarios(usuario_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_equipos_fecha        ON equipos_usuarios(fecha_config_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_estadisticas_fecha   ON estadisticas(fecha_config_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_estadisticas_jugador ON estadisticas(jugador_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_usuarios_email       ON usuarios(torneo_id, email)`

    log.push('✓ Schema creado')

    // ── SEED ──────────────────────────────────────────────────
    const TORNEO_ID = process.env.NEXT_PUBLIC_TORNEO_ID ?? '442a8a67-c442-42f2-9cc4-1369f83048cb'

    await sql`
      INSERT INTO torneos (id, nombre, organizador_email, premio_campeon, premio_fecha)
      VALUES (${TORNEO_ID}, 'Liga Amateur PANDA', 'admin@panda.com', 100000, 10000)
      ON CONFLICT (id) DO NOTHING
    `
    log.push('✓ Torneo')

    const hash = await bcrypt.hash('admin123', 10)
    await sql`
      INSERT INTO usuarios (torneo_id, email, password_hash, nombre_dt, rol)
      VALUES (${TORNEO_ID}, 'admin@panda.com', ${hash}, 'Admin', 'admin')
      ON CONFLICT (torneo_id, email) DO NOTHING
    `
    log.push('✓ Admin: admin@panda.com / admin123')

    const jugadores = [
      { nombre: 'Sergio Romero', equipo: 'Boca Juniors', posicion: 'ARQ' },
      { nombre: 'Lucas Blondel', equipo: 'Boca Juniors', posicion: 'DEF' },
      { nombre: 'Gary Medel', equipo: 'Boca Juniors', posicion: 'DEF' },
      { nombre: 'Marcos Rojo', equipo: 'Boca Juniors', posicion: 'DEF' },
      { nombre: 'Juan Barinaga', equipo: 'Boca Juniors', posicion: 'DEF' },
      { nombre: 'Kevin Zenon', equipo: 'Boca Juniors', posicion: 'VOL' },
      { nombre: 'Cristian Medina', equipo: 'Boca Juniors', posicion: 'VOL' },
      { nombre: 'Pol Fernandez', equipo: 'Boca Juniors', posicion: 'VOL' },
      { nombre: 'Miguel Merentiel', equipo: 'Boca Juniors', posicion: 'DEL' },
      { nombre: 'Edinson Cavani', equipo: 'Boca Juniors', posicion: 'DEL' },
      { nombre: 'Brian Aguirre', equipo: 'Boca Juniors', posicion: 'DEL' },
      { nombre: 'Franco Armani', equipo: 'River Plate', posicion: 'ARQ' },
      { nombre: 'Milton Casco', equipo: 'River Plate', posicion: 'DEF' },
      { nombre: 'Paulo Diaz', equipo: 'River Plate', posicion: 'DEF' },
      { nombre: 'Leandro Gonzalez Pirez', equipo: 'River Plate', posicion: 'DEF' },
      { nombre: 'Fabricio Bustos', equipo: 'River Plate', posicion: 'DEF' },
      { nombre: 'Enzo Perez', equipo: 'River Plate', posicion: 'VOL' },
      { nombre: 'Rodrigo Aliendro', equipo: 'River Plate', posicion: 'VOL' },
      { nombre: 'Claudio Echeverri', equipo: 'River Plate', posicion: 'VOL' },
      { nombre: 'Nicolas de la Cruz', equipo: 'River Plate', posicion: 'VOL' },
      { nombre: 'Facundo Colidio', equipo: 'River Plate', posicion: 'DEL' },
      { nombre: 'Pablo Solari', equipo: 'River Plate', posicion: 'DEL' },
      { nombre: 'Gabriel Arias', equipo: 'Racing Club', posicion: 'ARQ' },
      { nombre: 'Marco Di Cesare', equipo: 'Racing Club', posicion: 'DEF' },
      { nombre: 'Santiago Sosa', equipo: 'Racing Club', posicion: 'DEF' },
      { nombre: 'Facundo Mura', equipo: 'Racing Club', posicion: 'DEF' },
      { nombre: 'Adrian Martinez', equipo: 'Racing Club', posicion: 'VOL' },
      { nombre: 'Tomas Chancalay', equipo: 'Racing Club', posicion: 'VOL' },
      { nombre: 'Juan Nardoni', equipo: 'Racing Club', posicion: 'VOL' },
      { nombre: 'Maxi Romero', equipo: 'Racing Club', posicion: 'DEL' },
      { nombre: 'Roger Martinez', equipo: 'Racing Club', posicion: 'DEL' },
      { nombre: 'Rodrigo Rey', equipo: 'Independiente', posicion: 'ARQ' },
      { nombre: 'Lucas Romero', equipo: 'Independiente', posicion: 'DEF' },
      { nombre: 'Ivan Marcone', equipo: 'Independiente', posicion: 'DEF' },
      { nombre: 'Fabricio Dominguez', equipo: 'Independiente', posicion: 'VOL' },
      { nombre: 'Hernan Galindez', equipo: 'Independiente', posicion: 'VOL' },
      { nombre: 'Jhon Mercado', equipo: 'Independiente', posicion: 'VOL' },
      { nombre: 'Sebastian Sosa', equipo: 'Independiente', posicion: 'DEL' },
      { nombre: 'Leandro Benegas', equipo: 'Independiente', posicion: 'DEL' },
      { nombre: 'Pablo Devecchi', equipo: 'San Lorenzo', posicion: 'ARQ' },
      { nombre: 'Nahuel Barrios', equipo: 'San Lorenzo', posicion: 'DEF' },
      { nombre: 'Gaston Campi', equipo: 'San Lorenzo', posicion: 'DEF' },
      { nombre: 'Ivan Leguizamon', equipo: 'San Lorenzo', posicion: 'DEF' },
      { nombre: 'Nicolas Fernandez', equipo: 'San Lorenzo', posicion: 'VOL' },
      { nombre: 'Alexis Sabella', equipo: 'San Lorenzo', posicion: 'VOL' },
      { nombre: 'Adam Bareiro', equipo: 'San Lorenzo', posicion: 'DEL' },
      { nombre: 'Ezequiel Cerutti', equipo: 'San Lorenzo', posicion: 'DEL' },
      { nombre: 'Augusto Batalla', equipo: 'Atlético Tucumán', posicion: 'ARQ' },
      { nombre: 'Marcos Ortiz', equipo: 'Atlético Tucumán', posicion: 'DEF' },
      { nombre: 'Guillermo Acosta', equipo: 'Atlético Tucumán', posicion: 'VOL' },
    ]

    let insertados = 0
    for (const j of jugadores) {
      const res = await sql`
        INSERT INTO jugadores (torneo_id, nombre, equipo, posicion, activo)
        SELECT ${TORNEO_ID}, ${j.nombre}, ${j.equipo}, ${j.posicion}, true
        WHERE NOT EXISTS (
          SELECT 1 FROM jugadores WHERE torneo_id = ${TORNEO_ID} AND nombre = ${j.nombre} AND equipo = ${j.equipo}
        )
      `
      if (res.count > 0) insertados++
    }
    log.push(`✓ Jugadores: ${insertados} insertados`)

    await sql`
      INSERT INTO config_fechas (torneo_id, nombre_fecha, numero, publicada)
      VALUES (${TORNEO_ID}, 'Fecha 1', 1, false)
      ON CONFLICT (torneo_id, numero) DO NOTHING
    `
    log.push('✓ Fecha 1 activa')

    await sql.end()
    return Response.json({ ok: true, pasos: log })

  } catch (err: any) {
    await sql.end().catch(() => {})
    return Response.json({ error: err.message, pasos: log }, { status: 500 })
  }
}
