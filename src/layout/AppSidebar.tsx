"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";
import { useBusiness } from "@/context/BusinessContext";
import { Sparkles, BadgeDollarSign, ShieldCheck, Clock, Settings } from 'lucide-react';
import { useSession } from "@/lib/auth-client";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  adminOnly?: boolean;
  receptionOrAdminOnly?: boolean;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean, icon: React.ReactNode; adminOnly?: boolean; receptionOrAdminOnly?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <CalenderIcon />,
    name: "Agenda",
    path: "/calendar",
  },
  {
    icon: <BadgeDollarSign />,
    name: "Historial Ventas",
    path: "/sales",
    adminOnly: true, // Asumimos Admin Only por confidencialidad financiera a menos que queramos que recepcionista vea.
  },
  {
    icon: <BadgeDollarSign />,
    name: "Nómina",
    path: "/payroll",
    adminOnly: true,
  },
  {
    icon: <Clock />,
    name: "Asistencia",
    path: "/attendance",
    adminOnly: true,
  },
  {
    icon: <ShieldCheck />,
    name: "Permisos y Roles",
    path: "/permissions",
    adminOnly: true,
  },
  {
    icon: <Settings />,
    name: "Configuración",
    path: "/settings",
    adminOnly: true,
  },
  {
    name: "Catalogos",
    icon: <ListIcon />,
    receptionOrAdminOnly: true,
    subItems: [
      {
        icon: <Sparkles />,
        name: "Servicios",
        path: "/services",
        adminOnly: true, // Por lo general esto es admin
      },
      {
        icon: <UserCircleIcon />,
        name: "Clientes",
        path: "/customers",
        receptionOrAdminOnly: true,
      },
      {
        icon: <UserCircleIcon />,
        name: "Empleados/Staff",
        path: "/employees",
        adminOnly: true,
      }
    ],
  },
];

const othersItems: NavItem[] = [];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const business = useBusiness();
  const { data: session } = useSession();

  const role = session?.user?.role || "EMPLOYEE"; // default
  const isAdmin = role === "ADMIN";
  const isReceptionOrAdmin = role === "RECEPTION" || role === "ADMIN";

  // Filter items logic
  const filteredNavItems = navItems.map(nav => {
    // If it's a menu with sub-items, filter sub-items first
    if (nav.subItems) {
      const filteredSubItems = nav.subItems.filter(sub => {
        if (sub.adminOnly && !isAdmin) return false;
        if (sub.receptionOrAdminOnly && !isReceptionOrAdmin) return false;
        return true;
      });
      return { ...nav, subItems: filteredSubItems };
    }
    return nav;
  }).filter(nav => {
    // Filter root-level items
    if (nav.adminOnly && !isAdmin) return false;
    if (nav.receptionOrAdminOnly && !isReceptionOrAdmin) return false;
    // Hide menus that have subItems but all were filtered out
    if (nav.subItems && nav.subItems.length === 0) return false;
    return true;
  });

  const renderMenuItems = (
    itemsToRender: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {itemsToRender.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={` ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                    }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
                onClick={() => {
                  if (isMobileOpen) toggleMobileSidebar()
                  // Si tienes una función específica para cerrar, úsala aquí
                  // Ejemplo: setIsMobileOpen(false) o toggleSidebar()
                  // if (isMobileOpen) setIsMobileOpen(false); 
                }}
              >
                <span
                  className={`${isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      onClick={() => {
                        if (isMobileOpen) toggleMobileSidebar()
                        // Si tienes una función específica para cerrar, úsala aquí
                        // Ejemplo: setIsMobileOpen(false) o toggleSidebar()
                        // if (isMobileOpen) setIsMobileOpen(false); 
                      }}
                      href={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.icon}
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => path === pathname;
  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-3 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-center"
          }`}
      >
        <Link href="/" className="flex  w-full">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex w-full justify-center">
              <Image
                className="dark:hidden"
                src={`/${business?.slug}/logo.png`}
                alt="Logo"
                width={120}
                height={20}
              />
              <Image
                className="hidden dark:block"
                src={`/${business?.slug}/logo.png`}
                alt="Logo"
                width={120}
                height={40}
              />
            </div>
          ) : (
            <div className="flex w-full justify-center">
              <Image
                src={`/${business?.slug}/logo.png`}
                alt="Logo"
                width={32}
                height={32}
              />
            </div>

          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(filteredNavItems, "main")}
            </div>

            {/* <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Others"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div> */}
          </div>
        </nav>
        {/* {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null} */}
      </div>
    </aside>
  );
};

export default AppSidebar;
