'use client'
import { useState, useEffect } from "react";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import PullToRefresh from 'react-simple-pull-to-refresh'; // <-- Nueva importación
import { useRouter } from 'next/navigation';

// const MainContentArea = ({ children }: { children: React.ReactNode }) => {
//    

//     return (
//         <>
//             <AppSidebar />
//             <Backdrop />
//             <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
//                 <AppHeader />
//                 <div className="pt-20">
//                     {/* Esta librería suele ser "plug and play" sin pelear con el CSS */}
//                     <PullToRefresh onRefresh={handleRefresh}>
//                         <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 min-h-[calc(100vh-80px)]">
//                             {children}
//                         </div>
//                     </PullToRefresh>
//                 </div>
//             </div>
//         </>
//     );
// };

// export default MainContentArea;


// ... tus demás importaciones

const MainContentArea = ({ children }: { children: React.ReactNode }) => {
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();
    const router = useRouter();

    const mainContentMargin = isMobileOpen
        ? "ml-0"
        : isExpanded || isHovered
            ? "lg:ml-[290px]"
            : "lg:ml-[90px]";

    // 1. Estado para saber si es móvil (inicia en false por defecto)
    const [isMobile, setIsMobile] = useState(false);

    // 2. Efecto para detectar el tamaño de la pantalla
    useEffect(() => {
        const checkIsMobile = () => {
            // 768px es el breakpoint 'md' de Tailwind
            setIsMobile(window.innerWidth < 768);
        };

        // Checamos al montar el componente
        checkIsMobile();

        // Escuchamos si el usuario redimensiona la ventana
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const handleRefresh = async () => {
        router.refresh();
        window.dispatchEvent(new Event('app:pullToRefresh'));
        return new Promise<void>((resolve) => setTimeout(resolve, 800));
    };

    // ... código de tus márgenes

    // 3. Extraemos el contenido para no repetir código
    const content = (
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 min-h-[calc(100vh-80px)]">
            {children}
        </div>
    );

    return (
        <>
            <AppSidebar />
            <Backdrop />
            <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
                <AppHeader />
                <div className="pt-20">

                    {/* 4. Renderizado Condicional */}
                    {isMobile ? (
                        <PullToRefresh onRefresh={handleRefresh}>
                            {content}
                        </PullToRefresh>
                    ) : (
                        content // En PC, solo mostramos el div normal
                    )}

                </div>
            </div>
        </>
    );
};

export default MainContentArea;