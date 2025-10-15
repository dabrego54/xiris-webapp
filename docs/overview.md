# Guía de incorporación para Xiris Webapp

## Panorama general del proyecto
- Framework principal: **Next.js 14** usando el **App Router** (carpeta `app/`).
- Lenguaje: **TypeScript** con componentes **React** basados en Server Components por defecto.
- Estilos: mayoritariamente con clases utilitarias de **Tailwind CSS** (configurada vía `globals.css`).
- Iconografía: librería `lucide-react` para iconos SVG reutilizables.
- Gestión de datos: actualmente se consumen datos estáticos desde `data/technicians.json`.

## Estructura de carpetas destacadas
- `app/`: rutas y páginas (App Router). Cada subcarpeta representa una ruta.
  - `layout.tsx`: layout global (metadatos, `<html>` y `<body>`).
  - `page.tsx`: landing con el mapa y CTA.
  - `tecnicos/`: listado de técnicos y perfiles (`page.tsx` y `[id]/page.tsx`).
  - `servicio/`: flujo de servicio activo (`[id]/page.tsx`).
  - `chat/`: interfaz de chat en tiempo real (`[id]/page.tsx`).
  - `notificaciones/page.tsx`: placeholder para alertas.
- `components/`: biblioteca de componentes reutilizables (AppShell, MapViewport, tarjetas, CTA, etc.).
- `data/`: mocks JSON que alimentan las vistas.
- `lib/`: utilidades compartidas (actualmente `utils.ts`).
- Configuración: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs` y `components.json` (configuración de shadcn o similar si se habilita).

## Flujo principal de la aplicación
1. **Inicio (`/`)**: muestra `MapViewport` centrado en la ubicación del usuario con un CTA (`PrimaryCTA`) hacia `/tecnicos`.
2. **Listado de técnicos (`/tecnicos`)**: `AppShell` + `TechnicianListPanel` listando datos de `data/technicians.json`; en desktop se acompaña de `MapViewport` con marcadores.
3. **Perfil de técnico (`/tecnicos/[id]`)**: combina `ProfileHeader`, barras de habilidades (`SkillBar`) y `ServiceCard`; CTA hacia `/servicio/[id]`.
4. **Servicio en curso (`/servicio/[id]`)**: mapa con ruta (`showRoute`) y panel con estado, mini tarjeta de técnico y accesos a perfil/chat.
5. **Chat (`/chat/[id]`)**: componente cliente con `useState` para mensajes; renderiza `ChatBubble` y `ChatInput` para enviar nuevos mensajes.

## Componentes clave a conocer
- `AppShell`: estructura consistente (AppBar, Nav responsive, main content). Permite ocultar navegación (`hideNav`).
- `AppBar`: encabezado con botón atrás automático basado en `usePathname`, marca y acceso a notificaciones.
- `Nav`: navegación inferior o lateral reutilizando la misma definición de items.
- `MapViewport`: placeholder ilustrativo de mapa con opciones de mostrar técnicos, ruta y ETA.
- Tarjetas (`TechnicianCard`, `MiniTechnicianCard`, `ServiceCard`), `ProfileHeader`, `SkillBar`, `RatingStars`, etc.: componentes presentacionales que consumen props tipados.
- `PrimaryCTA`: botón/Link estilizado reutilizable.

## Datos y tipado
- `data/technicians.json`: mock con técnicos y sus servicios/habilidades. Las páginas convierten esta estructura en props para componentes.
- Recomendable crear tipos compartidos en `lib/` para garantizar consistencia si la app crece.

## Recomendaciones para profundizar
1. **Next.js App Router**: manejo de layouts anidados, server vs client components, uso de `notFound()` y `Link` para navegación.
2. **State Management**: el chat usa `useState`; si se requiere persistencia o websockets, revisar `useEffect`, context API o librerías como Zustand.
3. **Integración con APIs**: el mock JSON deberá migrarse a llamadas reales (`fetch`, `getServerSideProps`/`route handlers`).
4. **Tailwind avanzado**: patrones para mantener consistencia (paletas, spacing, responsive). Considerar extraer estilos comunes.
5. **Internacionalización y accesibilidad**: el proyecto ya está en español chileno; revisar i18n oficial de Next y buenas prácticas de a11y.
6. **Testing**: aún no hay configuración (Jest/React Testing Library). Añadir pruebas unitarias/integra ción sería un buen siguiente paso.

## Primeros pasos sugeridos para la persona nueva
- Correr `npm install` y `npm run dev` para ver la app en vivo.
- Revisar `AppShell` y rutas principales para entender la navegación.
- Modificar/añadir un técnico en `data/technicians.json` para ver el flujo completo.
- Explorar los componentes presentacionales para aprender el estilo y convenciones del equipo.
- Preparar plan para migrar los mocks a datos reales y definir contratos API.
