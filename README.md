# 🍵 Sistema de Inventario - Tienda Teoma

Sistema completo de gestión de inventario, ventas y estadísticas para tu tienda de Teoma.

## 📋 Requisitos Previos

Antes de empezar, asegúrate de tener instalado:

1. **Node.js** (versión 18 o superior)
   - Descarga desde: https://nodejs.org/
   - Verifica la instalación: `node --version`

2. **Visual Studio Code**
   - Ya lo tienes ✅

3. **Git** (para subir a Netlify)
   - Descarga desde: https://git-scm.com/
   - Verifica la instalación: `git --version`

## 🚀 Instalación Paso a Paso

### Paso 1: Crear cuenta en Supabase (GRATIS)

1. Ve a: https://supabase.com
2. Click en "Start your project"
3. Regístrate con tu email o GitHub
4. Crea un nuevo proyecto:
   - Nombre: `tienda-teoma`
   - Database Password: (guarda esta contraseña)
   - Region: South America (São Paulo)
5. Espera 2 minutos mientras se crea el proyecto

### Paso 2: Configurar la Base de Datos

1. En Supabase, ve a "SQL Editor" (menú izquierdo)
2. Click en "New Query"
3. Copia y pega todo el contenido del archivo `supabase-schema.sql`
4. Click en "RUN" para crear las tablas

### Paso 3: Obtener las credenciales de Supabase

1. En Supabase, ve a "Settings" → "API"
2. Copia estos dos valores:
   - **Project URL** (ejemplo: https://xxx.supabase.co)
   - **anon public key** (una clave larga)

### Paso 4: Instalar el proyecto en tu computadora

1. Abre Visual Studio Code
2. Abre una terminal (Terminal → New Terminal)
3. Navega a donde quieres crear el proyecto:
   ```bash
   cd Desktop
   # o donde prefieras
   ```

4. Copia la carpeta `tienda-teoma` a tu computadora

5. Dentro de la carpeta del proyecto, instala las dependencias:
   ```bash
   npm install
   ```
   (Esto tomará 2-3 minutos)

### Paso 5: Configurar las variables de entorno

1. Crea un archivo llamado `.env.local` en la raíz del proyecto
2. Pega esto y reemplaza con tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_project_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### Paso 6: Iniciar el proyecto localmente

```bash
npm run dev
```

Abre tu navegador en: http://localhost:3000

¡Ya deberías ver tu aplicación funcionando! 🎉

## 📤 Subir a Netlify (GRATIS)

### Opción 1: Deploy desde GitHub (Recomendado)

1. **Crear repositorio en GitHub:**
   - Ve a: https://github.com
   - Click en "New repository"
   - Nombre: `tienda-teoma`
   - Click en "Create repository"

2. **Subir el código:**
   ```bash
   git init
   git add .
   git commit -m "Primer commit - Sistema Teoma"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/tienda-teoma.git
   git push -u origin main
   ```

3. **Conectar con Netlify:**
   - Ve a: https://netlify.com
   - Regístrate (gratis)
   - Click en "Add new site" → "Import an existing project"
   - Conecta tu cuenta de GitHub
   - Selecciona el repositorio `tienda-teoma`
   - Configuración:
     - Build command: `npm run build`
     - Publish directory: `.next`
   - En "Environment variables" agrega:
     - `NEXT_PUBLIC_SUPABASE_URL` = tu URL de Supabase
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu clave de Supabase
   - Click en "Deploy"

4. **¡Listo!** En 2-3 minutos tendrás tu URL pública

### Opción 2: Deploy directo con Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

## 📁 Estructura del Proyecto

```
tienda-teoma/
├── app/                    # Páginas de Next.js
│   ├── layout.js          # Layout principal
│   ├── page.js            # Dashboard principal
│   ├── inventario/        # Gestión de inventario
│   ├── ventas/            # Sistema de ventas
│   └── estadisticas/      # Reportes y gráficos
├── components/            # Componentes reutilizables
│   ├── Navbar.js         # Navegación
│   ├── InventarioTable.js
│   └── VentasForm.js
├── lib/                   # Utilidades
│   └── supabase.js       # Cliente de Supabase
├── public/               # Archivos estáticos
├── .env.local           # Variables de entorno (NO SUBIR A GIT)
├── .gitignore
├── package.json
└── README.md
```

## 🔧 Comandos Útiles

- `npm run dev` - Iniciar en modo desarrollo
- `npm run build` - Compilar para producción
- `npm start` - Iniciar en modo producción
- `npm run lint` - Verificar código

## 🐛 Solución de Problemas

### Error: "Module not found: Can't resolve '@/lib/supabase'"
**Solución**: Asegúrate de que existe el archivo `jsconfig.json` en la raíz del proyecto con este contenido:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```
Luego reinicia el servidor (Ctrl+C y `npm run dev`)

### Error: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### La aplicación no se conecta a Supabase
- Verifica que las credenciales en `.env.local` sean correctas
- Reinicia el servidor: Ctrl+C y luego `npm run dev`

### Error en Netlify
- Asegúrate de haber agregado las variables de entorno en Netlify
- Verifica que el Build command sea: `npm run build`

## 📞 Soporte

Si tienes problemas, revisa:
1. La consola del navegador (F12 → Console)
2. Los logs de Supabase (en el dashboard)
3. Los logs de Netlify (en el dashboard de deploy)

## 🎯 Próximos Pasos

Una vez que todo funcione:

1. Agrega tus productos iniciales
2. Configura los lotes en almacén
3. Registra tu primera venta
4. Revisa las estadísticas

¡Éxito con tu tienda! 🚀
