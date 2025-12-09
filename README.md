# Control Proveeduría Web

Sistema web sencillo para llevar el control de compras por placa, proveedor y CEDIS.

## Requisitos

- Node.js 18+
- npm
- El paquete `sqlite3` se instalará automáticamente con `npm install`.

## Cómo usar

1. Descomprime el proyecto.
2. Entra a la carpeta del proyecto:

   ```bash
   cd control_proveeduria_web
   ```

3. Instala dependencias:

   ```bash
   npm install
   ```

4. Crea un archivo `.env` en la raíz del proyecto basado en `.env.example` (puedes simplemente copiarlo):

   ```bash
   cp .env.example .env
   ```

5. Inicia el servidor en modo desarrollo:

   ```bash
   npm run dev
   ```

   O en modo normal:

   ```bash
   npm start
   ```

6. Abre en el navegador:

   ```
   http://localhost:3000
   ```

## Funcionalidades

- Registrar compras con:
  - Fecha
  - CEDIS
  - Proveedor
  - Placa
  - Producto
  - Cantidad
  - Precio unitario
  - Solicitó
  - Observación

- Listado general con filtros por:
  - Placa
  - Proveedor
  - CEDIS

- Vista de historial por placa con totales:
  - Total cantidad
  - Total gastado

Los datos se guardan en un archivo SQLite en `./data/compras.db`.
"# control-proveeduria-web" 
