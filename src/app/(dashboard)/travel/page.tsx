'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Navigation, Loader2, Car, Zap, Train, Bus, Plane, Bike, Search, X } from 'lucide-react'

interface GeoSuggestion {
  display_name: string
  lat: string
  lon: string
  place_id: number
}

interface RouteResult {
  mode: string
  icon: any
  distance_km: number
  duration_min: number
  co2_kg: number
  ors_profile: string
  emission_factor: number
}

// All selectable modes (no cycling/walking)
const ALL_MODES = [
  { id: 'car_petrol',  label: 'Car (Petrol)',  icon: Car,   factor: 0.192, ors: 'driving-car',    color: 'text-slate-600' },
  { id: 'car_diesel',  label: 'Car (Diesel)',  icon: Car,   factor: 0.171, ors: 'driving-car',    color: 'text-slate-600' },
  { id: 'ev',          label: 'Electric Car',  icon: Zap,   factor: 0.053, ors: 'driving-car',    color: 'text-emerald-600' },
  { id: 'motorcycle',  label: 'Motorcycle',    icon: Bike,  factor: 0.113, ors: 'driving-car',    color: 'text-orange-600' },
  { id: 'bus',         label: 'Bus',           icon: Bus,   factor: 0.089, ors: 'driving-car',    color: 'text-blue-600' },
  { id: 'train',       label: 'Train',         icon: Train, factor: 0.041, ors: 'driving-car',    color: 'text-indigo-600' },
  { id: 'flight',      label: 'Flight',        icon: Plane, factor: 0.255, ors: 'driving-car',    color: 'text-red-600' },
]

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function LocationInput({ label, icon: Icon, placeholder, value, onChange, onSelect, onClear }: {
  label: string; icon: any; placeholder: string; value: string
  onChange: (v: string) => void; onSelect: (lat: number, lon: number) => void; onClear: () => void
}) {
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [fetching, setFetching] = useState(false)
  const [open, setOpen] = useState(false)
  const debouncedValue = useDebounce(value, 400)
  const ref = useRef<HTMLDivElement>(null)
  const skipRef = useRef(false)

  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return }
    if (debouncedValue.length < 3) { setSuggestions([]); setOpen(false); return }
    setFetching(true)
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedValue)}&format=json&limit=6&addressdetails=0`, {
      headers: { 'Accept-Language': 'en' },
    })
      .then(r => r.json())
      .then((data: GeoSuggestion[]) => { setSuggestions(data); setOpen(data.length > 0) })
      .catch(() => setSuggestions([]))
      .finally(() => setFetching(false))
  }, [debouncedValue])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="flex-1 relative" ref={ref}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={value} onChange={e => { onChange(e.target.value); onClear(); setOpen(true) }}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          placeholder={placeholder} autoComplete="off"
          className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
        {fetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
        {!fetching && value && (
          <button onClick={() => { onChange(''); setSuggestions([]); setOpen(false); onClear() }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden">
          {suggestions.map(s => (
            <button key={s.place_id} className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-emerald-50 border-b border-slate-50 last:border-0"
              onClick={() => {
                skipRef.current = true
                onChange(s.display_name.split(',').slice(0, 3).join(', '))
                onSelect(parseFloat(s.lat), parseFloat(s.lon))
                setSuggestions([])
                setOpen(false)
              }}>
              <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-sm text-slate-700 leading-snug">{s.display_name}</span>
            </button>
          ))}
          <div className="px-4 py-2 bg-slate-50 flex items-center gap-1.5">
            <Search className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-400">Powered by OpenStreetMap</span>
          </div>
        </div>
      )}
    </div>
  )
}

async function fetchRoute(start: [number, number], end: [number, number], orsProfile: string, apiKey: string) {
  if (!apiKey) {
    // Straight-line fallback
    const R = 6371
    const dLat = ((end[1] - start[1]) * Math.PI) / 180
    const dLon = ((end[0] - start[0]) * Math.PI) / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((start[1] * Math.PI) / 180) * Math.cos((end[1] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return { distance: dist, duration: (dist / 60) * 60, geometry: null }
  }
  const res = await fetch(`https://api.openrouteservice.org/v2/directions/${orsProfile}?api_key=${apiKey}&start=${start[0]},${start[1]}&end=${end[0]},${end[1]}`)
  if (!res.ok) throw new Error(`ORS ${res.status}`)
  const json = await res.json()
  const summary = json.features?.[0]?.properties?.summary
  return {
    distance: (summary?.distance ?? 0) / 1000,
    duration: (summary?.duration ?? 0) / 60,
    geometry: json.features?.[0]?.geometry ?? null,
  }
}

export default function TravelPage() {
  const [originText, setOriginText] = useState('')
  const [destText, setDestText] = useState('')
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null)
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null)
  const [selectedModes, setSelectedModes] = useState<string[]>(['car_petrol', 'ev', 'bus', 'train'])
  const [results, setResults] = useState<RouteResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const polylineRef = useRef<any>(null)
  const ORS_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY ?? ''

  // Init Leaflet map
  useEffect(() => {
    if (typeof window === 'undefined') return
    let mounted = true
    import('leaflet').then(L => {
      if (!mounted || !mapRef.current) return
      if ((mapRef.current as any)._leaflet_id) { mapInstance.current?.remove(); mapInstance.current = null }
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41],
      })
      L.Marker.prototype.options.icon = icon
      mapInstance.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapInstance.current)
    })
    return () => { mounted = false; if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [])

  const updateMap = useCallback(async (start: [number, number], end: [number, number], geometry: any) => {
    if (!mapInstance.current) return
    const L = (await import('leaflet')).default
    markersRef.current.forEach(m => m.remove()); markersRef.current = []
    polylineRef.current?.remove()
    markersRef.current = [
      L.marker([start[1], start[0]]).addTo(mapInstance.current).bindPopup(originText),
      L.marker([end[1], end[0]]).addTo(mapInstance.current).bindPopup(destText),
    ]
    if (geometry?.coordinates) {
      const latlngs = geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng])
      polylineRef.current = L.polyline(latlngs, { color: '#059669', weight: 4, opacity: 0.85 }).addTo(mapInstance.current)
      mapInstance.current.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] })
    } else {
      mapInstance.current.fitBounds(L.latLngBounds([start[1], start[0]], [end[1], end[0]]), { padding: [60, 60] })
    }
  }, [originText, destText])

  const toggleMode = (id: string) => {
    setSelectedModes(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(m => m !== id) : prev) : [...prev, id]
    )
  }

  const search = async () => {
    if (!originCoords || !destCoords) { setError('Select both locations from suggestions.'); return }
    if (selectedModes.length === 0) { setError('Select at least one transport mode.'); return }
    setLoading(true); setError(''); setResults([])

    try {
      // Fetch route once (using driving-car for road distance)
      const baseRoute = await fetchRoute(originCoords, destCoords, 'driving-car', ORS_KEY)
      const dist = baseRoute.distance

      const computed: RouteResult[] = selectedModes.map(modeId => {
        const mode = ALL_MODES.find(m => m.id === modeId)!
        // Flight uses straight-line * 1.2 (longer due to routing), train/bus use road distance
        const effectiveDist = modeId === 'flight' ? dist * 0.75 : dist
        const co2 = Math.round(effectiveDist * mode.factor * 100) / 100
        const speed = modeId === 'flight' ? 800 : modeId === 'train' ? 100 : modeId === 'bus' ? 60 : 50
        const duration = Math.round((effectiveDist / speed) * 60)
        return { mode: mode.label, icon: mode.icon, distance_km: Math.round(dist * 10) / 10, duration_min: duration, co2_kg: co2, ors_profile: mode.ors, emission_factor: mode.factor }
      }).sort((a, b) => a.co2_kg - b.co2_kg)

      setResults(computed)
      await updateMap(originCoords, destCoords, baseRoute.geometry)
    } catch {
      setError('Route lookup failed. Try different locations.')
    }
    setLoading(false)
  }

  const maxCO2 = Math.max(...results.map(r => r.co2_kg), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Eco Route Planner</h1>
        <p className="text-slate-500 text-sm mt-1">Search any location and compare CO₂ across travel modes</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <LocationInput label="Origin" icon={MapPin} placeholder="Type a city, area, or address..." value={originText} onChange={setOriginText} onSelect={(lat, lon) => setOriginCoords([lon, lat])} onClear={() => setOriginCoords(null)} />
          <LocationInput label="Destination" icon={Navigation} placeholder="Type a city, area, or address..." value={destText} onChange={setDestText} onSelect={(lat, lon) => setDestCoords([lon, lat])} onClear={() => setDestCoords(null)} />
        </div>

        {/* Mode toggles */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Compare modes</p>
          <div className="flex flex-wrap gap-2">
            {ALL_MODES.map(m => {
              const active = selectedModes.includes(m.id)
              return (
                <button key={m.id} onClick={() => toggleMode(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${active ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'}`}>
                  <m.icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        <button onClick={search} disabled={loading || !originCoords || !destCoords}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          {loading ? 'Calculating...' : 'Compare Routes'}
        </button>
        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ height: 360 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-4">
            CO₂ Comparison
            <span className="text-sm text-slate-400 font-normal ml-2">· {results[0].distance_km} km route</span>
          </h2>
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={r.mode} className={`p-4 rounded-xl border ${i === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <r.icon className={`w-4 h-4 ${i === 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="font-medium text-slate-800">{r.mode}</span>
                    {i === 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">🌿 Greenest</span>}
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${i === 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {r.co2_kg} kg <span className="text-xs font-normal text-slate-400">CO₂</span>
                    </div>
                    <div className="text-xs text-slate-400">~{r.duration_min >= 60 ? `${Math.floor(r.duration_min / 60)}h ${r.duration_min % 60}m` : `${r.duration_min}m`}</div>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    style={{ width: `${Math.max((r.co2_kg / maxCO2) * 100, 2)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
