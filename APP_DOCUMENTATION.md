# DOCUMENTACIÓN TÉCNICA MAESTRA: PROYECTOS Y MEJORA (UAD)

> **PROPÓSITO DE ESTE ARCHIVO:**
> Este documento sirve como "Semilla de Contexto" para reiniciar la Inteligencia Artificial. Contiene la arquitectura completa, decisiones de diseño, esquemas de base de datos y la lógica de integración crítica entre UAD y NEXUS.

---

## 1. RESUMEN GENERAL DE LA APLICACIÓN (UAD)

**Tipo:** SPA (Single Page Application)
**Stack:** React 19 + TypeScript + Vite + Tailwind CSS.
**Backend:** Supabase (BaaS).
**IA:** Google Gemini 2.5 (Flash/Pro) + Imagen 3 + Veo (Video) + Live API (Audio en tiempo real).

### Funcionalidad Central
La aplicación "Proyectos y Mejora" (UAD) actúa como un **ERP/Dashboard Administrativo** para gestionar:
1.  **Proyectos:** Ciclo de vida (Nuevo -> En Progreso -> Revisión -> Completo), tareas jerárquicas, diagramas de Gantt y Ishikawa.
2.  **Documentos:** Gestor de archivos con estructura de carpetas recursiva.
3.  **Auditorías:** Calendario de eventos recurrentes con checklists.
4.  **Apps (Launcher):** Interfaz visual tipo "Circuito Sci-Fi" para lanzar herramientas externas.
5.  **NEXUS (Consola de Publicación):** Módulo crítico para controlar qué ven los empleados en la app satélite.

---

## 2. ARQUITECTURA DE DATOS (DOBLE BASE DE DATOS)

El sistema utiliza una arquitectura híbrida con dos proyectos de Supabase distintos para separar datos operacionales de datos históricos/externos.

### A. Base de Datos 1 (LOCAL / PRIMARY)
*   **Rol:** Base de datos principal de la UAD.
*   **Contenido:** Usuarios, Proyectos activos, Tareas, Documentos actuales, Configuración.
*   **Autenticación:** Maneja el Login de la UAD.

### B. Base de Datos 2 (EXTERNAL / SECONDARY)
*   **Rol:** Repositorio de "Procesos Antiguos" y datos históricos.
*   **Conexión:** Se conecta mediante un cliente secundario (`supabaseExternal`) en `services/supabaseService.ts`.
*   **Lógica de Carga:** Utiliza **Lazy Loading**. Solo se conecta cuando el usuario entra a las pestañas "Documentos" o "NEXUS".

---

## 3. INTEGRACIÓN UAD <-> NEXUS (MASTER/SLAVE)

Esta es la parte más compleja y crítica del sistema.

### Concepto
*   **UAD (Esta App):** Actúa como **MAESTRO (Publisher)**. Es la única que puede escribir, editar o borrar permisos.
*   **NEXUS (La Otra App):** Actúa como **ESCLAVO (Viewer)**. Solo tiene permisos de lectura (`SELECT`) y muestra lo que UAD autoriza.

### Estrategia de "Frontend Aggregation" & "Flat Mirror Tables"
Para evitar problemas de seguridad con JOINs entre tablas con permisos restrictivos (RLS), implementamos una estrategia de **Tablas Espejo Planas**.

#### Cómo funciona el "Interruptor":
1.  En UAD (`NexusView`), el administrador ve un documento local o externo.
2.  Activa el **Switch (Publicar)**.
3.  UAD genera una **URL Firmada** (Signed URL) de larga duración (1 año) para el archivo PDF.
4.  UAD realiza un `UPSERT` en la tabla pública `procedures` (en la DB correspondiente).
5.  UAD inyecta metadatos redundantes (`folder_id`, `folder_name`, `area`) directamente en la fila para que NEXUS no tenga que consultar la tabla `folders` protegida.

---

## 4. ESQUEMA DE BASE DE DATOS (SQL APLICADO)

Estas tablas y políticas deben existir tanto en la **DB LOCAL** como en la **DB EXTERNA** para que la sincronización funcione.

### A. Tabla: `procedures` (Lista Blanca de Documentos)
Es la tabla que NEXUS consulta para saber qué documentos mostrar.

```sql
CREATE TABLE IF NOT EXISTS public.procedures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,          -- Nombre visual
    code TEXT,                    -- Código (ej. IT-001)
    area TEXT NOT NULL,           -- ETIQUETA CRÍTICA para el filtrado en NEXUS
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'Vigente',
    file_url TEXT NOT NULL,       -- Enlace directo al PDF (Signed URL)
    
    -- REFERENCIAS INTERNAS (Para el Switch de UAD)
    origin_document_id UUID,      -- ID en tabla 'documents' (DB Local)
    uad_origin_id UUID,           -- ID en tabla 'documents' (DB Externa)
    
    -- DATOS PLANOS (Para Frontend Aggregation en NEXUS)
    folder_id UUID,               -- ID de la carpeta visual
    
    -- RESTRICCIONES
    CONSTRAINT unique_origin_id UNIQUE (origin_document_id), -- O uad_origin_id en externa
    CONSTRAINT unique_uad_origin UNIQUE (uad_origin_id)
);

-- PERMISOS (RLS)
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
-- Lectura pública para que NEXUS pueda ver
CREATE POLICY "Public Read" ON public.procedures FOR SELECT TO anon USING (true);
CREATE POLICY "Public Read Auth" ON public.procedures FOR SELECT TO authenticated USING (true);
-- Escritura solo para UAD (Authenticated)
CREATE POLICY "UAD Write" ON public.procedures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "UAD Update" ON public.procedures FOR UPDATE TO authenticated USING (true);
CREATE POLICY "UAD Delete" ON public.procedures FOR DELETE TO authenticated USING (true);
```

### B. Tabla: `published_folders` (Lista Blanca de Carpetas)
Permite publicar carpetas completas y que NEXUS reconstruya la estructura.

```sql
CREATE TABLE IF NOT EXISTS public.published_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    origin_folder_id UUID NOT NULL UNIQUE, -- ID real de la carpeta
    folder_name TEXT,                      -- Nombre visual (Dato plano)
    area TEXT NOT NULL,                    -- Etiqueta de filtrado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PERMISOS (RLS)
ALTER TABLE public.published_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Folders" ON public.published_folders FOR SELECT TO anon USING (true);
-- Escritura restringida a UAD...
```

---

## 5. GUÍA DE FUNCIONAMIENTO PARA NEXUS (Instrucciones para la otra IA)

Si necesitas re-instruir a la IA que desarrolla NEXUS, usa esta lógica:

1.  **No uses JOINs SQL:** No intentes unir `procedures` con `folders`. Fallará por permisos.
2.  **Consulta Paralela:**
    *   Haz un `GET` a `published_folders` filtrando por `area`.
    *   Haz un `GET` a `procedures` filtrando por `area` y `status='Vigente'`.
3.  **Cruce en Cliente (JS):**
    *   Toma la lista de `procedures`.
    *   Si `procedure.folder_id` coincide con un `folder.origin_folder_id`, mete el documento visualmente dentro de esa carpeta (acordeón).
    *   Si no, muéstralo en la raíz.
4.  **Archivos:** Para descargar, usa simplemente el campo `file_url`. Es un link pre-autorizado.

---

## 6. MÓDULOS ESPECÍFICOS DE UAD

### Apps View (Circuitos)
*   Usa SVG para dibujar líneas.
*   **Posicionamiento:** Absoluto basado en píxeles calculados dinámicamente (`ResizeObserver`).
*   **Enrutamiento:** Algoritmo ortogonal que busca uno de los 3 puntos de anclaje por lado de cada módulo para evitar líneas diagonales.

### Passwords View (Seguridad)
*   **Encriptación:** Cliente-lado únicamente.
*   **Algoritmo:** Vigenère XOR Hexadecimal (`v3:`).
*   **Key:** Usa una "Contraseña Maestra" que nunca se guarda en texto plano, solo su hash SHA-256 para validación.

### Live Assistant
*   Usa WebSockets para conectar con la API `gemini-2.5-flash-native-audio`.
*   Maneja buffers de audio PCM (16kHz entrada / 24kHz salida).

---

## 7. RESOLUCIÓN DE PROBLEMAS COMUNES

*   **Error "Policy ... already exists":** Al correr scripts SQL, siempre usa `DROP POLICY IF EXISTS` antes de crear.
*   **Error "On Conflict constraint":** Asegúrate de que la columna usada en `ON CONFLICT` (ej. `origin_document_id`) tenga una restricción `UNIQUE` en la base de datos.
*   **Autofix/Linter Loops:** En `useEffect`, evita declarar funciones complejas fuera del hook si no están memoizadas (`useCallback`). Esto causa re-renders infinitos.

---
**ESTADO ACTUAL DEL SISTEMA:**
*   Conexión DB Local: **ACTIVA**
*   Conexión DB Externa: **ACTIVA**
*   Sincronización NEXUS: **ACTIVA (Modo Switch)**
