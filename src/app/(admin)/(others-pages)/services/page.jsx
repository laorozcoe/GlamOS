"use client"
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button/Button';
import { getServicesCategoriesPrisma, getServicesPrisma } from '@/lib/prisma';
import { useBusiness } from '@/context/BusinessContext';


export default function ServicesAdmin() {
    const [activeTab, setActiveTab] = useState('services');
    const [activeCategory, setActiveCategory] = useState('manos');
    const [serviceCategories, setServiceCategories] = useState([]);
    const [services, setServices] = useState([]);
    const bussiness = useBusiness();

    useEffect(() => {
        const fetchServiceCategories = async () => {
            const serviceCategories = await getServicesCategoriesPrisma(bussiness.id);
            console.log(serviceCategories);
            setServiceCategories(serviceCategories);
        };
        fetchServiceCategories();
    }, []);

    const handleCategoryClick = async (category) => {
        debugger
        const services = await getServicesPrisma(bussiness.id, category.id);
        console.log(services);
        setActiveCategory(category);
        setServices(services);
    };
    return (
        <div>
            <PageBreadcrumb pageTitle="Servicios" />
            <div className="min-h-full rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
                <div className="flex justify-end gap-2 mb-5">
                    <Button variant="outline" >
                        + Nueva Categoría
                    </Button>
                    <Button >
                        + Nuevo Servicio
                    </Button>
                </div>
                <div className="max-w-7xl mx-auto min-h-full flex flex-col">

                    <div className="flex flex-1 gap-6 overflow-hidden">

                        <div className="w-64 bg-white rounded-lg border border-gray-200 p-4 flex flex-col h-full">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Categorías</h2>
                            <nav className="flex-1 flex flex-col gap-1 overflow-y-auto space-y-1">
                                {serviceCategories.map((category) => (
                                    <Button key={category.id} variant={activeCategory.id === category.id ? "primary" : "outline"} onClick={() => handleCategoryClick(category)} >
                                        {category.name}
                                    </Button>
                                ))}
                            </nav>
                        </div>
                        <div className="flex-1 rounded-lg border border-gray-200 p-6 overflow-y-auto ">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Servicios {activeCategory.name}</h2>
                            <div className='flex gap-5 flex-wrap'>
                                {services.filter(service => service.categoryId === activeCategory.id).map(service => (
                                    <div className=" " key={service.id}>
                                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                                            <div className="flex justify-between items-start mb-2 gap-2">
                                                <h3 className="font-semibold text-gray-800">{service.name}</h3>
                                                <span className={`bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full`}>X</span>
                                            </div>
                                            {/* <p className="text-sm text-g ray-500 mb-3 ">Aplicación de esmalte en gel con duración de 21 días.</p> */}
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-medium text-gray-900">$250.00</span>
                                                <span className="text-gray-500">45 min</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div >
            </div>
        </div>
    );
}