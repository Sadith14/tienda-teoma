'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function InventarioPage() {
  const [inventario, setInventario] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarTraspaso, setMostrarTraspaso] = useState(false)
  const [loteSeleccionado, setLoteSeleccionado] = useState(null)
  const [cantidadTraspaso, setCantidadTraspaso] = useState(0)
  const [filtroUbicacion, setFiltroUbicacion] = useState('todos')

  useEffect(() => {
    cargarInventario()
  }, [])

  async function cargarInventario() {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select(`
          *,
          productos (
            nombre,
            codigo_barras,
            precio_base,
            categoria
          )
        `)
        .gt('cantidad', 0)
        .order('fecha_vencimiento', { ascending: true })

      if (error) throw error
      setInventario(data || [])
    } catch (error) {
      console.error('Error cargando inventario:', error)
      alert('Error al cargar el inventario')
    } finally {
      setLoading(false)
    }
  }

  async function traspasar() {
    if (!loteSeleccionado || cantidadTraspaso <= 0) {
      alert('Selecciona un lote y una cantidad válida')
      return
    }

    if (cantidadTraspaso > loteSeleccionado.cantidad) {
      alert('No hay suficiente cantidad en el lote')
      return
    }

    const destino = loteSeleccionado.ubicacion === 'almacen' ? 'mostrador' : 'almacen'

    try {
      // Llamar a la función de Supabase para traspasar
      const { error } = await supabase.rpc('traspasar_inventario', {
        p_lote_id: loteSeleccionado.id,
        p_cantidad: cantidadTraspaso,
        p_destino: destino
      })

      if (error) throw error

      alert('Traspaso realizado con éxito')
      setMostrarTraspaso(false)
      setLoteSeleccionado(null)
      setCantidadTraspaso(0)
      cargarInventario()
    } catch (error) {
      console.error('Error en traspaso:', error)
      alert('Error al realizar el traspaso: ' + error.message)
    }
  }

  const inventarioFiltrado = inventario.filter(lote => {
    if (filtroUbicacion === 'todos') return true
    return lote.ubicacion === filtroUbicacion
  })

  const esProximoVencer = (fecha) => {
    const hoy = new Date()
    const vencimiento = new Date(fecha)
    const diasDiferencia = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24))
    return diasDiferencia <= 30 && diasDiferencia > 0
  }

  const estaVencido = (fecha) => {
    const hoy = new Date()
    const vencimiento = new Date(fecha)
    return vencimiento < hoy
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
          <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
          
          {/* Filtros */}
          <div className="flex gap-2">
            <button
              onClick={() => setFiltroUbicacion('todos')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filtroUbicacion === 'todos'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroUbicacion('mostrador')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filtroUbicacion === 'mostrador'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Mostrador
            </button>
            <button
              onClick={() => setFiltroUbicacion('almacen')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filtroUbicacion === 'almacen'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Almacén
            </button>
          </div>
        </div>

        {/* Tabla de inventario */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventarioFiltrado.map((lote) => (
                  <tr key={lote.id} className={
                    estaVencido(lote.fecha_vencimiento) 
                      ? 'bg-red-50' 
                      : esProximoVencer(lote.fecha_vencimiento) 
                      ? 'bg-yellow-50' 
                      : ''
                  }>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {lote.productos.nombre}
                      </div>
                      <div className="text-sm text-gray-500">
                        {lote.productos.tipo || lote.productos.categoria}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={
                        estaVencido(lote.fecha_vencimiento)
                          ? 'text-red-600 font-semibold'
                          : esProximoVencer(lote.fecha_vencimiento)
                          ? 'text-yellow-600 font-semibold'
                          : 'text-gray-500'
                      }>
                        {new Date(lote.fecha_vencimiento).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                        onClick={() => {
                          setLoteSeleccionado(lote)
                          setMostrarTraspaso(true)
                          setCantidadTraspaso(lote.cantidad)
                        }}
                        className="text-primary-600 hover:text-primary-900 font-medium"
                      >
                        Traspasar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {inventarioFiltrado.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay lotes en esta ubicación</p>
            </div>
          )}
        </div>

        {/* Modal de traspaso */}
        {mostrarTraspaso && loteSeleccionado && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setMostrarTraspaso(false)}></div>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Traspasar Inventario
                  </h3>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      <strong>Producto:</strong> {loteSeleccionado.productos.nombre}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Tipo:</strong> {loteSeleccionado.productos.tipo || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Ubicación actual:</strong> {loteSeleccionado.ubicacion === 'almacen' ? 'Almacén' : 'Mostrador'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Cantidad disponible:</strong> {loteSeleccionado.cantidad}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Destino:</strong> {loteSeleccionado.ubicacion === 'almacen' ? 'Mostrador' : 'Almacén'}
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad a traspasar
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={loteSeleccionado.cantidad}
                      value={cantidadTraspaso}
                      onChange={(e) => setCantidadTraspaso(parseInt(e.target.value))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={traspasar}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
                  >
                    Confirmar Traspaso
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarTraspaso(false)
                      setLoteSeleccionado(null)
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:text-sm"
                  >
                    Cancelar
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