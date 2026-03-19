import type { MetadataRoute } from 'next'
import { useBusiness } from '@/context/BusinessContext'

export default function manifest(): MetadataRoute.Manifest {
    const bussiness = useBusiness()


    return {
        name: bussiness?.name,
        short_name: bussiness?.name,
        description: 'Sistema de agenda y punto de venta',
        start_url: '/',
        scope: '/', // <--- ESTA ES LA MAGIA PARA LAS REDIRECCIONES
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
            {
                src: `/${bussiness?.slug}/android-chrome-192x192.png`,
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: `/${bussiness?.slug}/android-chrome-512x512.png`,
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}