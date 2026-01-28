'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AgregarStockPage() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState({
    producto_id: '',
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
        .select('id, nombre, tipo')
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      setProductos(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function guardar() {
    if (!form.producto_id || !form.fecha_vencimiento || !form.cantidad) {
      alert('Completa todos los campos obligatorios')
      return
    }

    if (parseInt(form.cantidad) <= 0) {
      alert('La cantidad debe ser mayor a 0')
      return
    }

    setGuardando(true)

    try {
      // Crear lote
      const { data: nuevoLote, error: errorLote } = await supabase
        .from('lotes')
        .insert({
          producto_id: form.producto_id,
          numero_lote: `AUTO-${Date.now()}`,
          fecha_vencimiento: form.fecha_vencimiento,
          ubicacion: form.ubicacion,
          cantidad: parseInt(form.cantidad)
        })
        .select()
        .single()

      if (errorLote) throw errorLote

      // Registrar movimiento
      await supabase
        .from('movimientos')
        .insert({
          lote_id: nuevoLote.id,
          tipo: 'entrada',
          cantidad: parseInt(form.cantidad),
          ubicacion_destino: form.ubicacion,
          notas: 'Stock agregado manualmente'
        })

      alert('✅ Stock agregado exitosamente')
      
      // Resetear formulario
      setForm({
        producto_id: '',
        fecha_vencimiento: '',
        ubicacion: 'almacen',
        cantidad: ''
      })
    } catch (error) {
      console.error('Error:', error)
      alert('Error al agregar stock: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (productos.length === 0) {
    return (
      <div className="py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-800">No hay productos registrados</h3>
                <p className="mt-2 text-sm text-yellow-700">
                  Primero debes agregar productos en la sección "Productos".
                </p>
                <Link href="/productos" className="mt-4 inline-block bg-yellow-800 text-white px-4 py-2 rounded-md hover:bg-yellow-900">
                  Ir a Productos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const productoSeleccionado = productos.find(p => p.id === form.producto_id)

  return (
    <div className="py-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Agregar Stock al Inventario</h1>
          <p className="mt-2 text-sm text-gray-600">
            Selecciona un producto y agrega la información del stock (ubicación, fecha de vencimiento, cantidad)
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            {/* Selector de Producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Producto * 
                <Link href="/productos" className="ml-2 text-xs text-primary-600 hover:text-primary-800">
                  (Agregar nuevo producto)
                </Link>
              </label>
              <select
                value={form.producto_id}
                onChange={(e) => setForm({...form, producto_id: e.target.value})}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-3 px-4 text-base focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">-- Selecciona un producto --</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.tipo})
                  </option>
                ))}
              </select>
            </div>

            {/* Preview del producto seleccionado */}
            {productoSeleccionado && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Producto seleccionado:</p>
                    <p className="text-lg font-bold text-blue-700">{productoSeleccionado.nombre}</p>
                    <p className="text-sm text-blue-600">Tipo: {productoSeleccionado.tipo}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Fecha de Vencimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Vencimiento *
              </label>
              <input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) => setForm({...form, fecha_vencimiento: e.target.value})}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-3 px-4 text-base focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Ubicación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Dónde se encuentra? *
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setForm({...form, ubicacion: 'almacen'})}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    form.ubicacion === 'almacen'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="font-semibold">Almacén</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({...form, ubicacion: 'mostrador1'})}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    form.ubicacion === 'mostrador1'
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
                  onClick={() => setForm({...form, ubicacion: 'mostrador2'})}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    form.ubicacion === 'mostrador2'
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

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad *
              </label>
              <input
                type="number"
                min="1"
                value={form.cantidad}
                onChange={(e) => setForm({...form, cantidad: e.target.value})}
                placeholder="Ej: 24"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-3 px-4 text-base focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? 'Guardando...' : '✓ Agregar Stock'}
              </button>
              <Link
                href="/inventario"
                className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
              >
                Ver Inventario
              </Link>
            </div>
          </div>
        </div>

        {/* Info adicional */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">💡 Consejo:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Agrega stock cada vez que recibas nuevos productos</li>
            <li>• Verifica siempre la fecha de vencimiento</li>
            <li>• Puedes agregar el mismo producto varias veces con diferentes fechas</li>
          </ul>
        </div>
      </div>
    </div>
  )
}