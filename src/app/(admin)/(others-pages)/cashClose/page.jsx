// components/CashCloseScreen.tsx
'use client'

import { useState, useEffect } from 'react'
import { getCashCloseSummary, createCashClose } from '@/lib/prisma'
import { useBusiness } from '@/context/BusinessContext';
import { useSession } from "next-auth/react"

export default function CashCloseScreen() {
    const { data: session, status } = useSession()
    const bussines = useBusiness();
    const [summary, setSummary] = useState(null)
    const [cashActual, setCashActual] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadSummary() {
            const data = await getCashCloseSummary(bussines?.id)
            setSummary(data)
            setLoading(false)
        }
        loadSummary()
    }, [bussines?.id])

    if (loading || !summary) return <div className="p-4">Calculando ventas del turno...</div>

    // Solo calculamos la diferencia contra el EFECTIVO esperado
    const difference = (Number(cashActual) || 0) - summary.cashExpected
    const isShortage = difference < 0
    const isOverage = difference > 0

    const handleCloseRegister = async () => {
        if (cashActual === '') {
            alert('Debes ingresar el efectivo contado físicamente en caja.')
            return
        }

        try {
            await createCashClose({
                businessId,
                userId: session?.user?.id,
                openingDate: summary.openingDate,
                cashExpected: summary.cashExpected,
                cashActual: Number(cashActual),
                notes,
            })
            alert('Corte de caja guardado correctamente.')
            // Redirigir o limpiar pantalla
        } catch (error) {
            console.error(error)
            alert('Error al procesar el corte.')
        }
    }

    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md mt-10 border">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Corte de Caja</h2>

            {/* Resumen General */}
            <div className="bg-gray-50 p-4 rounded mb-6 text-sm text-gray-600 border">
                <p><strong>Inicio:</strong> {new Date(summary.openingDate).toLocaleString()}</p>
                <p><strong>Tickets emitidos:</strong> {summary.salesCount}</p>
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                    <p>Ingresos Tarjeta:</p> <p className="text-right">${summary.cardTotal.toFixed(2)}</p>
                    <p>Ingresos Transferencia:</p> <p className="text-right">${summary.transferTotal.toFixed(2)}</p>
                    <p className="font-bold text-gray-800 mt-1">Total Ingresos Turno:</p>
                    <p className="font-bold text-gray-800 text-right mt-1">${summary.totalSales.toFixed(2)}</p>
                </div>
            </div>

            {/* Sección Crítica: Efectivo */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800 font-semibold uppercase tracking-wide">Efectivo esperado en cajón</p>
                <p className="text-4xl font-bold text-blue-600 mt-1">${summary.cashExpected.toFixed(2)}</p>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Cuánto efectivo contaste físicamente?
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500 text-xl">$</span>
                    <input
                        type="number"
                        className="w-full border p-3 pl-8 rounded text-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                        value={cashActual}
                        onChange={(e) => setCashActual(e.target.value ? Number(e.target.value) : '')}
                    />
                </div>
            </div>

            {/* Alerta de Diferencia */}
            {cashActual !== '' && (
                <div className={`p-4 rounded mb-6 border ${isShortage ? 'bg-red-50 border-red-200 text-red-800' : isOverage ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                    <p className="font-semibold text-lg flex justify-between">
                        <span>Diferencia:</span>
                        <span>${Math.abs(difference).toFixed(2)}</span>
                    </p>
                    <p className="text-sm opacity-80 mt-1">
                        {isShortage && 'Falta dinero en la caja.'}
                        {isOverage && 'Sobra dinero en la caja.'}
                        {difference === 0 && '¡Caja perfectamente cuadrada!'}
                    </p>
                </div>
            )}

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas del corte (opcional)
                </label>
                <textarea
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={2}
                    placeholder="Justificación de faltantes/sobrantes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            <button
                onClick={handleCloseRegister}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors text-lg shadow-sm"
            >
                Cerrar Caja
            </button>
        </div>
    )
}