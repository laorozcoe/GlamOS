"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button/Button';
import { Pencil, X, DollarSign, Package, Tag, Plus, Check } from 'lucide-react';
import Select from '@/components/form/Select';
import { Modal } from '@/components/ui/modal';
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import { getProducts, createProductCategory, deleteProductCategory, createProduct, updateProduct, deleteProduct } from './actions';
import { toast } from "react-toastify";

export default function ProductsAdmin() {
    const [activeCategory, setActiveCategory] = useState<any>(null);
    const [productCategories, setProductCategories] = useState<any[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Modales Categorías
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [openDeleteCategory, setOpenDeleteCategory] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);

    // Modales Productos
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [openDeleteProduct, setOpenDeleteProduct] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);

    const loadData = async () => {
        try {
            const data = await getProducts();
            const catMap = data.categories.map((item: any) => ({
                ...item,
                value: item.id,
                label: item.name
            }));
            setProductCategories(catMap);
            setAllProducts(data.products);

            if (catMap.length > 0 && !activeCategory) {
                setActiveCategory(catMap[0]);
                setProducts(data.products.filter((p: any) => p.categoryId === catMap[0].id));
            } else if (activeCategory) {
                setProducts(data.products.filter((p: any) => p.categoryId === activeCategory.id));
            }
        } catch (e) {
            toast.error("Error al cargar productos");
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCategoryClick = (category: any) => {
        setActiveCategory(category);
        setProducts(allProducts.filter((p: any) => p.categoryId === category.id));
    };

    // --- CATEGORY LOGIC ---
    const handleEditCategoryClick = (e: any, category: any) => {
        e.stopPropagation();
        setEditingCategory({ ...category });
        setIsCatModalOpen(true);
    };

    const saveCategory = async () => {
        try {
            if (editingCategory.id) {
                // await updateProductCategory(editingCategory.id, editingCategory.name); // Implement if needed
                toast.error("Edición de categoría no implementada");
            } else {
                await createProductCategory(editingCategory.name);
                toast.success("Categoría creada");
            }
            await loadData();
            setIsCatModalOpen(false);
        } catch (e) {
            toast.error("Error al guardar categoría");
        }
    };

    const confirmDeleteCategory = async () => {
        if (!editingCategory?.id) return;
        try {
            await deleteProductCategory(editingCategory.id);
            toast.success("Categoría eliminada");
            setActiveCategory(null);
            await loadData();
            setOpenDeleteCategory(false);
            setIsCatModalOpen(false);
        } catch (e) {
            toast.error("Error al eliminar categoría");
        }
    };

    // --- PRODUCT LOGIC ---
    const handleProductClick = (product: any) => {
        setEditingProduct({ ...product });
        setIsProductModalOpen(true);
    };

    const handleNewProductClick = () => {
        setEditingProduct({
            name: '',
            price: 1,
            description: '',
            variablePrice: false,
            stock: 0,
            categoryId: activeCategory ? activeCategory.id : (productCategories[0]?.id || '')
        });
        setIsProductModalOpen(true);
    };

    const saveProduct = async () => {
        try {
            if (editingProduct.id) {
                await updateProduct(editingProduct.id, editingProduct);
                toast.success("Producto actualizado");
            } else {
                await createProduct(editingProduct);
                toast.success("Producto creado");
            }
            await loadData();
            setIsProductModalOpen(false);
        } catch (e) {
            toast.error("Error al guardar producto");
        }
    };

    const confirmDeleteProduct = async () => {
        if (!editingProduct?.id) return;
        try {
            await deleteProduct(editingProduct.id);
            toast.success("Producto eliminado");
            await loadData();
            setOpenDeleteProduct(false);
            setIsProductModalOpen(false);
        } catch (e) {
            toast.error("Error al eliminar producto");
        }
    };

    return (
        <div className="space-y-6">
            <PageBreadcrumb pageTitle="Catálogo de Productos" />
            <p className="text-sm text-gray-500">
                Gestiona los productos que vendes directamente (ropa, accesorios, productos de belleza). Estas ventas NO generan comisión para los empleados.
            </p>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Panel Izquierdo: Categorías */}
                <div className="w-full lg:w-1/3 xl:w-1/4">
                    <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 p-5 sticky top-24">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Tag className="w-4 h-4 text-brand-500" />
                                Categorías
                            </h3>
                            <button
                                onClick={() => {
                                    setEditingCategory({ name: '' });
                                    setIsCatModalOpen(true);
                                }}
                                className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center hover:bg-brand-100 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                            {productCategories.map((cat) => {
                                const isActive = activeCategory && activeCategory.id === cat.id;
                                return (
                                    <div
                                        key={cat.id}
                                        onClick={() => handleCategoryClick(cat)}
                                        className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${isActive ? 'bg-brand-500 text-white shadow-md' : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300'}`}
                                    >
                                        <span className={`text-sm font-semibold truncate pr-8 ${isActive ? 'text-white' : ''}`}>
                                            {cat.name}
                                        </span>
                                    </div>
                                );
                            })}
                            {productCategories.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-4">No hay categorías. Crea una para empezar.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel Derecho: Productos */}
                <div className="w-full lg:w-2/3 xl:w-3/4">
                    <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 p-5 min-h-[500px]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Package className="w-6 h-6 text-brand-500" />
                                    {activeCategory ? activeCategory.name : "Selecciona una categoría"}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {products.length} productos en esta categoría
                                </p>
                            </div>
                            <Button
                                onClick={handleNewProductClick}
                                disabled={!activeCategory}
                                className="shrink-0"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nuevo Producto
                            </Button>
                        </div>

                        {!activeCategory ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <Tag className="w-12 h-12 mb-3 opacity-20" />
                                <p>Selecciona una categoría de la izquierda</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                {products.map((product) => (
                                    <div
                                        key={product.id}
                                        onClick={() => handleProductClick(product)}
                                        className="group relative bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 hover:shadow-lg hover:border-brand-200 dark:hover:border-brand-500/30 transition-all duration-200 cursor-pointer flex flex-col h-full"
                                    >
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 dark:text-white mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                {product.name}
                                            </h4>
                                            {product.description && (
                                                <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                                                    {product.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-end justify-between gap-2">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                                    Precio
                                                </p>
                                                {product.variablePrice ? (
                                                    <div className="flex items-center text-sm font-bold text-blue-600 dark:text-blue-400">
                                                        <DollarSign className="w-4 h-4 mr-0.5" />
                                                        Variable
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center text-lg font-black text-gray-900 dark:text-white">
                                                        <DollarSign className="w-4 h-4 mr-0.5 text-gray-400" />
                                                        {product.price}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {products.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                                        <Package className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                        <p>No hay productos en esta categoría</p>
                                        <Button variant="outline" size="sm" onClick={handleNewProductClick} className="mt-4">
                                            Crear el primero
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL CATEGORIA */}
            <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} className="max-w-md p-0">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex justify-between items-center rounded-t-2xl">
                    <h5 className="text-lg font-bold text-gray-800 dark:text-white">
                        {editingCategory?.id ? "Editar Categoría" : "Nueva Categoría"}
                    </h5>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <Label>Nombre de la Categoría</Label>
                        <InputField
                            type="text"
                            value={editingCategory?.name || ''}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            placeholder="Ej. Joyería, Ropa"
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                    {editingCategory?.id && (
                        <Button variant="outline" onClick={() => setOpenDeleteCategory(true)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            Eliminar
                        </Button>
                    )}
                    <div className="flex-1 flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => setIsCatModalOpen(false)}>Cancelar</Button>
                        <Button onClick={saveCategory} disabled={!editingCategory?.name}>Guardar</Button>
                    </div>
                </div>
            </Modal>

            {/* MODAL ELIMINAR CATEGORIA */}
            <Modal isOpen={openDeleteCategory} onClose={() => setOpenDeleteCategory(false)} className="max-w-sm p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 mx-auto flex items-center justify-center mb-4">
                    <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">¿Eliminar categoría?</h3>
                <p className="text-gray-500 text-sm mb-6">
                    Esto eliminará la categoría "{editingCategory?.name}". Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setOpenDeleteCategory(false)}>Cancelar</Button>
                    <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={confirmDeleteCategory}>Eliminar</Button>
                </div>
            </Modal>

            {/* MODAL PRODUCTO */}
            <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} className="max-w-xl p-0">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex justify-between items-center rounded-t-2xl">
                    <h5 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-brand-500" />
                        {editingProduct?.id ? "Editar Producto" : "Nuevo Producto"}
                    </h5>
                </div>

                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="col-span-full md:col-span-2">
                            <Label>Categoría</Label>
                            <Select
                                value={editingProduct?.categoryId || ''}
                                onChange={(e: any) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                                options={productCategories}
                            />
                        </div>

                        <div className="col-span-full">
                            <Label>Nombre del Producto</Label>
                            <InputField
                                type="text"
                                value={editingProduct?.name || ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                placeholder="Ej. Aretes de Plata"
                            />
                        </div>

                        <div className="col-span-full">
                            <Label>Descripción (Opcional)</Label>
                            <TextArea
                                value={editingProduct?.description || ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                placeholder="Breve descripción del producto"
                                rows={2}
                            />
                        </div>

                        <div className="col-span-full bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mt-1 w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                                    checked={editingProduct?.variablePrice || false}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, variablePrice: e.target.checked })}
                                />
                                <div>
                                    <span className="block font-bold text-gray-800 dark:text-white text-sm mb-1">
                                        Precio Variable Abierto
                                    </span>
                                    <span className="block text-xs text-gray-500 leading-relaxed">
                                        Si activas esta opción, el sistema te pedirá capturar el precio exacto cada vez que vendas este producto. Ideal para categorías genéricas como "Joyería" donde cada pieza tiene un costo distinto.
                                    </span>
                                </div>
                            </label>
                        </div>

                        {!editingProduct?.variablePrice && (
                            <div>
                                <Label>Precio de Venta</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <DollarSign className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white sm:text-sm"
                                        value={editingProduct?.price || ''}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                                        placeholder="0.00"
                                        min="0"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                    {editingProduct?.id && (
                        <Button variant="outline" onClick={() => setOpenDeleteProduct(true)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            Eliminar
                        </Button>
                    )}
                    <div className="flex-1 flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
                        <Button onClick={saveProduct} disabled={!editingProduct?.name || (!editingProduct?.variablePrice && !editingProduct?.price)}>
                            Guardar Producto
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* MODAL ELIMINAR PRODUCTO */}
            <Modal isOpen={openDeleteProduct} onClose={() => setOpenDeleteProduct(false)} className="max-w-sm p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 mx-auto flex items-center justify-center mb-4">
                    <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">¿Eliminar producto?</h3>
                <p className="text-gray-500 text-sm mb-6">
                    Esto eliminará el producto "{editingProduct?.name}". No podrás venderlo más.
                </p>
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setOpenDeleteProduct(false)}>Cancelar</Button>
                    <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={confirmDeleteProduct}>Eliminar</Button>
                </div>
            </Modal>

        </div>
    );
}
