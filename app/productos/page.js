'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ProductosPage() {
  const [productos, setProductos] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [productoEditar, setProductoEditar] = useState(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    nombre: '',
    tipo: 'Pote',
    precio_base: ''
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
          lotes (cantidad)
        `)
        .eq('activo', true)
        .order('nombre')

      if (error) throw error

      const productosConStock = data?.map(p => ({
        ...p,
        stockTotal: p.lotes?.reduce((sum, l) => sum + l.cantidad, 0) || 0
      }))

      setProductos(productosConStock || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function guardar() {
    if (!form.nombre || !form.tipo || !form.precio_base) {
      alert('Completa todos los campos')
      return
    }

    try {
      if (productoEditar) {
        // Actualizar
        const { error } = await supabase
          .from('productos')
          .update({
            nombre: form.nombre,
            tipo: form.tipo,
            precio_base: parseFloat(form.precio_base)
          })
          .eq('id', productoEditar.id)

        if (error) throw error
        alert('Producto actualizado')
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('productos')
          .insert({
            nombre: form.nombre,
            tipo: form.tipo,
            precio_base: parseFloat(form.precio_base),
            activo: true
          })

        if (error) throw error
        alert('Producto creado')
      }

      cerrarForm()
      cargarProductos()
    } catch (error) {
      console.error('Error:', error)
      alert('Error: ' + error.message)
    }
  }

  function editar(producto) {
    setProductoEditar(producto)
    setForm({
      nombre: producto.nombre,
      tipo: producto.tipo,
      precio_base: producto.precio_base
    })
    setMostrarForm(true)
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este producto?')) return

    try {
      await supabase.from('lotes').delete().eq('producto_id', id)
      
      const { error } = await supabase
        .from('productos')
        .update({ activo: false })
        .eq('id', id)

      if (error) throw error
      alert('Producto eliminado')
      cargarProductos()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  function cerrarForm() {
    setMostrarForm(false)
    setProductoEditar(null)
    setForm({ nombre: '', tipo: 'Pote', precio_base: '' })
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
          <h1 className="text-3xl font-bold text-gray-900">Catálogo de Productos</h1>
          <button
            onClick={() => { setProductoEditar(null); setForm({ nombre: '', tipo: 'Pote', precio_base: '' }); setMostrarForm(true); }}
            className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 font-semibold"
          >
            + Nuevo Producto
          </button>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Base</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productos.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {p.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    S/ {parseFloat(p.precio_base).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{p.stockTotal}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button onClick={() => editar(p)} className="text-primary-600 hover:text-primary-900 font-medium">Editar</button>
                    <button onClick={() => eliminar(p.id)} className="text-red-600 hover:text-red-900 font-medium">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {productos.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No hay productos. Agrega tu primer producto.
            </div>
          )}
        </div>

        {/* Modal */}
        {mostrarForm && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={cerrarForm}></div>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  {productoEditar ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto *</label>
                    <input
                      type="text"
                      value={form.nombre}
                      onChange={(e) => setForm({...form, nombre: e.target.value})}
                      placeholder="Ej: Teo Energy"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={form.tipo}
                      onChange={(e) => setForm({...form, tipo: e.target.value})}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="Pote">Pote</option>
                      <option value="Botella">Botella</option>
                      <option value="Caja">Caja</option>
                      <option value="Sobre">Sobre</option>
                      <option value="Bolsa">Bolsa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio Base (S/) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.precio_base}
                      onChange={(e) => setForm({...form, precio_base: e.target.value})}
                      placeholder="20.00"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <button onClick={cerrarForm} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button onClick={guardar} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Guardar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}