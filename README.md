# Shift Planner (MVP con mock)

Mini app **Vite + React** que usa un **mock de 10 trabajadores** para:
- Generar turnos (M/T/N) con reglas básicas (fijo, rotación estable indefinidos, plazo fijo para balanceo)
- Asignar tareas semanales por grupo (Gruero/Auxiliar)
- Guardar por semana en **localStorage** (sin login)

## Requisitos
- Node 18+ (recomendado 20)

## Ejecutar
```bash
npm install
npm run dev
```

## Build (para Vercel)
```bash
npm run build
```

## Deploy en Vercel (rápido)
1) Sube este repo a GitHub
2) Importa en Vercel
3) Framework: Vite
4) Build command: `npm run build`
5) Output: `dist`

## Notas
- Este MVP **no usa Supabase todavía**: guarda en localStorage.
- Está preparado para que después conectes Supabase (ver `src/lib/supabaseClient.js`).
