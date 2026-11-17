import './style.css'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const app = document.getElementById('app')
const $ = s => app.querySelector(s)
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const rnd = n => Math.floor(Math.random() * n)
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1])
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' }
const ROUNDS = ['L', 'C', 'L', 'C', 'L', 'C'], SECS = 60
let user = null, timer = null, g = null

const calc = (a, b, o) => o === '+' ? a + b : o === '-' ? (a > b ? a - b : null) : o === '*' ? a * b : (a % b === 0 ? a / b : null)

async function existe(w) { // true / false / null (sin conexión)
  try {
    const r = await fetch(`https://es.wiktionary.org/w/api.php?action=opensearch&search=${encodeURIComponent(w)}&limit=10&format=json&origin=*`)
    const d = await r.json()
    return d[1].some(t => norm(t) === norm(w))
  } catch { return null }
}

function makeTarget(nums) {
  for (let k = 0; k < 300; k++) {
    let pool = [...nums], last = null
    for (let s = 0, n = 3 + rnd(3); s < n && pool.length > 1; s++) {
      const i = rnd(pool.length); let j = rnd(pool.length - 1); if (j >= i) j++
      const r = calc(pool[i], pool[j], '+-*/'[rnd(4)])
      if (r == null) continue
      pool = pool.filter((_, x) => x !== i && x !== j).concat(r); last = r
    }
    if (last >= 101 && last <= 999) return last
  }
  return 100 + rnd(900)
}

// ---------- Vistas ----------
function shell(inner) {
  clearInterval(timer); window.onkeydown = null
  app.innerHTML = `<header><b>Cifras y Letras</b>${user ? `<span>${esc(user.user_metadata?.full_name || user.email)} <button id="out" class="link">Salir</button></span>` : ''}</header><main>${inner}</main>`
  $('#out')?.addEventListener('click', () => sb.auth.signOut())
}

function home() {
  if (!user) {
    shell(`<section class="card"><h1>Cifras y Letras</h1><p>El concurso de La 2, en tu navegador. Inicia sesión para jugar y guardar tus partidas.</p><button id="go" class="big">Entrar con Google</button></section>`)
    $('#go').onclick = () => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })
    return
  }
  shell(`<section class="card"><h1>Cómo se juega</h1>
    <p><b>Letras:</b> te damos 9 letras. Forma la palabra más larga que puedas tocando las fichas o escribiendo. Cada letra vale 1 punto; con las 9, 18.</p>
    <p><b>Cifras:</b> tienes 6 números y un objetivo de 3 cifras. Combínalos con + − × ÷ (solo resultados enteros y positivos). Exacto: 10 puntos. A 5 o menos: 7. A 10 o menos: 5.</p>
    <p>Son 6 pruebas de 60 segundos. Con 40 puntos o más ganas.</p>
    <div class="row"><button id="play1" class="big">Nueva partida</button><button id="hist">Historial</button></div></section>`)
  $('#play1').onclick = start
  $('#hist').onclick = history
}

function start() { g = { i: 0, score: 0, t0: Date.now(), log: [] }; round() }
const round = () => ROUNDS[g.i] === 'L' ? letras() : cifras()
const head = t => `<div class="bar"><span>Prueba ${g.i + 1} de ${ROUNDS.length}: ${t}</span><span>${g.score} puntos</span></div>`

function countdown(onEnd) {
  let s = SECS; $('#clock').textContent = s
  timer = setInterval(() => { s--; $('#clock').textContent = s; if (s <= 0) { clearInterval(timer); onEnd() } }, 1000)
}

function done(tipo, pts, msg) {
  clearInterval(timer); window.onkeydown = null
  g.score += pts; g.log.push({ tipo, puntos: pts })
  $('#play').innerHTML = `<p class="msg">${msg} <b>+${pts} puntos</b></p><button id="next" class="big">${g.i + 1 < ROUNDS.length ? 'Siguiente prueba' : 'Ver resultado'}</button>`
  $('#next').onclick = () => { g.i++; g.i < ROUNDS.length ? round() : finish() }
}

function letras() {
  const V = 'AAAAAAAAAAAAEEEEEEEEEEEEEIIIIIIOOOOOOOOOUUUU', C = 'BCCCDDDFGHLLLMMNNNNPPQRRRRSSSSSTTTTVXYZ'
  const tiles = shuffle([...Array(4)].map(() => V[rnd(V.length)]).concat([...Array(5)].map(() => C[rnd(C.length)])))
  let word = [], ended = false
  shell(`${head('Letras')}<div class="clock" id="clock"></div><div id="tiles" class="tiles"></div>
    <div id="play"><div id="word" class="word"></div><div class="row"><button id="del">Borrar</button><button id="clr">Limpiar</button><button id="ok" class="big">Plantarse</button></div></div>`)
  const draw = () => {
    $('#tiles').innerHTML = tiles.map((l, i) => `<button class="tile" data-i="${i}" ${word.includes(i) ? 'disabled' : ''}>${l}</button>`).join('')
    $('#word').textContent = word.map(i => tiles[i]).join('') || '…'
  }
  const submit = async () => {
    if (ended) return; ended = true; clearInterval(timer); window.onkeydown = null
    const w = word.map(i => tiles[i]).join('')
    if (w.length < 2) return done('letras', 0, 'No has formado ninguna palabra.')
    $('#play').innerHTML = '<p>Comprobando palabra…</p>'
    const ok = await existe(w)
    if (ok === false) return done('letras', 0, `«${w}» no está en el diccionario.`)
    done('letras', w.length === 9 ? 18 : w.length, ok ? `«${w}» es válida.` : `«${w}» (no se pudo comprobar, se acepta).`)
  }
  $('#tiles').onclick = e => { const b = e.target.closest('button'); if (b && !ended) { word.push(+b.dataset.i); draw() } }
  $('#del').onclick = () => { word.pop(); draw() }
  $('#clr').onclick = () => { word = []; draw() }
  $('#ok').onclick = submit
  window.onkeydown = e => {
    if (ended || e.ctrlKey || e.metaKey) return
    if (e.key === 'Enter') return submit()
    if (e.key === 'Backspace') word.pop()
    else { const i = tiles.findIndex((t, k) => t === e.key.toUpperCase() && !word.includes(k)); if (i >= 0) word.push(i) }
    draw()
  }
  draw(); countdown(submit)
}

function cifras() {
  const big = shuffle([25, 50, 75, 100]).slice(0, 1 + rnd(3))
  const nums = big.concat([...Array(6 - big.length)].map(() => 1 + rnd(10)))
  const target = makeTarget(nums)
  let items = nums.map((v, id) => ({ v, id })), sel = null, op = null, steps = [], hist = [], ended = false, nid = 6
  shell(`${head('Cifras')}<div class="clock" id="clock"></div><div class="target">Objetivo: ${target}</div><div id="nums" class="tiles"></div>
    <div id="play"><div id="ops" class="tiles"></div><ol id="steps"></ol><p id="hint" class="hint"></p><div class="row"><button id="undo">Deshacer</button><button id="ok" class="big">Plantarse</button></div></div>`)
  const draw = () => {
    $('#nums').innerHTML = items.map(x => `<button class="tile num${sel === x.id ? ' on' : ''}" data-id="${x.id}">${x.v}</button>`).join('')
    $('#ops').innerHTML = Object.keys(SYM).map(o => `<button class="op${op === o ? ' on' : ''}" data-op="${o}">${SYM[o]}</button>`).join('')
    $('#steps').innerHTML = steps.map(s => `<li>${s}</li>`).join('')
  }
  const submit = () => {
    if (ended) return; ended = true
    const best = items.reduce((a, b) => Math.abs(b.v - target) < Math.abs(a.v - target) ? b : a)
    const d = Math.abs(best.v - target)
    done('cifras', d === 0 ? 10 : d <= 5 ? 7 : d <= 10 ? 5 : 0, `Te has quedado en ${best.v} (objetivo ${target}).`)
  }
  $('#nums').onclick = e => {
    const b = e.target.closest('button'); if (!b || ended) return
    const id = +b.dataset.id; $('#hint').textContent = ''
    if (sel === null || op === null) { sel = id; return draw() }
    if (id === sel) return
    const a = items.find(x => x.id === sel), c = items.find(x => x.id === id), r = calc(a.v, c.v, op)
    if (r == null) { $('#hint').textContent = 'Operación no válida: el resultado debe ser entero y positivo.'; return }
    hist.push({ items, steps }); steps = [...steps, `${a.v} ${SYM[op]} ${c.v} = ${r}`]
    items = items.filter(x => x.id !== a.id && x.id !== c.id).concat({ v: r, id: nid++ }); sel = op = null; draw()
  }
  $('#ops').onclick = e => { const b = e.target.closest('button'); if (b && !ended && sel !== null) { op = b.dataset.op; draw() } }
  $('#undo').onclick = () => { const h = hist.pop(); if (h && !ended) { ({ items, steps } = h); sel = op = null; draw() } }
  $('#ok').onclick = submit
  draw(); countdown(submit)
}

async function finish() {
  const dur = Math.round((Date.now() - g.t0) / 1000), pts = g.score, detalle = g.log
  const res = pts >= 40 ? 'Victoria' : 'Derrota'
  shell(`<section class="card"><h1>${res}</h1><p class="clock">${pts} puntos</p><p>Duración: ${dur} s</p><p id="save">Guardando partida…</p>
    <div class="row"><button id="again" class="big">Jugar otra vez</button><button id="hist">Ver historial</button></div></section>`)
  $('#again').onclick = start; $('#hist').onclick = history
  const save = async () => {
    const { error } = await sb.from('partidas').insert({ user_id: user.id, resultado: res, puntuacion: pts, duracion: dur, detalle })
    if (!$('#save')) return
    $('#save').innerHTML = error ? `No se pudo guardar: ${esc(error.message)} <button id="retry">Reintentar</button>` : 'Partida guardada.'
    $('#retry')?.addEventListener('click', save)
  }
  save()
}

async function history() {
  shell(`<section class="card"><h1>Historial</h1><p id="tot">Cargando…</p><div id="tbl"></div><div class="row"><button id="back">Volver</button></div></section>`)
  $('#back').onclick = home
  const { data, error, count } = await sb.from('partidas').select('*', { count: 'exact' }).order('fecha', { ascending: false })
  if (!$('#tbl')) return
  if (error) { $('#tot').textContent = 'Error: ' + error.message; return }
  $('#tot').textContent = `Partidas jugadas: ${count}`
  $('#tbl').innerHTML = data.length
    ? `<div class="scroll"><table><tr><th>Fecha</th><th>Resultado</th><th>Puntos</th><th>Duración</th></tr>${data.map(p => `<tr><td>${new Date(p.fecha).toLocaleString('es-ES')}</td><td>${esc(p.resultado)}</td><td>${p.puntuacion}</td><td>${p.duracion} s</td></tr>`).join('')}</table></div>`
    : '<p>Aún no has jugado ninguna partida.</p>'
}

// ---------- Sesión (se mantiene al recargar) ----------
sb.auth.onAuthStateChange((_e, session) => {
  const antes = user?.id; user = session?.user ?? null
  if (user?.id !== antes || _e === 'INITIAL_SESSION') home()
})
