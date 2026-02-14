"use client"
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button/Button'; // Asumo que este es tu componente
import { getServicesCategoriesPrisma, getServicesPrisma, createServiceCategoryPrisma, updateServiceCategoryPrisma, deleteServiceCategoryPrisma, createServicePrisma, updateServicePrisma, deleteServicePrisma } from '@/lib/prisma';
import { useBusiness } from '@/context/BusinessContext';
import { Pencil, X, Clock, DollarSign } from 'lucide-react'; // Agregué iconos útiles
import Select from '@/components/form/Select';
import { Modal } from '@/components/ui/modal';

export default function ServicesAdmin() {
    const [activeCategory, setActiveCategory] = useState(null); // Inicializar como null
    const [serviceCategories, setServiceCategories] = useState([]);
    const [services, setServices] = useState([]);
    const bussiness = useBusiness();

    // Estados para los Modales
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [openDeleteCategory, setOpenDeleteCategory] = useState(false);
    const [openDeleteService, setOpenDeleteService] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);

    const fetchServiceCategories = async () => {
        // debugger
        const data = await getServicesCategoriesPrisma(bussiness.id);
        const serviceCategoriesMap = data.map(item => ({
            ...item,
            value: item.id,
            label: item.name
        }));
        setServiceCategories(serviceCategoriesMap);

        // Seleccionar la primera categoría por defecto si existe
        if (serviceCategoriesMap.length > 0 && !activeCategory) {
            handleCategoryClick(serviceCategoriesMap[0]);
        }
    };
    useEffect(() => {

        fetchServiceCategories();
    }, [bussiness.id]);

    const handleCategoryClick = async (category) => {
        const servicesData = await getServicesPrisma(bussiness.id, category.id);
        setActiveCategory(category);
        setServices(servicesData);
    };

    // --- LÓGICA CATEGORÍAS ---
    const handleEditCategoryClick = (e, category) => {
        e.stopPropagation(); // IMPORTANTE: Evita que se seleccione la categoría al dar click en editar
        setEditingCategory({ ...category }); // Copia para editar
        setIsCatModalOpen(true);
    };

    const saveCategory = async () => {
        debugger
        console.log("Guardando categoría:", editingCategory);
        // Aquí iría tu llamada a la Server Action o API
        if (editingCategory.id) {
            updateServiceCategoryPrisma(editingCategory.id, bussiness.id, editingCategory.name, editingCategory.order, editingCategory.active);
        } else {
            createServiceCategoryPrisma(bussiness.id, editingCategory.name, editingCategory.order, editingCategory.active);
        }

        fetchServiceCategories();
        setIsCatModalOpen(false);
    };

    const saveService = async () => {
        debugger
        console.log("Guardando servicio:", editingService);
        // Aquí iría tu llamada a la Server Action o API
        if (editingService.id) {
            updateServicePrisma(editingService.id, bussiness.id, editingService.categoryId, editingService.name, editingService.description, editingService.descriptionTicket, editingService.duration, editingService.price);
        } else {
            createServicePrisma(bussiness.id, editingService.categoryId, editingService.name, editingService.description, editingService.descriptionTicket, editingService.duration, editingService.price);
        }
        if (activeCategory.id) {
            const servicesData = await getServicesPrisma(bussiness.id, activeCategory.id);
            setServices(servicesData);
        }
        setIsServiceModalOpen(false);
    };

    // --- LÓGICA SERVICIOS ---
    const handleServiceClick = (service) => {
        setEditingService({ ...service }); // Copia para editar
        setIsServiceModalOpen(true);
    };

    const handleNewServiceClick = () => {
        // Inicializa un servicio vacío basado en tu esquema
        setEditingService({
            name: '',
            price: 1,
            duration: 30,
            description: '',
            descriptionTicket: '',
            categoryId: activeCategory?.id || ''
        });
        setIsServiceModalOpen(true);
    }

    const handleNewCategoryClick = () => {
        setEditingCategory({
            name: '',
        });
        setIsCatModalOpen(true);
    }



    const deleteService = async () => {
        debugger
        console.log("Eliminando servicio:", editingService);
        deleteServicePrisma(editingService.id, bussiness.id);
        // Aquí iría tu llamada a la Server Action o API
        const servicesData = await getServicesPrisma(bussiness.id, activeCategory.id);
        setServices(servicesData);
        setEditingService(null);
        // setActiveCategory(null);
        setIsServiceModalOpen(false);
        setOpenDeleteService(false);

    };

    const deleteCategory = async () => {
        debugger
        console.log("Eliminando categoría:", editingCategory);
        deleteServiceCategoryPrisma(editingCategory.id, bussiness.id);
        // Aquí iría tu llamada a la Server Action o API
        fetchServiceCategories();
        setEditingCategory(null);
        setActiveCategory(null);
        setIsCatModalOpen(false);
        setOpenDeleteCategory(false);
    };

    return (
        <div>
            <PageBreadcrumb pageTitle="Servicios" />
            <div className="min-h-full rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
                <div className="flex justify-center sm:justify-end gap-2 mb-5">
                    <Button onClick={handleNewCategoryClick} variant="outline">Nueva Categoría</Button>
                    <Button onClick={handleNewServiceClick}>Nuevo Servicio</Button>
                </div>

                <div className="max-w-7xl mx-auto min-h-full flex flex-col">
                    <div className="flex flex-wrap flex-1 gap-6 overflow-hidden">

                        {/* SIDEBAR DE CATEGORÍAS */}
                        <div className="w-64 bg-white rounded-lg border border-gray-200 p-4 sm:flex flex-col h-full hidden">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Categorías</h2>
                            <nav className="flex-1 flex flex-col gap-1 overflow-y-auto space-y-1">
                                {serviceCategories.map((category) => (
                                    // Usamos un div interactivo en lugar de Button anidado para evitar errores de HTML
                                    <div
                                        key={category.id}
                                        onClick={() => handleCategoryClick(category)}
                                        className={`
                                            group flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors
                                            ${activeCategory?.id === category.id
                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200'
                                                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}
                                        `}
                                    >
                                        <span>{category.name}</span>

                                        {/* Botón Lápiz */}
                                        <button
                                            onClick={(e) => handleEditCategoryClick(e, category)}
                                            className="p-1.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-100 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                            title="Editar categoría"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    </div>
                                ))}
                            </nav>
                        </div>

                        {/* MOBILE SELECT */}
                        <div className="contents sm:hidden">
                            <label className="text-sm font-medium text-gray-700">Categorías</label>
                            <Select
                                options={serviceCategories}
                                placeholder="Seleccionar..."
                                value={activeCategory?.id || ""}
                                onChange={(val) => {
                                    const category = serviceCategories.find((e) => String(e.id) === val);
                                    handleCategoryClick(category);
                                }}
                            />
                        </div>

                        {/* LISTA DE SERVICIOS */}
                        <div className="flex-1 rounded-lg border border-gray-200 p-6 overflow-y-auto relative bg-gray-50/50">
                            {activeCategory && (
                                <>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-gray-800">Servicios: {activeCategory.name}</h2>
                                        {/* Opción para editar la categoría activa desde el título */}
                                        <button onClick={(e) => handleEditCategoryClick(e, activeCategory)} className="text-gray-400 hover:text-blue-600 sm:hidden cursor-pointer">
                                            <Pencil size={18} />
                                        </button>
                                    </div>

                                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                                        {services.filter(service => service.categoryId === activeCategory.id).map(service => (
                                            <div
                                                key={service.id}
                                                onClick={() => handleServiceClick(service)}
                                                className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {service.name}
                                                    </h3>
                                                </div>

                                                <div className="flex justify-between items-center text-sm mt-4 pt-3 border-t border-gray-100">
                                                    <div className="flex items-center text-gray-900 font-bold">
                                                        <DollarSign size={14} className="mr-0.5 text-gray-400" />
                                                        {service.price}
                                                    </div>
                                                    <div className="flex items-center text-gray-500">
                                                        <Clock size={14} className="mr-1" />
                                                        {service.duration} min
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div >
            </div>
            {/* 

            <div className="">
//
//         </div> */}
            {/* --- MODAL EDITAR CATEGORÍA --- */}
            <Modal
                isOpen={isCatModalOpen}
                onClose={() => { setIsCatModalOpen(false); setEditingCategory(null) }}
                title={editingCategory?.id ? "Editar Categoría" : "Nueva Categoría"}
                className="flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 max-w-md"
            >

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full overflow-hidden">
                    <div className="flex justify-between items-center px-4 pb-4 sm:pb-8 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="font-semibold text-lg sm:text-xl">{editingCategory?.id ? "Editar Categoría" : "Nueva Categoría"}</h3>
                    </div>
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={editingCategory?.name || ''}
                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end pt-2 gap-5">
                            {editingCategory?.id && <Button onClick={deleteCategory} variant="outline">Eliminar</Button>}
                            <Button onClick={saveCategory}>Guardar Cambios</Button>
                        </div>
                    </div>
                </div>



            </Modal>

            <Modal
                isOpen={isServiceModalOpen}
                onClose={() => { setIsServiceModalOpen(false); setEditingService(null) }}
                title={editingService?.id ? "Editar Servicio" : "Nuevo Servicio"}
                className="flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 max-w-md"
            >

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full overflow-hidden">
                    <div className="flex justify-between items-center px-4 pb-4 sm:pb-8 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="font-semibold text-lg sm:text-xl">{editingService?.id ? "Editar Servicio" : "Nuevo Servicio"}</h3>
                    </div>
                    <div className="p-5 space-y-4">
                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={editingService?.name || ''}
                                onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categorías</label>
                            <Select
                                options={serviceCategories}
                                placeholder="Seleccionar..."
                                value={activeCategory?.id || ""}
                                onChange={(e) => setEditingService({ ...editingService, categoryId: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Precio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingService?.price || ""}
                                        onChange={(e) => setEditingService({ ...editingService, price: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            {/* Duración */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                                <input
                                    type="number"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={editingService?.duration || ""}
                                    onChange={(e) => setEditingService({ ...editingService, duration: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        {/* Descripción Ticket */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Ticket (Max 15)</label>
                            <input
                                type="text"
                                maxLength={15}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={editingService?.descriptionTicket || ''}
                                onChange={(e) => setEditingService({ ...editingService, descriptionTicket: e.target.value })}
                            />
                        </div>
                        {/* Descripción */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Completa</label>
                            <textarea
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                value={editingService?.description || ''}
                                onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end pt-2 gap-5">
                            {editingService?.id && <Button onClick={() => setOpenDeleteService(true)} variant="outline">Eliminar</Button>}
                            <Button onClick={saveService}>Guardar Servicio</Button>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                className="flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 max-w-md"
                isOpen={openDeleteCategory} onClose={() => setOpenDeleteCategory(false)}
            >
                {/* HEADER */}
                <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center">
                    <div>
                        <h5 className="text-xl font-bold text-gray-800 dark:text-white">
                            Elimiar
                        </h5>
                        <p className="text-sm text-gray-500 hidden sm:block">¿Estás seguro de eliminar?</p>
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-200 shadow-sm safe-area-pb">

                    <div className="flex gap-2">
                        <button onClick={deleteService} className="flex-1 py-3 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-700">
                            Eliminar
                        </button>

                    </div>
                </div>
            </Modal >

            <Modal
                className="flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 max-w-md"
                isOpen={openDeleteService} onClose={() => setOpenDeleteService(false)}
            >
                {/* HEADER */}
                <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center">
                    <div>
                        <h5 className="text-xl font-bold text-gray-800 dark:text-white">
                            Elimiar
                        </h5>
                        <p className="text-sm text-gray-500 hidden sm:block">¿Estás seguro de eliminar?</p>
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-200 shadow-sm safe-area-pb">

                    <div className="flex gap-2">
                        <button onClick={deleteService} className="flex-1 py-3 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-700">
                            Eliminar
                        </button>

                    </div>
                </div>
            </Modal >
        </div>
    );
}