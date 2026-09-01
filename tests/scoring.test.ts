import { describe, it, expect } from 'vitest'
import { calcularPuntos } from '../src/lib/scoring'

describe('calcularPuntos', () => {
  it('devuelve 0 si el jugador no jugó', () => {
    expect(calcularPuntos({ posicion: 'DEL', goles: 5, valla_invicta: true, amarillas: 0, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: true, jugo: false })).toBe(0)
  })

  it('suma 2 pts de presencia al jugar', () => {
    expect(calcularPuntos({ posicion: 'DEL', goles: 0, valla_invicta: false, amarillas: 0, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: false, jugo: true })).toBe(2)
  })

  it('gol de DEL suma 4 pts + 2 presencia = 6', () => {
    expect(calcularPuntos({ posicion: 'DEL', goles: 1, valla_invicta: false, amarillas: 0, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: false, jugo: true })).toBe(6)
  })

  it('gol de ARQ suma 10 pts + 2 presencia = 12', () => {
    expect(calcularPuntos({ posicion: 'ARQ', goles: 1, valla_invicta: false, amarillas: 0, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: false, jugo: true })).toBe(12)
  })

  it('valla invicta ARQ suma 7 pts', () => {
    expect(calcularPuntos({ posicion: 'ARQ', goles: 0, valla_invicta: true, amarillas: 0, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: false, jugo: true })).toBe(9) // 2 + 7
  })

  it('valla invicta DEF suma 4 pts', () => {
    expect(calcularPuntos({ posicion: 'DEF', goles: 0, valla_invicta: true, amarillas: 0, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: false, jugo: true })).toBe(6) // 2 + 4
  })

  it('valla invicta VOL/DEL no suma nada', () => {
    expect(calcularPuntos({ posicion: 'VOL', goles: 0, valla_invicta: true, amarillas: 0, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: false, jugo: true })).toBe(2)
  })

  it('figura suma 5 pts', () => {
    expect(calcularPuntos({ posicion: 'DEL', goles: 0, valla_invicta: false, amarillas: 0, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: true, jugo: true })).toBe(7) // 2 + 5
  })

  it('amarilla resta 2 pts', () => {
    expect(calcularPuntos({ posicion: 'DEL', goles: 0, valla_invicta: false, amarillas: 1, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: false, jugo: true })).toBe(0) // 2 - 2
  })

  it('roja resta 5 pts', () => {
    expect(calcularPuntos({ posicion: 'DEL', goles: 0, valla_invicta: false, amarillas: 0, roja: true, penales_atajados: 0, penales_errados: 0, es_figura: false, jugo: true })).toBe(-3) // 2 - 5
  })

  it('penales atajados ARQ suma 4 pts c/u', () => {
    expect(calcularPuntos({ posicion: 'ARQ', goles: 0, valla_invicta: false, amarillas: 0, roja: false, penales_atajados: 2, penales_errados: 0, es_figura: false, jugo: true })).toBe(10) // 2 + 8
  })

  it('penales atajados DEL no suma', () => {
    expect(calcularPuntos({ posicion: 'DEL', goles: 0, valla_invicta: false, amarillas: 0, roja: false, penales_atajados: 2, penales_errados: 0, es_figura: false, jugo: true })).toBe(2)
  })

  it('capitán suma 5 pts extra', () => {
    expect(calcularPuntos({ posicion: 'DEL', goles: 0, valla_invicta: false, amarillas: 0, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: false, jugo: true, es_capitan: true })).toBe(7) // 2 + 5
  })

  it('combinación compleja: DEL gol + figura + capitán', () => {
    // 2 presencia + 4 gol + 5 figura + 5 capitán = 16
    expect(calcularPuntos({ posicion: 'DEL', goles: 1, valla_invicta: false, amarillas: 0, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: true, jugo: true, es_capitan: true })).toBe(16)
  })
})
