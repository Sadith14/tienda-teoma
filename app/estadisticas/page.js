'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function EstadisticasPage() {
  const [ventasPorDia, setVentasPorDia] = useState([])
  const [productosMasVendidos, setProductosMasVendidos] = useState([])
  const [ventasPorMetodo, setVentasPorMetodo] = useState([])
  const [productosPorTipo, setProductosPorTipo] = useState([])
  const [movimientosPorTipo, setMovimientosPorTipo] = useState([])
  const [entradasYSalidas, setEntradasYSalidas] = useState([])
  const [resumenMensual, setResumenMensual] = useState({
    totalVentas: 0,
    totalUnidades: 0,
    ventasPromedio: 0,
    numeroVentas: 0,
    totalEntradas: 0,
    totalSalidas: 0,
    stockTotal: 0
  })
  const [loading, setLoading] = useState(true)

  const COLORES = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

  useEffect(() => {
    cargarEstadisticas()
  }, [])

  async function cargarEstadisticas() {
    try {
      await Promise.all([
        cargarVentasPorDia(),
        cargarProductosMasVendidos(),
        cargarVentasPorMetodo(),
        cargarResumenMensual(),
        cargarProductosPorTipo(),
        cargarMovimientos(),
        cargarEntradasYSalidas()
      ])
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function cargarVentasPorDia() {
    try {
      const fechaInicio = new Date()
      fechaInicio.setDate(fechaInicio.getDate() - 6)
      
      const { data, error } = await supabase
        .from('ventas')
        .select('fecha, total')
        .gte('fecha', fechaInicio.toISOString())
        .order('fecha', { ascending: true })

      if (error) throw error

      const ventasPorDia = {}
      for (let i = 0; i < 7; i++) {
        const fecha = new Date()
        fecha.setDate(fecha.getDate() - (6 - i))
        const key = fecha.toISOString().split('T')[0]
        ventasPorDia[key] = { fecha: key, total: 0 }
      }

      data?.forEach(venta => {
        const fecha = venta.fecha.split('T')[0]
        if (ventasPorDia[fecha]) {
          ventasPorDia[fecha].total += parseFloat(venta.total)
        }
      })

      const resultado = Object.values(ventasPorDia).map(item => ({
        fecha: new Date(item.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
        total: parseFloat(item.total.toFixed(2))
      }))

      setVentasPorDia(resultado)
    } catch (error) {
      console.error('Error cargando ventas por día:', error)
    }
  }

  async function cargarProductosMasVendidos() {
    try {
      const { data, error } = await supabase
        .from('detalle_ventas')
        .select(`
          cantidad,
          productos (nombre)
        `)

      if (error) throw error

      const productosMap = {}
      data?.forEach(detalle => {
        const nombre = detalle.productos?.nombre || 'Desconocido'
        if (!productosMap[nombre]) {
          productosMap[nombre] = 0
        }
        productosMap[nombre] += detalle.cantidad
      })

      const resultado = Object.entries(productosMap)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)

      setProductosMasVendidos(resultado)
    } catch (error) {
      console.error('Error cargando productos más vendidos:', error)
    }
  }

  async function cargarVentasPorMetodo() {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('metodo_pago, total')

      if (error) throw error

      const metodosMap = {}
      data?.forEach(venta => {
        const metodo = venta.metodo_pago || 'efectivo'
        if (!metodosMap[metodo]) {
          metodosMap[metodo] = 0
        }
        metodosMap[metodo] += parseFloat(venta.total)
      })

      const resultado = Object.entries(metodosMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: parseFloat(value.toFixed(2))
      }))

      setVentasPorMetodo(resultado)
    } catch (error) {
      console.error('Error cargando ventas por método:', error)
    }
  }

  async function cargarProductosPorTipo() {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          tipo,
          lotes (cantidad)
        `)
        .eq('activo', true)

      if (error) throw error

      const tiposMap = {}
      data?.forEach(producto => {
        const tipo = producto.tipo || 'Sin tipo'
        const cantidad = producto.lotes?.reduce((sum, l) => sum + l.cantidad, 0) || 0
        
        if (!tiposMap[tipo]) {
          tiposMap[tipo] = 0
        }
        tiposMap[tipo] += cantidad
      })

      const resultado = Object.entries(tiposMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      setProductosPorTipo(resultado)
    } catch (error) {
      console.error('Error cargando productos por tipo:', error)
    }
  }

  async function cargarMovimientos() {
    try {
      const { data, error } = await supabase
        .from('movimientos')
        .select('tipo, cantidad')

      if (error) throw error

      const movimientosMap = {
        'entrada': 0,
        'traspaso': 0,
        'venta': 0,
        'ajuste': 0
      }

      data?.forEach(mov => {
        if (movimientosMap[mov.tipo] !== undefined) {
          movimientosMap[mov.tipo] += mov.cantidad
        }
      })

      const resultado = Object.entries(movimientosMap)
        .map(([tipo, cantidad]) => ({
          tipo: tipo.charAt(0).toUpperCase() + tipo.slice(1),
          cantidad
        }))
        .filter(item => item.cantidad > 0)

      setMovimientosPorTipo(resultado)
    } catch (error) {
      console.error('Error cargando movimientos:', error)
    }
  }

  async function cargarEntradasYSalidas() {
    try {
      // Últimos 7 días de movimientos
      const fechaInicio = new Date()
      fechaInicio.setDate(fechaInicio.getDate() - 6)

      const { data, error } = await supabase
        .from('movimientos')
        .select('fecha, tipo, cantidad')
        .gte('fecha', fechaInicio.toISOString())
        .order('fecha', { ascending: true })

      if (error) throw error

      const movimientosPorDia = {}
      for (let i = 0; i < 7; i++) {
        const fecha = new Date()
        fecha.setDate(fecha.getDate() - (6 - i))
        const key = fecha.toISOString().split('T')[0]
        movimientosPorDia[key] = { 
          fecha: key, 
          entradas: 0, 
          salidas: 0 
        }
      }

      data?.forEach(mov => {
        const fecha = mov.fecha.split('T')[0]
        if (movimientosPorDia[fecha]) {
          if (mov.tipo === 'entrada') {
            movimientosPorDia[fecha].entradas += mov.cantidad
          } else if (mov.tipo === 'venta') {
            movimientosPorDia[fecha].salidas += mov.cantidad
          }
        }
      })

      const resultado = Object.values(movimientosPorDia).map(item => ({
        fecha: new Date(item.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
        entradas: item.entradas,
        salidas: item.salidas
      }))

      setEntradasYSalidas(resultado)
    } catch (error) {
      console.error('Error cargando entradas y salidas:', error)
    }
  }

  async function cargarResumenMensual() {
    try {
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)

      // Ventas del mes
      const { data: ventas, error: errorVentas } = await supabase
        .from('ventas')
        .select('total')
        .gte('fecha', inicioMes.toISOString())

      if (errorVentas) throw errorVentas

      const totalVentas = ventas?.reduce((sum, v) => sum + parseFloat(v.total), 0) || 0
      const numeroVentas = ventas?.length || 0

      // Unidades vendidas
      const { data: detalles, error: errorDetalles } = await supabase
        .from('detalle_ventas')
        .select(`
          cantidad,
          ventas!inner(fecha)
        `)
        .gte('ventas.fecha', inicioMes.toISOString())

      if (errorDetalles) throw errorDetalles

      const totalUnidades = detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0

      // Entradas del mes
      const { data: entradas, error: errorEntradas } = await supabase
        .from('movimientos')
        .select('cantidad')
        .eq('tipo', 'entrada')
        .gte('fecha', inicioMes.toISOString())

      if (errorEntradas) throw errorEntradas

      const totalEntradas = entradas?.reduce((sum, e) => sum + e.cantidad, 0) || 0

      // Salidas del mes (ventas)
      const { data: salidas, error: errorSalidas } = await supabase
        .from('movimientos')
        .select('cantidad')
        .eq('tipo', 'venta')
        .gte('fecha', inicioMes.toISOString())

      if (errorSalidas) throw errorSalidas

      const totalSalidas = salidas?.reduce((sum, s) => sum + s.cantidad, 0) || 0

      // Stock total actual
      const { data: lotes, error: errorLotes } = await supabase
        .from('lotes')
        .select(`
          cantidad,
          productos!inner(activo)
        `)
        .eq('productos.activo', true)

      if (errorLotes) throw errorLotes

      const stockTotal = lotes?.reduce((sum, l) => sum + l.cantidad, 0) || 0

      setResumenMensual({
        totalVentas,
        totalUnidades,
        ventasPromedio: numeroVentas > 0 ? totalVentas / numeroVentas : 0,
        numeroVentas,
        totalEntradas,
        totalSalidas,
        stockTotal
      })
    } catch (error) {
      console.error('Error cargando resumen mensual:', error)
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Estadísticas Completas</h1>

        {/* Resumen mensual - 4 tarjetas principales */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Ventas del Mes</dt>
                    <dd className="text-2xl font-semibold text-gray-900">S/ {resumenMensual.totalVentas.toFixed(2)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Entradas del Mes</dt>
                    <dd className="text-2xl font-semibold text-blue-600">{resumenMensual.totalEntradas}</dd>
                    <dd className="text-xs text-gray-500">unidades</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Salidas del Mes</dt>
                    <dd className="text-2xl font-semibold text-red-600">{resumenMensual.totalSalidas}</dd>
                    <dd className="text-xs text-gray-500">unidades</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Stock Total</dt>
                    <dd className="text-2xl font-semibold text-purple-600">{resumenMensual.stockTotal}</dd>
                    <dd className="text-xs text-gray-500">unidades</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Entradas y Salidas por día */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Entradas y Salidas (Últimos 7 Días)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={entradasYSalidas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="entradas" stroke="#3b82f6" strokeWidth={2} name="Entradas" />
                <Line type="monotone" dataKey="salidas" stroke="#ef4444" strokeWidth={2} name="Salidas" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Ventas por día */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Ventas Últimos 7 Días</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ventasPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip formatter={(value) => `S/ ${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} name="Ventas (S/)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Productos por Tipo */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Inventario por Tipo de Producto</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productosPorTipo}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {productosPorTipo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Movimientos por Tipo */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Movimientos por Tipo</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={movimientosPorTipo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tipo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad" fill="#8b5cf6" name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Productos más vendidos */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Top 5 Productos Más Vendidos</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productosMasVendidos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad" fill="#3b82f6" name="Unidades Vendidas" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ventas por método de pago */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Ventas por Método de Pago</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ventasPorMetodo}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ventasPorMetodo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `S/ ${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla detallada de productos por tipo */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Detalle de Inventario por Tipo</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porcentaje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productosPorTipo.map((tipo, index) => {
                  const total = productosPorTipo.reduce((sum, t) => sum + t.value, 0)
                  const porcentaje = ((tipo.value / total) * 100).toFixed(1)
                  
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: COLORES[index % COLORES.length] }}
                          ></div>
                          <span className="text-sm font-medium text-gray-900">{tipo.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {tipo.value}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2" style={{ width: '100px' }}>
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                width: `${porcentaje}%`,
                                backgroundColor: COLORES[index % COLORES.length]
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-500">{porcentaje}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}