'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  token: string
  candidateName: string
}

export default function SignaturePad({ token, candidateName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)
  const [typedName, setTypedName] = useState('')
  const [mode, setMode] = useState<'draw' | 'type'>('draw')

  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1a2fa0'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    setIsDrawing(true)
    setIsEmpty(false)
    const pos = getPos(e, canvas)
    lastPos.current = pos
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    const ctx = canvas.getContext('2d')
    if (!ctx || !lastPos.current) return

    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    lastPos.current = null
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  const getSignatureData = (): string => {
    if (mode === 'type') {
      // Generate a typed signature as canvas data
      const canvas = document.createElement('canvas')
      canvas.width = 500
      canvas.height = 100
      const ctx = canvas.getContext('2d')!
      ctx.font = 'italic 42px Georgia, serif'
      ctx.fillStyle = '#1a2fa0'
      ctx.fillText(typedName || candidateName, 20, 65)
      return canvas.toDataURL()
    }
    return canvasRef.current?.toDataURL() || ''
  }

  const handleSign = async () => {
    if (mode === 'draw' && isEmpty) {
      setError('Please draw your signature or switch to typed signature.')
      return
    }
    if (mode === 'type' && !typedName.trim()) {
      setError('Please type your full name to sign.')
      return
    }

    setIsSigning(true)
    setError(null)

    const signatureData = getSignatureData()

    const res = await fetch('/api/offers/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, signatureData }),
    })

    const data = await res.json()
    setIsSigning(false)

    if (!res.ok) {
      setError(data.error || 'Signing failed. Please try again.')
      return
    }

    setSigned(true)
    setTimeout(() => window.location.reload(), 1200)
  }

  if (signed) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="font-semibold text-gray-900">Offer Signed!</h3>
        <p className="text-sm text-gray-500 mt-1">Refreshing...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('draw')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'draw' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ✍️ Draw Signature
        </button>
        <button
          onClick={() => setMode('type')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'type' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ⌨️ Type Signature
        </button>
      </div>

      {mode === 'draw' ? (
        <div>
          <div
            className="border-2 border-gray-200 rounded-lg bg-white overflow-hidden"
            style={{ touchAction: 'none' }}
          >
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className="w-full h-36 cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-400">Draw your signature above</p>
            <button onClick={clearCanvas} className="text-xs text-gray-500 hover:text-gray-700">
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            className="input"
            placeholder={`Type your full name: ${candidateName}`}
          />
          {typedName && (
            <div
              className="mt-3 p-4 bg-white border rounded-lg text-3xl text-brand-700"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
            >
              {typedName}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
        By clicking "Sign Offer", you confirm that you accept all terms and conditions in this offer letter.
        Your electronic signature, IP address, and timestamp will be legally binding.
      </div>

      <button
        onClick={handleSign}
        disabled={isSigning}
        className="btn-primary w-full justify-center py-3 text-base"
      >
        {isSigning ? '⟳ Signing...' : '✅ Sign Offer Letter'}
      </button>
    </div>
  )
}
