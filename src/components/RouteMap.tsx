'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = []
  let index = 0, lat = 0, lng = 0

  while (index < encoded.length) {
    let result = 0, shift = 0, b: number
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    result = 0; shift = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    coords.push([lat / 1e5, lng / 1e5])
  }
  return coords
}

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length > 1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.fitBounds(coords as any, { padding: [24, 24] })
    }
  }, [map, coords])
  return null
}

interface RouteMapProps {
  latlng?: [number, number][]
  polyline?: string
}

export default function RouteMap({ latlng, polyline }: RouteMapProps) {
  const coords: [number, number][] =
    latlng && latlng.length > 0
      ? latlng
      : polyline
        ? decodePolyline(polyline)
        : []

  if (coords.length === 0) return null

  const center = coords[Math.floor(coords.length / 2)]

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: '320px', width: '100%', borderRadius: '12px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Polyline positions={coords} color="#f97316" weight={3} opacity={0.9} />
      <FitBounds coords={coords} />
    </MapContainer>
  )
}
