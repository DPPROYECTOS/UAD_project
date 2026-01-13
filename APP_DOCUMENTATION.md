
# DOCUMENTACIÓN TÉCNICA MAESTRA: PROYECTOS Y MEJORA (UAD)

> **PROPÓSITO DE ESTE ARCHIVO:**
> Este documento sirve como "Semilla de Contexto" y "Fuente de Verdad" para cualquier instancia de Inteligencia Artificial que trabaje en el proyecto. Contiene la arquitectura completa, esquemas de base de datos actualizados y lógica de negocio crítica.

---

## 1. RESUMEN GENERAL DE LA APLICACIÓN (UAD)

**Tipo:** SPA (Single Page Application)
**Stack:** React 19 + TypeScript + Vite + Tailwind CSS.
**Estética:** Diseño "Neo-Nexus" (Cyberpunk/Glassmorphism) con soporte de temas claro/oscuro/personalizado.
**Backend:** Supabase (BaaS) - Arquitectura Dual.
**IA:** Google Gemini 2.5 (Flash/Pro), Imagen 3, Veo (Video), Live API (Audio).
**Audio Nativo:** Web Speech API para transcripción gratuita sin consumo de tokens.

### Módulos Principales
1.  **Dashboard:** KPIs, actividad reciente y estado de proyectos con visualización futurista.
2.  **Proyectos:** Gestión completa con Diagramas de Gantt (días hábiles/feriados MX) y Diagramas de Ishikawa (6M).
3.  **Documentos:** Gestor de archivos con estructura recursiva y soporte para repositorios locales y externos.
4.  **CODEX (Consola de Enlace):** Módulo maestro (anteriormente NEXUS) para publicar documentos hacia la app satélite de empleados.
5.  **Contraseñas:** Bóveda encriptada (Client-Side Vigenère XOR v2) con agrupación por categorías.
6.  **Bitácora (Voice Log):** Transcripción de reuniones en tiempo real usando API nativa del navegador.
7.  **Apps (Circuitos):** Lanzador visual basado en coordenadas SVG.

---

## 2. ARQUITECTURA DE DATOS (DOBLE BASE DE DATOS)

El sistema utiliza una arquitectura híbrida con dos proyectos de Supabase para segregar datos operacionales de datos históricos/externos.

### A. Base de Datos 1 (LOCAL / PRIMARY)
*   **Rol:** Base de datos principal de la UAD.
*   **Contenido:** Usuarios, Proyectos activos, Tareas, Documentos operativos, Configuración de UI, Contraseñas, Pizarras.
*   **Autenticación:** Maneja el Login principal.

### B. Base de Datos 2 (EXTERNAL / SECONDARY)
*   **Rol:** Repositorio de "Procesos Antiguos", datos históricos y configuración compartida con CODEX (App Esclava).
*   **Conexión:** Cliente secundario (`supabaseExternal`).
*   **Tablas Clave Compartidas:** `departments` (Áreas), `procedures` (Docs Publicados).

---

## 3. INTEGRACIÓN UAD <-> CODEX (MASTER/SLAVE)

### Lógica de "Áreas Dinámicas"
A diferencia de versiones anteriores con listas estáticas, ahora las áreas/departamentos se gestionan dinámicamente desde la base de datos externa para mantener sincronía total con la app satélite.

*   **Tabla Fuente:** `departments` (en DB Externa).
*   **Flujo:** Al publicar un documento, UAD consulta esta tabla para poblar el selector de áreas. Esto evita publicar documentos en áreas inexistentes o renombradas.

### Estrategia de "Tablas Espejo Planas"
Para publicar documentos protegidos sin exponer la estructura interna ni lidiar con RLS complejos en JOINs:

1.  **Acción:** Admin selecciona archivo en `NexusView` -> "INICIAR ENLACE".
2.  **Proceso:**
    *   Genera URL Firmada (Signed URL) de larga duración (aprox. 1 año).
    *   Realiza `UPSERT` en la tabla `procedures` (Local o Externa según contexto).
    *   Aplana los datos: Inyecta `folder_id` y `area` directamente en la fila del procedimiento.

---

## 4. ESQUEMA DE BASE DE DATOS ACTUALIZADO (SQL)

A continuación, las estructuras críticas creadas y modificadas recientemente.

### A. Tabla: `procedures` (Integración CODEX)
Existente en ambas BDs.
```sql
CREATE TABLE IF NOT EXISTS public.procedures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    code TEXT,
    area TEXT NOT NULL,           -- Crucial para filtrado en Codex
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'Vigente',
    file_url TEXT NOT NULL,       -- Signed URL
    origin_document_id UUID,      -- Link a documento local
    uad_origin_id UUID,           -- Link a documento externo
    folder_id UUID,               -- Agregación visual
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
...
