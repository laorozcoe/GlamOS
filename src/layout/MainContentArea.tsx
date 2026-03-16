'use client'
import { useState, useEffect } from "react";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import PullToRefresh from 'react-simple-pull-to-refresh';
import { useRouter } from 'next/navigation';

const MainContentArea = ({ children }: { children: React.ReactNode }) => {
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();
    const router = useRouter();

    const mainContentMargin = isMobileOpen
        ? "ml-0"
        : isExpanded || isHovered
            ? "lg:ml-[290px]"
            : "lg:ml-[90px]";

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkIsMobile();

        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const handleRefresh = async () => {
        router.refresh();
        window.dispatchEvent(new Event('app:pullToRefresh'));
        return new Promise<void>((resolve) => setTimeout(resolve, 800));
    };

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
                <div className="">

                    {isMobile ? (
                        <PullToRefresh onRefresh={handleRefresh}>
                            {content}
                        </PullToRefresh>
                    ) : (
                        content
                    )}

                </div>
            </div>
        </>
    );
};

export default MainContentArea;