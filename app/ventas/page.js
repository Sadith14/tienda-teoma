'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function VentasPage() {
  const [productos, setProductos] = useState([])
  const [lotesDisponibles, setLotesDisponibles] = useState([])
  const [carrito, setCarrito] = useState([])
  const [mostradorSeleccionado, setMostradorSeleccionado] = useState('mostrador1')
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [loteSeleccionado, setLoteSeleccionado] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [precioVenta, setPrecioVenta] = useState(0)
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [clienteNombre, setClienteNombre] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    cargarProductos()
  }, [])

  useEffect(() => {
    if (productoSeleccionado && mostradorSeleccionado) {
      cargarLotesDisponibles(productoSeleccionado, mostradorSeleccionado)
    }
  }, [productoSeleccionado, mostradorSeleccionado])

  async function cargarProductos() {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      setProductos(data || [])
    } catch (error) {
      console.error('Error cargando productos:', error)
    }
  }

  async function cargarLotesDisponibles(productoId, mostrador) {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('producto_id', productoId)
        .eq('ubicacion', mostrador)
        .gt('cantidad', 0)
        .order('fecha_vencimiento', { ascending: true })

      if (error) throw error
      setLotesDisponibles(data || [])
      
      // Auto-seleccionar el primer lote (el que vence primero - FIFO)
      if (data && data.length > 0) {
        setLoteSeleccionado(data[0].id)
      } else {
        setLoteSeleccionado('')
      }

      // Establecer precio base del producto
      const producto = productos.find(p => p.id === productoId)
      if (producto) {
        setPrecioVenta(producto.precio_base)
      }
    } catch (error) {
      console.error('Error cargando lotes:', error)
    }
  }

  function agregarAlCarrito() {
    if (!productoSeleccionado || !loteSeleccionado || cantidad <= 0) {
      alert('Completa todos los campos')
      return
    }

    const producto = productos.find(p => p.id === productoSeleccionado)
    const lote = lotesDisponibles.find(l => l.id === loteSeleccionado)

    if (cantidad > lote.cantidad) {
      alert('No hay suficiente stock en el lote seleccionado')
      return
    }

    // Verificar si ya existe en el carrito
    const existeEnCarrito = carrito.find(item => item.lote_id === loteSeleccionado)
    
    if (existeEnCarrito) {
      const nuevaCantidad = existeEnCarrito.cantidad + cantidad
      if (nuevaCantidad > lote.cantidad) {
        alert('No hay suficiente stock para la cantidad total')
        return
      }
      
      setCarrito(carrito.map(item => 
        item.lote_id === loteSeleccionado 
          ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * precioVenta }
          : item
      ))
    } else {
      setCarrito([...carrito, {
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        lote_id: lote.id,
        fecha_vencimiento: lote.fecha_vencimiento,
        cantidad: cantidad,
        precio_unitario: precioVenta,
        subtotal: cantidad * precioVenta,
        mostrador: mostradorSeleccionado
      }])
    }

    // Resetear campos
    setProductoSeleccionado('')
    setLoteSeleccionado('')
    setCantidad(1)
    setPrecioVenta(0)
    setLotesDisponibles([])
  }

  function eliminarDelCarrito(index) {
    setCarrito(carrito.filter((_, i) => i !== index))
  }

  async function procesarVenta() {
    if (carrito.length === 0) {
      alert('Agrega productos al carrito')
      return
    }

    setProcesando(true)

    try {
      const total = carrito.reduce((sum, item) => sum + item.subtotal, 0)

      // Insertar venta
      const { data: venta, error: errorVenta } = await supabase
        .from('ventas')
        .insert({
          total: total,
          metodo_pago: metodoPago,
          cliente_nombre: clienteNombre || null
        })
        .select()
        .single()

      if (errorVenta) throw errorVenta

      // Insertar detalle de ventas (esto activará el trigger automático)
      const detalles = carrito.map(item => ({
        venta_id: venta.id,
        producto_id: item.producto_id,
        lote_id: item.lote_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal
      }))

      const { error: errorDetalles } = await supabase
        .from('detalle_ventas')
        .insert(detalles)

      if (errorDetalles) throw errorDetalles

      alert(`¡Venta registrada con éxito!\nTotal: S/ ${total.toFixed(2)}`)
      
      // Resetear formulario
      setCarrito([])
      setClienteNombre('')
      setMetodoPago('efectivo')
      cargarProductos()
    } catch (error) {
      console.error('Error procesando venta:', error)
      alert('Error al procesar la venta: ' + error.message)
    } finally {
      setProcesando(false)
    }
  }

  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0)

  const getNombreMostrador = (mostrador) => {
    const nombres = {
      'mostrador1': 'Mostrador 1',
      'mostrador2': 'Mostrador 2'
    }
    return nombres[mostrador] || mostrador
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Registrar Venta</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario de productos */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Agregar Producto</h2>
              
              <div className="space-y-4">
                {/* Selector de Mostrador */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Desde qué mostrador vendes? *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setMostradorSeleccionado('mostrador1')
                        setProductoSeleccionado('')
                        setLotesDisponibles([])
                      }}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        mostradorSeleccionado === 'mostrador1'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="font-semibold">Mostrador 1</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMostradorSeleccionado('mostrador2')
                        setProductoSeleccionado('')
                        setLotesDisponibles([])
                      }}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        mostradorSeleccionado === 'mostrador2'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="font-semibold">Mostrador 2</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Info del mostrador seleccionado */}
                <div className={`p-3 rounded-lg ${
                  mostradorSeleccionado === 'mostrador1' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-purple-50 border border-purple-200'
                }`}>
                  <p className="text-sm font-medium">
                    📍 Vendiendo desde: <strong>{getNombreMostrador(mostradorSeleccionado)}</strong>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Solo se mostrarán productos disponibles en este mostrador
                  </p>
                </div>

                {/* Selector de producto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Producto *
                  </label>
                  <select
                    value={productoSeleccionado}
                    onChange={(e) => setProductoSeleccionado(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border"
                  >
                    <option value="">Selecciona un producto</option>
                    {productos.map(producto => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} ({producto.tipo}) - S/ {producto.precio_base}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de lote con fechas */}
                {productoSeleccionado && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Disponible en {getNombreMostrador(mostradorSeleccionado)}
                    </label>
                    {lotesDisponibles.length > 0 ? (
                      <select
                        value={loteSeleccionado}
                        onChange={(e) => setLoteSeleccionado(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border"
                      >
                        {lotesDisponibles.map(lote => {
                          const diasVencimiento = Math.ceil((new Date(lote.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24))
                          const proximoVencer = diasVencimiento <= 30 && diasVencimiento > 0
                          
                          return (
                            <option key={lote.id} value={lote.id}>
                              Stock: {lote.cantidad} | Vence: {new Date(lote.fecha_vencimiento).toLocaleDateString('es-PE')}
                              {proximoVencer && ' ⚠️ Próximo a vencer'}
                            </option>
                          )
                        })}
                      </select>
                    ) : (
                      <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          ⚠️ No hay stock disponible en {getNombreMostrador(mostradorSeleccionado)}
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">
                          Debes traspasar productos desde el Almacén primero
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Cantidad */}
                {lotesDisponibles.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={lotesDisponibles.find(l => l.id === loteSeleccionado)?.cantidad || 1}
                      value={cantidad}
                      onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                )}

                {/* Precio de venta */}
                {lotesDisponibles.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio de Venta (unitario) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={precioVenta}
                      onChange={(e) => setPrecioVenta(parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                )}

                <button
                  onClick={agregarAlCarrito}
                  disabled={lotesDisponibles.length === 0}
                  className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar al Carrito
                </button>
              </div>
            </div>
          </div>

          {/* Carrito */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-md rounded-lg p-6 sticky top-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Carrito de Venta</h2>
              
              {carrito.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No hay productos en el carrito</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {carrito.map((item, index) => (
                      <div key={index} className="border-b pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.producto_nombre}</p>
                            <p className="text-xs text-gray-500">
                              {item.cantidad} × S/ {item.precio_unitario.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Vence: {new Date(item.fecha_vencimiento).toLocaleDateString('es-PE')}
                            </p>
                            <p className="text-xs">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                item.mostrador === 'mostrador1' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {getNombreMostrador(item.mostrador)}
                              </span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              S/ {item.subtotal.toFixed(2)}
                            </p>
                            <button
                              onClick={() => eliminarDelCarrito(index)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-2xl font-bold text-primary-600">
                        S/ {totalCarrito.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Método de pago */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Pago
                    </label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="yape">Yape/Plin</option>
                    </select>
                  </div>

                  {/* Cliente (opcional) */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cliente (opcional)
                    </label>
                    <input
                      type="text"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="Nombre del cliente"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <button
                    onClick={procesarVenta}
                    disabled={procesando}
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {procesando ? 'Procesando...' : 'Finalizar Venta'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}