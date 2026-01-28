# 🚀 GUÍA RÁPIDA DE INICIO

## ⏱️ Tiempo estimado: 15 minutos

### PASO 1: Instalar Node.js (5 minutos)

1. Ve a: https://nodejs.org/
2. Descarga la versión LTS (recomendada)
3. Ejecuta el instalador
4. Acepta todo por defecto
5. **Verifica**: Abre una terminal y escribe:
   ```
   node --version
   ```
   Deberías ver algo como: `v20.x.x`

### PASO 2: Crear cuenta en Supabase (3 minutos)

1. Ve a: https://supabase.com
2. Click en "Start your project" → Sign up with GitHub o Email
3. Crea un nuevo proyecto:
   - Name: `tienda-teoma`
   - Database Password: **GUARDA ESTA CONTRASEÑA**
   - Region: South America (São Paulo)
4. **Espera 2 minutos** mientras se crea

### PASO 3: Configurar Base de Datos (2 minutos)

1. En Supabase, ve al menú izquierdo → "SQL Editor"
2. Click en "New Query"
3. Abre el archivo `supabase-schema.sql` de este proyecto
4. **Copia TODO el contenido** del archivo
5. **Pega** en el SQL Editor de Supabase
6. Click en **RUN** (botón verde)
7. Deberías ver: "Success. No rows returned"

### PASO 4: Obtener credenciales (1 minuto)

1. En Supabase, ve a "Settings" (⚙️) → "API"
2. **Copia estos dos valores**:
   - **Project URL**: algo como `https://xxxxx.supabase.co`
   - **anon public key**: una clave larga (empieza con `eyJ...`)

### PASO 5: Configurar el proyecto (4 minutos)

1. **Abre Visual Studio Code**
2. Abre la carpeta `tienda-teoma` (File → Open Folder)
3. Abre una terminal (Terminal → New Terminal)
4. Instala dependencias:
   ```bash
   npm install
   ```
   ⏱️ Esto toma 2-3 minutos

5. **Crea el archivo `.env.local`** en la raíz del proyecto:
   - Click derecho en el panel izquierdo → New File
   - Nombra el archivo: `.env.local`
   - Pega esto y **reemplaza con tus datos**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_aqui
   ```

6. **¡Inicia la aplicación!**
   ```bash
   npm run dev
   ```

7. Abre tu navegador en: **http://localhost:3000**

### ✅ ¡Listo! Tu aplicación está funcionando

---

## 🎯 ¿Qué hacer ahora?

1. **Agrega tus primeros productos**:
   - Click en "Productos" en el menú
   - Click en "+ Nuevo Producto"
   - Llena el formulario

2. **Agrega lotes al inventario**:
   - Click en "+ Agregar Lote"
   - Selecciona el producto
   - Agrega número de lote, fecha de vencimiento, etc.

3. **Prueba una venta**:
   - Click en "Ventas"
   - Selecciona un producto
   - Agrega al carrito
   - Finaliza la venta

4. **Revisa estadísticas**:
   - Click en "Estadísticas"
   - Verás gráficos de tus ventas

---

## 📤 SUBIR A NETLIFY (OPCIONAL)

### Opción A: Con GitHub (Recomendado)

1. **Crear repositorio en GitHub**:
   - Ve a: https://github.com/new
   - Nombre: `tienda-teoma`
   - Click "Create repository"

2. **Subir código** (en la terminal de VS Code):
   ```bash
   git init
   git add .
   git commit -m "Primer commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/tienda-teoma.git
   git push -u origin main
   ```

3. **Conectar con Netlify**:
   - Ve a: https://netlify.com
   - Sign up (gratis)
   - "Add new site" → "Import an existing project"
   - Conecta GitHub
   - Selecciona `tienda-teoma`
   - **Configuración**:
     - Build command: `npm run build`
     - Publish directory: `.next`
   - **Variables de entorno** (muy importante):
     - Click "Add environment variable"
     - Agrega:
       - `NEXT_PUBLIC_SUPABASE_URL` = tu URL de Supabase
       - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu key de Supabase
   - Click "Deploy"

4. **¡Espera 2-3 minutos!**
   - Netlify te dará una URL pública
   - Ejemplo: `https://tienda-teoma.netlify.app`

### Opción B: Deploy Directo con Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

---

## 🆘 PROBLEMAS COMUNES

### "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Cannot connect to Supabase"
- Verifica que las credenciales en `.env.local` sean correctas
- Reinicia el servidor: `Ctrl+C` y luego `npm run dev`

### Error en Netlify
- Asegúrate de agregar las variables de entorno
- Verifica: Build command = `npm run build`

---

## 📞 ¿Necesitas ayuda?

1. Revisa la consola del navegador: `F12` → Console
2. Revisa los logs de Supabase en tu dashboard
3. Revisa el archivo README.md completo

---

## 🎉 ¡Éxito!

Tu sistema de inventario está listo. Ahora puedes:
- ✅ Gestionar productos
- ✅ Controlar inventario (Almacén/Mostrador)
- ✅ Registrar ventas
- ✅ Ver estadísticas en tiempo real
- ✅ Alertas de vencimiento

**¡Felicitaciones! 🎊**
