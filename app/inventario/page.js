'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function InventarioPage() {
  const [inventarioAgrupado, setInventarioAgrupado] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroUbicacion, setFiltroUbicacion] = useState('todos')
  const [expandidos, setExpandidos] = useState({})
  const [mostrarTraspaso, setMostrarTraspaso] = useState(false)
  const [loteSeleccionado, setLoteSeleccionado] = useState(null)
  const [cantidadTraspaso, setCantidadTraspaso] = useState(0)
  const [ubicacionDestino, setUbicacionDestino] = useState('')

  useEffect(() => {
    cargarInventario()
  }, [])

  async function cargarInventario() {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select(`
          *,
          productos!inner (
            id,
            nombre,
            tipo,
            activo
          )
        `)
        .eq('productos.activo', true)
        .gt('cantidad', 0)
        .order('fecha_vencimiento', { ascending: true })

      if (error) throw error

      // Agrupar por producto + ubicación
      const agrupado = {}
      data?.forEach(lote => {
        const key = `${lote.productos.id}-${lote.ubicacion}`
        if (!agrupado[key]) {
          agrupado[key] = {
            producto_id: lote.productos.id,
            producto_nombre: lote.productos.nombre,
            producto_tipo: lote.productos.tipo,
            ubicacion: lote.ubicacion,
            cantidad_total: 0,
            lotes: []
          }
        }
        agrupado[key].cantidad_total += lote.cantidad
        agrupado[key].lotes.push(lote)
      })

      setInventarioAgrupado(Object.values(agrupado))
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleExpandir(key) {
    setExpandidos(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  async function traspasar() {
    if (!loteSeleccionado || cantidadTraspaso <= 0 || !ubicacionDestino) {
      alert('Completa todos los campos')
      return
    }

    if (cantidadTraspaso > loteSeleccionado.cantidad) {
      alert('No hay suficiente cantidad')
      return
    }

    try {
      const { error } = await supabase.rpc('traspasar_inventario', {
        p_lote_id: loteSeleccionado.id,
        p_cantidad: cantidadTraspaso,
        p_destino: ubicacionDestino
      })

      if (error) throw error

      alert('✅ Traspaso realizado')
      setMostrarTraspaso(false)
      setLoteSeleccionado(null)
      cargarInventario()
    } catch (error) {
      console.error('Error:', error)
      alert('Error: ' + error.message)
    }
  }

  const inventarioFiltrado = inventarioAgrupado.filter(grupo => {
    if (filtroUbicacion === 'todos') return true
    return grupo.ubicacion === filtroUbicacion
  })

  const esProximoVencer = (fecha) => {
    const hoy = new Date()
    const vencimiento = new Date(fecha)
    const dias = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24))
    return dias <= 30 && dias > 0
  }

  const estaVencido = (fecha) => {
    return new Date(fecha) < new Date()
  }

  const getNombreUbicacion = (ubicacion) => {
    const nombres = {
      'almacen': 'Almacén',
      'mostrador1': 'Mostrador 1',
      'mostrador2': 'Mostrador 2'
    }
    return nombres[ubicacion] || ubicacion
  }

  const getColorUbicacion = (ubicacion) => {
    const colores = {
      'almacen': 'bg-blue-100 text-blue-800',
      'mostrador1': 'bg-green-100 text-green-800',
      'mostrador2': 'bg-purple-100 text-purple-800'
    }
    return colores[ubicacion] || 'bg-gray-100 text-gray-800'
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
              onClick={() => setFiltroUbicacion('mostrador1')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filtroUbicacion === 'mostrador1'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Mostrador 1
            </button>
            <button
              onClick={() => setFiltroUbicacion('mostrador2')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filtroUbicacion === 'mostrador2'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Mostrador 2
            </button>
            <button
              onClick={() => setFiltroUbicacion('almacen')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filtroUbicacion === 'almacen'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Almacén
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventarioFiltrado.map((grupo) => {
                const key = `${grupo.producto_id}-${grupo.ubicacion}`
                const expandido = expandidos[key]

                return (
                  <>
                    {/* Fila agrupada (resumen) */}
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{grupo.producto_nombre}</div>
                        <div className="text-sm text-gray-500">{grupo.producto_tipo}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getColorUbicacion(grupo.ubicacion)}`}>
                          {getNombreUbicacion(grupo.ubicacion)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-lg font-bold text-gray-900">
                        {grupo.cantidad_total}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => toggleExpandir(key)}
                          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-900 font-medium"
                        >
                          {expandido ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              Ocultar Detalles
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              Ver Detalles ({grupo.lotes.length} lotes)
                            </>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Detalles expandidos (lotes individuales) */}
                    {expandido && (
                      <tr key={`${key}-detalles`}>
                        <td colSpan="4" className="px-6 py-4 bg-gray-50">
                          <div className="pl-8">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Detalle por fecha de vencimiento:
                            </h4>
                            <table className="min-w-full divide-y divide-gray-300">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Fecha de Vencimiento</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Cantidad</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Estado</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {grupo.lotes.map(lote => {
                                  const vencido = estaVencido(lote.fecha_vencimiento)
                                  const proximoVencer = esProximoVencer(lote.fecha_vencimiento)

                                  return (
                                    <tr key={lote.id} className={
                                      vencido
                                        ? 'bg-red-50'
                                        : proximoVencer
                                        ? 'bg-yellow-50'
                                        : 'bg-white'
                                    }>
                                      <td className="px-4 py-3 text-sm">
                                        <span className={
                                          vencido
                                            ? 'text-red-600 font-semibold'
                                            : proximoVencer
                                            ? 'text-yellow-600 font-semibold'
                                            : 'text-gray-700'
                                        }>
                                          {new Date(lote.fecha_vencimiento).toLocaleDateString('es-PE', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                          })}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                        {lote.cantidad} unidades
                                      </td>
                                      <td className="px-4 py-3 text-sm">
                                        {vencido ? (
                                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                            ⚠️ Vencido
                                          </span>
                                        ) : proximoVencer ? (
                                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                            ⏰ Próximo a vencer
                                          </span>
                                        ) : (
                                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                            ✓ Vigente
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-sm">
                                        <button
                                          onClick={() => {
                                            setLoteSeleccionado(lote)
                                            setCantidadTraspaso(lote.cantidad)
                                            // Determinar ubicación destino
                                            if (lote.ubicacion === 'almacen') {
                                              setUbicacionDestino('mostrador1')
                                            } else {
                                              setUbicacionDestino('almacen')
                                            }
                                            setMostrarTraspaso(true)
                                          }}
                                          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-900 font-medium"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                          </svg>
                                          Traspasar
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>

          {inventarioFiltrado.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-2">No hay productos en esta ubicación</p>
            </div>
          )}
        </div>

        {/* Modal de traspaso */}
        {mostrarTraspaso && loteSeleccionado && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setMostrarTraspaso(false)}></div>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Traspasar Inventario</h3>
                </div>
                
                <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <p><strong className="text-gray-700">Producto:</strong> <span className="text-gray-900">{loteSeleccionado.productos?.nombre}</span></p>
                  <p><strong className="text-gray-700">Ubicación actual:</strong> 
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getColorUbicacion(loteSeleccionado.ubicacion)}`}>
                      {getNombreUbicacion(loteSeleccionado.ubicacion)}
                    </span>
                  </p>
                  <p><strong className="text-gray-700">Cantidad disponible:</strong> <span className="font-bold text-gray-900">{loteSeleccionado.cantidad}</span></p>
                  <p><strong className="text-gray-700">Vencimiento:</strong> <span className="text-gray-900">{new Date(loteSeleccionado.fecha_vencimiento).toLocaleDateString('es-PE')}</span></p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación destino *</label>
                  <select
                    value={ubicacionDestino}
                    onChange={(e) => setUbicacionDestino(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    {loteSeleccionado.ubicacion === 'almacen' ? (
                      <>
                        <option value="mostrador1">Mostrador 1</option>
                        <option value="mostrador2">Mostrador 2</option>
                      </>
                    ) : (
                      <option value="almacen">Almacén</option>
                    )}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad a traspasar *</label>
                  <input
                    type="number"
                    min="1"
                    max={loteSeleccionado.cantidad}
                    value={cantidadTraspaso}
                    onChange={(e) => setCantidadTraspaso(parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={traspasar}
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium"
                  >
                    Confirmar Traspaso
                  </button>
                  <button
                    onClick={() => setMostrarTraspaso(false)}
                    className="flex-1 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 font-medium"
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