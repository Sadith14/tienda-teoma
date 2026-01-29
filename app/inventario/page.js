'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function InventarioPage() {
  const [inventarioAgrupado, setInventarioAgrupado] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroUbicacion, setFiltroUbicacion] = useState('todos')
  const [expandidos, setExpandidos] = useState({})
  
  // Modal de traspaso
  const [mostrarTraspaso, setMostrarTraspaso] = useState(false)
  const [loteSeleccionado, setLoteSeleccionado] = useState(null)
  const [cantidadTraspaso, setCantidadTraspaso] = useState(0)
  const [ubicacionDestino, setUbicacionDestino] = useState('')
  
  // Modal de editar cantidad
  const [mostrarEditarCantidad, setMostrarEditarCantidad] = useState(false)
  const [loteEditar, setLoteEditar] = useState(null)
  const [nuevaCantidad, setNuevaCantidad] = useState(0)

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

  async function guardarCantidad() {
    if (!loteEditar || nuevaCantidad < 0) {
      alert('Cantidad inválida')
      return
    }

    try {
      const diferencia = nuevaCantidad - loteEditar.cantidad

      // Actualizar cantidad del lote
      const { error: errorLote } = await supabase
        .from('lotes')
        .update({ cantidad: nuevaCantidad })
        .eq('id', loteEditar.id)

      if (errorLote) throw errorLote

      // Registrar movimiento de ajuste
      if (diferencia !== 0) {
        await supabase
          .from('movimientos')
          .insert({
            lote_id: loteEditar.id,
            tipo: 'ajuste',
            cantidad: Math.abs(diferencia),
            ubicacion_destino: loteEditar.ubicacion,
            notas: diferencia > 0 
              ? `Ajuste: +${diferencia} unidades agregadas`
              : `Ajuste: -${Math.abs(diferencia)} unidades removidas`
          })
      }

      alert('✅ Cantidad actualizada')
      setMostrarEditarCantidad(false)
      setLoteEditar(null)
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
                    {/* Fila agrupada */}
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
                              Ocultar
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              Ver Detalles ({grupo.lotes.length})
                            </>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Detalles expandidos */}
                    {expandido && (
                      <tr key={`${key}-detalles`}>
                        <td colSpan="4" className="px-6 py-4 bg-gray-50">
                          <div className="pl-8">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">📋 Detalle por lote:</h4>
                            <table className="min-w-full divide-y divide-gray-300">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Vencimiento</th>
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
                                      vencido ? 'bg-red-50' : proximoVencer ? 'bg-yellow-50' : 'bg-white'
                                    }>
                                      <td className="px-4 py-3 text-sm">
                                        <span className={
                                          vencido ? 'text-red-600 font-semibold' : proximoVencer ? 'text-yellow-600 font-semibold' : 'text-gray-700'
                                        }>
                                          {new Date(lote.fecha_vencimiento).toLocaleDateString('es-PE')}
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
                                      <td className="px-4 py-3 text-sm space-x-2">
                                        <button
                                          onClick={() => {
                                            setLoteEditar(lote)
                                            setNuevaCantidad(lote.cantidad)
                                            setMostrarEditarCantidad(true)
                                          }}
                                          className="text-blue-600 hover:text-blue-900 font-medium"
                                        >
                                          ✏️ Editar
                                        </button>
                                        <button
                                          onClick={() => {
                                            setLoteSeleccionado(lote)
                                            setCantidadTraspaso(lote.cantidad)
                                            setUbicacionDestino(lote.ubicacion === 'almacen' ? 'mostrador1' : 'almacen')
                                            setMostrarTraspaso(true)
                                          }}
                                          className="text-primary-600 hover:text-primary-900 font-medium"
                                        >
                                          🔄 Traspasar
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
              No hay productos en esta ubicación
            </div>
          )}
        </div>

        {/* Modal Editar Cantidad */}
        {mostrarEditarCantidad && loteEditar && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setMostrarEditarCantidad(false)}></div>

              <div className="inline-block bg-white rounded-lg px-6 py-6 shadow-xl transform transition-all sm:max-w-lg sm:w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Editar Cantidad</h3>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <p><strong>Producto:</strong> {loteEditar.productos?.nombre}</p>
                  <p><strong>Ubicación:</strong> 
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getColorUbicacion(loteEditar.ubicacion)}`}>
                      {getNombreUbicacion(loteEditar.ubicacion)}
                    </span>
                  </p>
                  <p><strong>Vencimiento:</strong> {new Date(loteEditar.fecha_vencimiento).toLocaleDateString('es-PE')}</p>
                  <p><strong>Cantidad actual:</strong> <span className="font-bold">{loteEditar.cantidad}</span></p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nueva cantidad *</label>
                  <input
                    type="number"
                    min="0"
                    value={nuevaCantidad}
                    onChange={(e) => setNuevaCantidad(parseInt(e.target.value) || 0)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {nuevaCantidad !== loteEditar.cantidad && (
                    <p className="mt-2 text-sm">
                      {nuevaCantidad > loteEditar.cantidad ? (
                        <span className="text-green-600">
                          +{nuevaCantidad - loteEditar.cantidad} unidades (agregando)
                        </span>
                      ) : (
                        <span className="text-red-600">
                          -{loteEditar.cantidad - nuevaCantidad} unidades (removiendo)
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={guardarCantidad}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
                  >
                    Guardar Cambios
                  </button>
                  <button
                    onClick={() => setMostrarEditarCantidad(false)}
                    className="flex-1 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Traspaso */}
        {mostrarTraspaso && loteSeleccionado && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setMostrarTraspaso(false)}></div>

              <div className="inline-block bg-white rounded-lg px-6 py-6 shadow-xl transform transition-all sm:max-w-lg sm:w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Traspasar Inventario</h3>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <p><strong>Producto:</strong> {loteSeleccionado.productos?.nombre}</p>
                  <p><strong>Ubicación actual:</strong> 
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getColorUbicacion(loteSeleccionado.ubicacion)}`}>
                      {getNombreUbicacion(loteSeleccionado.ubicacion)}
                    </span>
                  </p>
                  <p><strong>Cantidad disponible:</strong> {loteSeleccionado.cantidad}</p>
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
                    Confirmar
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