'use client'

import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Loader2 } from 'lucide-react'

export type LoadingPhase = 'idle' | 'geolocating' | 'fetching-address'

interface MapSelectorProps {
  initialLat?: number
  initialLng?: number
  loadingPhase?: LoadingPhase
  /** Saat true, lokasi awal (initialLat/Lng) otomatis dipilih penuh
   *  (reverse-geocode + panggil onSelect) begitu peta siap — dipakai
   *  untuk prefill alamat perusahaan saat company buat listing. */
  autoSelectOnLoad?: boolean
  onSelect: (lat: number, lng: number, address?: string) => void
}

export interface MapSelectorHandle {
  flyTo: (lat: number, lng: number) => Promise<void>
}

const MapSelector = forwardRef<MapSelectorHandle, MapSelectorProps>(
  ({ initialLat = -6.2, initialLng = 106.816666, loadingPhase = 'idle', autoSelectOnLoad = false, onSelect }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const marker = useRef<mapboxgl.Marker | null>(null)
    const mountedRef = useRef(true) // ✅ FIX: Track mounted state
    const autoSelectRef = useRef(autoSelectOnLoad)
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null)
    const [addressDetails, setAddressDetails] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    autoSelectRef.current = autoSelectOnLoad

    const updateLocationAndMarkerRef = useRef<((lat: number, lng: number) => Promise<void>) | undefined>(undefined)

    // ✅ FIX: Track mount/unmount
    useEffect(() => {
      mountedRef.current = true
      return () => {
        mountedRef.current = false
      }
    }, [])

    const fetchAddress = useCallback(async (lat: number, lng: number): Promise<string | null> => {
      const minDelay = new Promise(resolve => setTimeout(resolve, 600))
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
        const fetchPromise = fetch(url).then(res => res.json())
        const [data] = await Promise.all([fetchPromise, minDelay])

        // ✅ FIX: Jangan setState jika sudah unmount
        if (!mountedRef.current) return null

        if (data.display_name) {
          setAddressDetails(data.display_name)
          return data.display_name
        }
      } catch (error) {
        console.error('fetchAddress error:', error)
      }
      return null
    }, [])

    const updateLocationAndMarker = useCallback(async (lat: number, lng: number) => {
      // ✅ FIX: Guard di awal
      if (!map.current || !mountedRef.current) return

      setIsProcessing(true)
      try {
        setSelectedCoords({ lat, lng })
        setAddressDetails(null)

        const address = await fetchAddress(lat, lng)

        // ✅ FIX: Guard SETELAH await — component mungkin sudah unmount saat fetch
        if (!mountedRef.current || !map.current) return

        onSelect(lat, lng, address || undefined)

        // ✅ FIX: Guard lagi sebelum manipulasi marker
        if (!map.current) return

        if (marker.current) {
          marker.current.remove()
          marker.current = null
        }

        // ✅ FIX: Final check sebelum addTo
        if (!map.current) return

        marker.current = new mapboxgl.Marker({ color: '#16a34a' })
          .setLngLat([lng, lat])
          .addTo(map.current)

        if (map.current.loaded()) {
          map.current.flyTo({ center: [lng, lat], zoom: 15, essential: true })
        } else {
          map.current.once('load', () => {
            // ✅ FIX: Guard di dalam callback (bisa dipanggil setelah unmount)
            if (map.current && mountedRef.current) {
              map.current.flyTo({ center: [lng, lat], zoom: 15, essential: true })
            }
          })
        }
      } finally {
        // ✅ FIX: Hanya setState jika masih mounted
        if (mountedRef.current) {
          setIsProcessing(false)
        }
      }
    }, [onSelect, fetchAddress])

    useEffect(() => {
      updateLocationAndMarkerRef.current = updateLocationAndMarker
    }, [updateLocationAndMarker])

    useImperativeHandle(ref, () => ({
      flyTo: async (lat: number, lng: number) => {
        // ✅ FIX: Guard sebelum panggil
        if (!mountedRef.current || !updateLocationAndMarkerRef.current) return
        await updateLocationAndMarkerRef.current(lat, lng)
      },
    }), [])

    const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

    useEffect(() => {
      if (!TOKEN) return
      if (map.current) return
      if (!mapContainer.current) return

      mapboxgl.accessToken = TOKEN

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        // Mulai dari lokasi marker (dekat) dengan zoom luas-cukup,
        // sehingga animasi flyTo pendek & lokal, bukan dari overview jauh.
        center: [initialLng, initialLat],
        zoom: 11,
      })

// Tampilkan marker hijau & animasikan peta ke lokasi saat siap
        // (untuk lokasi yang sudah ada), tanpa menunggu interaksi klik/auto-detect.
        map.current.once('load', () => {
          if (!map.current) return
          // Delay kecil setelah load agar flyTo benar-benar menganimasikan
          // perpindahan dari lokasi marker (zoom 11) ke zoom detail (15).
          setTimeout(() => {
            if (!map.current || !mountedRef.current) return

            // Auto-select lokasi awal (mis. alamat perusahaan) → reverse-geocode
            // + onSelect, sehingga form langsung terisi tanpa klik manual.
            if (autoSelectRef.current && updateLocationAndMarkerRef.current) {
              updateLocationAndMarkerRef.current(initialLat, initialLng)
              return
            }

            if (marker.current) {
              marker.current.remove()
              marker.current = null
            }
          marker.current = new mapboxgl.Marker({ color: '#16a34a' })
            .setLngLat([initialLng, initialLat])
            .addTo(map.current)
          map.current.flyTo({
            center: [initialLng, initialLat],
            zoom: 15,
            essential: true,
          })
        }, 250)
      })

      const geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserHeading: true,
      })

      const navigationControl = new mapboxgl.NavigationControl()

      map.current.addControl(navigationControl, 'top-right')
      map.current.addControl(geolocateControl, 'top-left')

      geolocateControl.on('geolocate', (e) => {
        const { latitude, longitude } = e.coords
        if (updateLocationAndMarkerRef.current && mountedRef.current) {
          updateLocationAndMarkerRef.current(latitude, longitude)
        }
      })

      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat
        if (updateLocationAndMarkerRef.current && mountedRef.current) {
          updateLocationAndMarkerRef.current(lat, lng)
        }
      })

      return () => {
        // ✅ FIX: Cleanup marker dulu sebelum remove map
        if (marker.current) {
          marker.current.remove()
          marker.current = null
        }
        if (map.current) {
          map.current.remove()
          map.current = null
        }
      }
    }, [TOKEN, initialLat, initialLng])

    if (!TOKEN) {
      return (
        <div className="border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500 bg-gray-50 h-[400px] flex items-center justify-center">
          <div>
            <p>Mapbox token tidak dikonfigurasi.</p>
            <p className="mt-1 text-xs">
              Tambahkan <code className="bg-gray-100 px-1 py-0.5 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> di .env.local
            </p>
          </div>
        </div>
      )
    }

    const getLoadingInfo = (): { show: boolean; text: string } => {
      if (loadingPhase === 'geolocating') {
        return { show: true, text: 'Mendeteksi lokasi Anda...' }
      }
      if (loadingPhase === 'fetching-address' || isProcessing) {
        return { show: true, text: 'Mengambil detail alamat...' }
      }
      return { show: false, text: '' }
    }

    const { show: showLoadingOverlay, text: loadingText } = getLoadingInfo()

    return (
      <div className="relative w-full">
        <div ref={mapContainer} className="w-full h-[400px] rounded-lg" />

        {showLoadingOverlay && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-0">
            <div className="bg-white rounded-xl p-6 shadow-2xl flex flex-col items-center gap-3 max-w-xs mx-4">
              <Loader2 className="animate-spin h-10 w-10 text-green-600" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">{loadingText}</p>
                <p className="text-xs text-gray-500 mt-1">Mohon tunggu sebentar</p>
              </div>
            </div>
          </div>
        )}

        {selectedCoords && !showLoadingOverlay && (
          <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-md border border-gray-200 max-h-48 overflow-y-auto z-0">
            <p className="text-xs font-semibold text-gray-700 mb-2">Lokasi Terpilih:</p>

            <div className="space-y-2 mb-3">
              <div>
                <span className="text-xs text-gray-500">Latitude:</span>
                <span className="ml-2 font-mono text-gray-900 font-medium">{selectedCoords.lat.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500">Longitude:</span>
                <span className="ml-2 font-mono text-gray-900 font-medium">{selectedCoords.lng.toFixed(6)}</span>
              </div>
            </div>

            {addressDetails && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-1">Alamat:</p>
                <p className="text-xs text-gray-600 leading-relaxed">{addressDetails}</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
)

MapSelector.displayName = 'MapSelector'
export default MapSelector