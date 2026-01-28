'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Home() {
  const [stats, setStats] = useState({
    totalProductos: 0,
    totalMostrador1: 0,
    totalMostrador2: 0,
    totalAlmacen: 0,
    ventasHoy: 0,
    productosVencer: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarEstadisticas()
  }, [])

  async function cargarEstadisticas() {
    try {
      // Total de productos ACTIVOS
      const { count: totalProductos } = await supabase
        .from('productos')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true)

      // Inventario por ubicación - SOLO de productos activos
      const { data: inventario } = await supabase
        .from('lotes')
        .select(`
          ubicacion,
          cantidad,
          productos!inner(activo)
        `)
        .eq('productos.activo', true)
        .gt('cantidad', 0)

      let totalMostrador1 = 0
      let totalMostrador2 = 0
      let totalAlmacen = 0

      inventario?.forEach(lote => {
        if (lote.ubicacion === 'mostrador1') {
          totalMostrador1 += lote.cantidad
        } else if (lote.ubicacion === 'mostrador2') {
          totalMostrador2 += lote.cantidad
        } else if (lote.ubicacion === 'almacen') {
          totalAlmacen += lote.cantidad
        }
      })

      // Ventas de hoy
      const hoy = new Date().toISOString().split('T')[0]
      const { data: ventasHoy } = await supabase
        .from('ventas')
        .select('total')
        .gte('fecha', hoy + 'T00:00:00')
        .lte('fecha', hoy + 'T23:59:59')

      const totalVentasHoy = ventasHoy?.reduce((sum, venta) => sum + parseFloat(venta.total), 0) || 0

      // Productos próximos a vencer (30 días) - SOLO productos activos
      const fechaLimite = new Date()
      fechaLimite.setDate(fechaLimite.getDate() + 30)
      
      const { data: proximosVencer } = await supabase
        .from('lotes')
        .select(`
          id,
          productos!inner(activo)
        `)
        .eq('productos.activo', true)
        .lte('fecha_vencimiento', fechaLimite.toISOString().split('T')[0])
        .gt('cantidad', 0)

      setStats({
        totalProductos: totalProductos || 0,
        totalMostrador1,
        totalMostrador2,
        totalAlmacen,
        ventasHoy: totalVentasHoy,
        productosVencer: proximosVencer?.length || 0
      })
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      setLoading(false)
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Total Productos */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Productos Activos</dt>
                    <dd className="text-3xl font-semibold text-gray-900">{stats.totalProductos}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Inventario Mostrador 1 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Mostrador 1</dt>
                    <dd className="text-3xl font-semibold text-green-600">{stats.totalMostrador1}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Inventario Mostrador 2 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Mostrador 2</dt>
                    <dd className="text-3xl font-semibold text-purple-600">{stats.totalMostrador2}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Inventario Almacén */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">En Almacén</dt>
                    <dd className="text-3xl font-semibold text-blue-600">{stats.totalAlmacen}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Ventas Hoy */}
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Ventas Hoy</dt>
                    <dd className="text-3xl font-semibold text-green-600">S/ {stats.ventasHoy.toFixed(2)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen visual adicional */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Distribución de Inventario</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">{stats.totalMostrador1}</div>
              <div className="text-sm text-gray-500 mt-1">unidades en Mostrador 1</div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ 
                    width: `${(stats.totalMostrador1 / (stats.totalMostrador1 + stats.totalMostrador2 + stats.totalAlmacen)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">{stats.totalMostrador2}</div>
              <div className="text-sm text-gray-500 mt-1">unidades en Mostrador 2</div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ 
                    width: `${(stats.totalMostrador2 / (stats.totalMostrador1 + stats.totalMostrador2 + stats.totalAlmacen)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{stats.totalAlmacen}</div>
              <div className="text-sm text-gray-500 mt-1">unidades en Almacén</div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ 
                    width: `${(stats.totalAlmacen / (stats.totalMostrador1 + stats.totalMostrador2 + stats.totalAlmacen)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {stats.productosVencer > 0 && (
          <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Tienes <strong>{stats.productosVencer}</strong> lote(s) que vencen en los próximos 30 días.{' '}
                  <Link href="/inventario" className="font-medium underline hover:text-yellow-600">
                    Ver detalles
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Accesos Rápidos</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              href="/ventas"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-primary-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <svg className="h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Registrar Venta</p>
                <p className="text-sm text-gray-500 truncate">Nueva transacción</p>
              </div>
            </Link>

            <Link
              href="/agregar-stock"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-primary-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Agregar Stock</p>
                <p className="text-sm text-gray-500 truncate">Nuevo inventario</p>
              </div>
            </Link>

            <Link
              href="/inventario"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-primary-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Ver Inventario</p>
                <p className="text-sm text-gray-500 truncate">Consultar stock</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}