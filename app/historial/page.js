'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function HistorialPage() {
  const [movimientos, setMovimientos] = useState([])
  const [movimientosFiltrados, setMovimientosFiltrados] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  
  // Lista de productos para el filtro
  const [productos, setProductos] = useState([])

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    aplicarFiltros()
  }, [movimientos, filtroTipo, filtroProducto, filtroFechaInicio, filtroFechaFin])

  async function cargarDatos() {
    try {
      // Cargar movimientos
      const { data: movimientosData, error: errorMovimientos } = await supabase
        .from('movimientos')
        .select(`
          *,
          lotes (
            id,
            numero_lote,
            productos (
              id,
              nombre,
              tipo
            )
          )
        `)
        .order('fecha', { ascending: false })

      if (errorMovimientos) throw errorMovimientos

      setMovimientos(movimientosData || [])

      // Cargar lista de productos para el filtro
      const { data: productosData, error: errorProductos } = await supabase
        .from('productos')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')

      if (errorProductos) throw errorProductos

      setProductos(productosData || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  function aplicarFiltros() {
    let resultado = [...movimientos]

    // Filtrar por tipo
    if (filtroTipo !== 'todos') {
      resultado = resultado.filter(m => m.tipo === filtroTipo)
    }

    // Filtrar por producto
    if (filtroProducto) {
      resultado = resultado.filter(m => 
        m.lotes?.productos?.id === filtroProducto
      )
    }

    // Filtrar por fecha de inicio
    if (filtroFechaInicio) {
      resultado = resultado.filter(m => 
        new Date(m.fecha) >= new Date(filtroFechaInicio + 'T00:00:00')
      )
    }

    // Filtrar por fecha de fin
    if (filtroFechaFin) {
      resultado = resultado.filter(m => 
        new Date(m.fecha) <= new Date(filtroFechaFin + 'T23:59:59')
      )
    }

    setMovimientosFiltrados(resultado)
  }

  function limpiarFiltros() {
    setFiltroTipo('todos')
    setFiltroProducto('')
    setFiltroFechaInicio('')
    setFiltroFechaFin('')
  }

  function exportarAExcel() {
    // Preparar datos para exportar
    const datos = movimientosFiltrados.map(mov => ({
      'Fecha': new Date(mov.fecha).toLocaleString('es-PE'),
      'Tipo': mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1),
      'Producto': mov.lotes?.productos?.nombre || 'N/A',
      'Tipo Producto': mov.lotes?.productos?.tipo || 'N/A',
      'Cantidad': mov.cantidad,
      'Origen': mov.ubicacion_origen || '-',
      'Destino': mov.ubicacion_destino || '-',
      'Notas': mov.notas || '-'
    }))

    // Convertir a CSV
    const headers = Object.keys(datos[0] || {}).join(',')
    const rows = datos.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    )
    const csv = [headers, ...rows].join('\n')

    // Crear blob y descargar
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `historial_movimientos_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function getTipoColor(tipo) {
    switch(tipo) {
      case 'entrada':
        return 'bg-blue-100 text-blue-800'
      case 'venta':
        return 'bg-red-100 text-red-800'
      case 'traspaso':
        return 'bg-yellow-100 text-yellow-800'
      case 'ajuste':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  function getTipoIcono(tipo) {
    switch(tipo) {
      case 'entrada':
        return '📥'
      case 'venta':
        return '💰'
      case 'traspaso':
        return '🔄'
      case 'ajuste':
        return '⚙️'
      default:
        return '📦'
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Historial de Movimientos</h1>
          <button
            onClick={exportarAExcel}
            disabled={movimientosFiltrados.length === 0}
            className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar a Excel
          </button>
        </div>

        {/* Panel de Filtros */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Filtros</h2>
            <button
              onClick={limpiarFiltros}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Movimiento
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="todos">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="venta">Venta</option>
                <option value="traspaso">Traspaso</option>
                <option value="ajuste">Ajuste</option>
              </select>
            </div>

            {/* Filtro por Producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto
              </label>
              <select
                value={filtroProducto}
                onChange={(e) => setFiltroProducto(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos los productos</option>
                {productos.map(producto => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Fecha Inicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={filtroFechaInicio}
                onChange={(e) => setFiltroFechaInicio(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Filtro Fecha Fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={filtroFechaFin}
                onChange={(e) => setFiltroFechaFin(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="mt-4 text-sm text-gray-600">
            Mostrando <strong>{movimientosFiltrados.length}</strong> de <strong>{movimientos.length}</strong> movimientos
          </div>
        </div>

        {/* Tabla de Movimientos */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha y Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movimientosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No hay movimientos que coincidan con los filtros
                    </td>
                  </tr>
                ) : (
                  movimientosFiltrados.map((movimiento) => (
                    <tr key={movimiento.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(movimiento.fecha).toLocaleString('es-PE', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getTipoColor(movimiento.tipo)} flex items-center gap-1 w-fit`}>
                          <span>{getTipoIcono(movimiento.tipo)}</span>
                          {movimiento.tipo.charAt(0).toUpperCase() + movimiento.tipo.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {movimiento.lotes?.productos?.nombre || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {movimiento.lotes?.productos?.tipo || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {movimiento.tipo === 'venta' || movimiento.tipo === 'ajuste' ? '-' : '+'}{movimiento.cantidad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movimiento.tipo === 'traspaso' ? (
                          <div className="flex items-center gap-1">
                            <span className="text-blue-600">{movimiento.ubicacion_origen}</span>
                            <span>→</span>
                            <span className="text-green-600">{movimiento.ubicacion_destino}</span>
                          </div>
                        ) : movimiento.tipo === 'entrada' ? (
                          <span className="text-green-600">{movimiento.ubicacion_destino}</span>
                        ) : movimiento.tipo === 'venta' ? (
                          <span className="text-red-600">{movimiento.ubicacion_origen}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {movimiento.notas || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen de movimientos */}
        {movimientosFiltrados.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Entradas</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {movimientosFiltrados
                      .filter(m => m.tipo === 'entrada')
                      .reduce((sum, m) => sum + m.cantidad, 0)}
                  </p>
                </div>
                <span className="text-3xl">📥</span>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Total Ventas</p>
                  <p className="text-2xl font-bold text-red-700">
                    {movimientosFiltrados
                      .filter(m => m.tipo === 'venta')
                      .reduce((sum, m) => sum + m.cantidad, 0)}
                  </p>
                </div>
                <span className="text-3xl">💰</span>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Total Traspasos</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {movimientosFiltrados
                      .filter(m => m.tipo === 'traspaso')
                      .reduce((sum, m) => sum + m.cantidad, 0)}
                  </p>
                </div>
                <span className="text-3xl">🔄</span>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Ajustes</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {movimientosFiltrados
                      .filter(m => m.tipo === 'ajuste')
                      .reduce((sum, m) => sum + m.cantidad, 0)}
                  </p>
                </div>
                <span className="text-3xl">⚙️</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}