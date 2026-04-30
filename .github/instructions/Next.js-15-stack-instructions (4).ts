import dynamic from 'next/dynamic'
const Map = dynamic(() => import('@/components/map/Map.client'), { ssr: false })
<Map center={[48.8566, 2.3522]} markers={[{ lat:48.8566, lng:2.3522, popup:'Paris' }]} />