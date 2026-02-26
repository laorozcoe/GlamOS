'use client'
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";

const MainContentArea = ({ children }: { children: React.ReactNode }) => {
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();
    const mainContentMargin = isMobileOpen
        ? "ml-0"
        : isExpanded || isHovered
            ? "lg:ml-[290px]"
            : "lg:ml-[90px]";
    return (
        <>
            <AppSidebar />
            <Backdrop />
            <div
                className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
            >
                <AppHeader />
                {/* no jala el pt-20 solo funciona mt-10*/}
                <div className="pt-20">

                    {/* 2. Este div se encarga del padding lateral, el ancho máximo y el scroll */}
                    <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 min-h-[calc(100vh-80px)]">
                        {children}
                    </div>

                </div>
            </div>
        </>
    );
};

export default MainContentArea;