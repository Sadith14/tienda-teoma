'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ProductosPage() {
  const [productos, setProductos] = useState([])
  const [mostrarFormProducto, setMostrarFormProducto] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [loading, setLoading] = useState(true)

  // Formulario simplificado
  const [formProducto, setFormProducto] = useState({
    nombre: '',
    tipo: 'Pote',
    precio_base: '',
    fecha_vencimiento: '',
    ubicacion: 'almacen',
    cantidad: ''
  })

  useEffect(() => {
    cargarProductos()
  }, [])

  async function cargarProductos() {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          lotes (
            id,
            fecha_vencimiento,
            ubicacion,
            cantidad
          )
        `)
        .eq('activo', true)
        .order('nombre')

      if (error) throw error

      // Calcular stock total por ubicación
      const productosConStock = data?.map(producto => {
        const stockMostrador = producto.lotes
          ?.filter(l => l.ubicacion === 'mostrador')
          .reduce((sum, l) => sum + l.cantidad, 0) || 0
        
        const stockAlmacen = producto.lotes
          ?.filter(l => l.ubicacion === 'almacen')
          .reduce((sum, l) => sum + l.cantidad, 0) || 0

        return {
          ...producto,
          stockMostrador,
          stockAlmacen,
          stockTotal: stockMostrador + stockAlmacen
        }
      })

      setProductos(productosConStock || [])
    } catch (error) {
      console.error('Error cargando productos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function guardarProducto() {
    // Validar campos obligatorios
    if (!formProducto.nombre || !formProducto.precio_base || !formProducto.fecha_vencimiento || !formProducto.cantidad) {
      alert('Todos los campos son obligatorios')
      return
    }

    try {
      if (productoSeleccionado) {
        // ACTUALIZAR PRODUCTO EXISTENTE
        const { error } = await supabase
          .from('productos')
          .update({
            nombre: formProducto.nombre,
            tipo: formProducto.tipo,
            precio_base: parseFloat(formProducto.precio_base)
          })
          .eq('id', productoSeleccionado.id)

        if (error) throw error
        alert('Producto actualizado con éxito')
      } else {
        // CREAR NUEVO PRODUCTO + LOTE INICIAL
        const { data: nuevoProducto, error: errorProducto } = await supabase
          .from('productos')
          .insert({
            nombre: formProducto.nombre,
            tipo: formProducto.tipo,
            precio_base: parseFloat(formProducto.precio_base),
            activo: true
          })
          .select()
          .single()

        if (errorProducto) throw errorProducto

        // Crear lote inicial (sin número de lote ni número de caja)
        const { data: nuevoLote, error: errorLote } = await supabase
          .from('lotes')
          .insert({
            producto_id: nuevoProducto.id,
            numero_lote: `AUTO-${Date.now()}`, // Generamos uno automático para la BD
            fecha_vencimiento: formProducto.fecha_vencimiento,
            ubicacion: formProducto.ubicacion,
            cantidad: parseInt(formProducto.cantidad)
          })
          .select()
          .single()

        if (errorLote) throw errorLote

        // Registrar movimiento de entrada
        await supabase
          .from('movimientos')
          .insert({
            lote_id: nuevoLote.id,
            tipo: 'entrada',
            cantidad: parseInt(formProducto.cantidad),
            ubicacion_destino: formProducto.ubicacion,
            notas: 'Stock inicial del producto'
          })

        alert('Producto agregado con éxito')
      }

      cerrarFormulario()
      cargarProductos()
    } catch (error) {
      console.error('Error guardando producto:', error)
      alert('Error al guardar: ' + error.message)
    }
  }

  function editarProducto(producto) {
    setProductoSeleccionado(producto)
    setFormProducto({
      nombre: producto.nombre,
      tipo: producto.tipo || 'Pote',
      precio_base: producto.precio_base,
      fecha_vencimiento: '',
      ubicacion: 'almacen',
      cantidad: ''
    })
    setMostrarFormProducto(true)
  }

  async function eliminarProducto(id) {
    if (!confirm('¿Estás seguro de eliminar este producto? Se eliminarán también todos sus lotes.')) return

    try {
      // Eliminar lotes físicamente
      const { error: errorLotes } = await supabase
        .from('lotes')
        .delete()
        .eq('producto_id', id)

      if (errorLotes) {
        console.warn('Advertencia al eliminar lotes:', errorLotes)
      }

      // Marcar producto como inactivo
      const { error } = await supabase
        .from('productos')
        .update({ activo: false })
        .eq('id', id)

      if (error) throw error
      
      alert('Producto eliminado correctamente')
      cargarProductos()
    } catch (error) {
      console.error('Error eliminando producto:', error)
      alert('Error al eliminar el producto: ' + error.message)
    }
  }

  async function eliminarLote(loteId) {
    if (!confirm('¿Estás seguro de eliminar este stock?')) return

    try {
      const { error } = await supabase
        .from('lotes')
        .delete()
        .eq('id', loteId)

      if (error) throw error
      alert('Stock eliminado')
      cargarProductos()
    } catch (error) {
      console.error('Error eliminando stock:', error)
      alert('Error al eliminar: ' + error.message)
    }
  }

  function cerrarFormulario() {
    setMostrarFormProducto(false)
    setProductoSeleccionado(null)
    setFormProducto({
      nombre: '',
      tipo: 'Pote',
      precio_base: '',
      fecha_vencimiento: '',
      ubicacion: 'almacen',
      cantidad: ''
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Productos</h1>
          <button
            onClick={() => {
              setProductoSeleccionado(null)
              setFormProducto({
                nombre: '',
                tipo: 'Pote',
                precio_base: '',
                fecha_vencimiento: '',
                ubicacion: 'almacen',
                cantidad: ''
              })
              setMostrarFormProducto(true)
            }}
            className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 font-semibold"
          >
            + Agregar Producto
          </button>
        </div>

        {/* Lista de productos con sus lotes */}
        <div className="space-y-6">
          {productos.map((producto) => (
            <div key={producto.id} className="bg-white shadow-md rounded-lg overflow-hidden">
              {/* Cabecera del producto */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{producto.nombre}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>Tipo: <strong>{producto.tipo || 'N/A'}</strong></span>
                      <span>Precio: <strong className="text-green-600">S/ {parseFloat(producto.precio_base).toFixed(2)}</strong></span>
                    </div>
                    <div className="mt-2 flex gap-3">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Mostrador: {producto.stockMostrador}
                      </span>
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Almacén: {producto.stockAlmacen}
                      </span>
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        Total: {producto.stockTotal}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editarProducto(producto)}
                      className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarProducto(producto.id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabla de stock por ubicación */}
              {producto.lotes && producto.lotes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {producto.lotes.map((lote) => {
                        const esProximoVencer = () => {
                          const hoy = new Date()
                          const vencimiento = new Date(lote.fecha_vencimiento)
                          const diasDiferencia = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24))
                          return diasDiferencia <= 30 && diasDiferencia > 0
                        }
                        
                        const estaVencido = () => {
                          const hoy = new Date()
                          const vencimiento = new Date(lote.fecha_vencimiento)
                          return vencimiento < hoy
                        }

                        return (
                          <tr key={lote.id} className={
                            estaVencido() 
                              ? 'bg-red-50' 
                              : esProximoVencer() 
                              ? 'bg-yellow-50' 
                              : ''
                          }>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={
                                estaVencido()
                                  ? 'text-red-600 font-semibold'
                                  : esProximoVencer()
                                  ? 'text-yellow-600 font-semibold'
                                  : 'text-gray-500'
                              }>
                                {new Date(lote.fecha_vencimiento).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                lote.ubicacion === 'mostrador'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {lote.ubicacion === 'mostrador' ? 'Mostrador' : 'Almacén'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {lote.cantidad}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => eliminarLote(lote.id)}
                                className="text-red-600 hover:text-red-900 font-medium"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  Este producto no tiene stock registrado
                </div>
              )}
            </div>
          ))}

          {productos.length === 0 && (
            <div className="bg-white shadow rounded-lg px-6 py-12 text-center">
              <p className="text-gray-500 text-lg">No hay productos registrados</p>
              <p className="text-gray-400 text-sm mt-2">Haz clic en "Agregar Producto" para comenzar</p>
            </div>
          )}
        </div>

        {/* Modal Formulario SIMPLIFICADO */}
        {mostrarFormProducto && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={cerrarFormulario}></div>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <h3 className="text-xl leading-6 font-bold text-gray-900 mb-6">
                  {productoSeleccionado ? 'Editar Producto' : 'Agregar Nuevo Producto'}
                </h3>

                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      value={formProducto.nombre}
                      onChange={(e) => setFormProducto({...formProducto, nombre: e.target.value})}
                      placeholder="Ej: Té Verde Premium"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Tipo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo *
                    </label>
                    <select
                      value={formProducto.tipo}
                      onChange={(e) => setFormProducto({...formProducto, tipo: e.target.value})}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="Pote">Pote</option>
                      <option value="Sobres">Sobres</option>
                      <option value="Caja">Caja</option>
                      <option value="Bolsa">Bolsa</option>
                      <option value="Unidad">Unidad</option>
                    </select>
                  </div>

                  {/* Precio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio Base por Unidad (S/) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formProducto.precio_base}
                      onChange={(e) => setFormProducto({...formProducto, precio_base: e.target.value})}
                      placeholder="15.50"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {!productoSeleccionado && (
                    <>
                      {/* Fecha de vencimiento */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha de Vencimiento *
                        </label>
                        <input
                          type="date"
                          value={formProducto.fecha_vencimiento}
                          onChange={(e) => setFormProducto({...formProducto, fecha_vencimiento: e.target.value})}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      {/* Ubicación */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ubicación *
                        </label>
                        <select
                          value={formProducto.ubicacion}
                          onChange={(e) => setFormProducto({...formProducto, ubicacion: e.target.value})}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="almacen">Almacén</option>
                          <option value="mostrador">Mostrador</option>
                        </select>
                      </div>

                      {/* Cantidad */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cantidad Inicial *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formProducto.cantidad}
                          onChange={(e) => setFormProducto({...formProducto, cantidad: e.target.value})}
                          placeholder="50"
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    onClick={cerrarFormulario}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={guardarProducto}
                    className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
                  >
                    {productoSeleccionado ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}