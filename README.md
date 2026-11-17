# Cifras y Letras

Minijuego web inspirado en el concurso de La 2. Seis pruebas de 60 s alternando **Letras** (palabra más larga con 9 letras) y **Cifras** (llegar a un número de 3 cifras con 6 números y + − × ÷). Con 40 puntos o más, victoria.

## Reglas y puntuación
- Letras: 1 punto por letra (18 si usas las 9). La palabra se valida con es.wiktionary.org.
- Cifras: exacto 10 puntos, a ≤5 de diferencia 7, a ≤10 de diferencia 5. Solo resultados enteros y positivos.

## Tecnologías
HTML5, CSS3, JavaScript Vanilla, Vite, Supabase (Auth con Google + PostgreSQL con RLS), GitHub.

## Ejecutar
1. `npm install`
2. Copia `.env.example` a `.env` y rellena tus claves de Supabase.
3. Ejecuta `supabase.sql` en el SQL Editor de Supabase.
4. `npm run dev`
