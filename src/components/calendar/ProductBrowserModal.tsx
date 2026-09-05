import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "../ui/button/Button";
import { Search, DollarSign } from "lucide-react";

import { getProducts } from "@/app/(admin)/(others-pages)/products/actions";
import { toast } from "react-toastify";

export const ProductBrowserModal = ({ 
    isOpen, 
    onClose, 
    onAddProduct 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onAddProduct: (product: any, price: number) => void;
}) => {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [pricePromptProduct, setPricePromptProduct] = useState<any>(null);
    const [customPrice, setCustomPrice] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            loadProducts();
        }
    }, [isOpen]);

    const loadProducts = async () => {
        try {
            const data = await getProducts();
            setProducts(data.products);
            setCategories(data.categories);
            if (data.categories.length > 0 && !activeCategory) {
                setActiveCategory(data.categories[0].id);
            }
        } catch (e) {
            toast.error("Error cargando productos");
        }
    };

    const handleAddClick = (product: any) => {
        if (product.variablePrice) {
            setPricePromptProduct(product);
            setCustomPrice('');
        } else {
            onAddProduct(product, product.price);
        }
    };

    const confirmCustomPrice = () => {
        if (!pricePromptProduct) return;
        const price = Number(customPrice);
        if (price <= 0 || isNaN(price)) return;
        
        onAddProduct(pricePromptProduct, price);
        setPricePromptProduct(null);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl sm:h-[85svh] p-0 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden" mobileVariant="fullscreen" showCloseButton={true}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <h2 className="text-xl font-bold">Catálogo de Productos</h2>
                    <p className="text-sm text-gray-500">Agrega productos de mostrador al ticket actual</p>
                </div>
                
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Categories */}
                    <div className="w-full md:w-64 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto p-4 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-3 rounded-xl text-sm font-semibold text-left transition-colors whitespace-nowrap ${activeCategory === cat.id ? 'bg-brand-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Products */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 dark:bg-gray-900/50 grid grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-max">
                        {products.filter(p => p.categoryId === activeCategory).map(product => (
                            <div
                                key={product.id}
                                onClick={() => handleAddClick(product)}
                                className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 cursor-pointer hover:border-brand-500 hover:shadow-md transition-all flex flex-col min-h-[120px]"
                            >
                                <div className="flex-1 font-bold text-gray-800 dark:text-white mb-2 leading-tight">
                                    {product.name}
                                </div>
                                <div className="mt-auto flex justify-between items-end">
                                    {product.variablePrice ? (
                                        <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">Variable</span>
                                    ) : (
                                        <span className="text-lg font-black text-brand-600 dark:text-brand-400">${product.price}</span>
                                    )}
                                    <span className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center font-bold text-lg">+</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {pricePromptProduct && (
                <Modal isOpen={!!pricePromptProduct} onClose={() => setPricePromptProduct(null)} className="max-w-sm p-5 text-center">
                    <h3 className="text-xl font-bold mb-1">{pricePromptProduct.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">Ingresa el precio de venta</p>
                    <div className="relative mb-5">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="number"
                            autoFocus
                            className="w-full pl-10 pr-4 py-3 text-2xl font-black rounded-xl border border-gray-200 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700"
                            placeholder="0"
                            value={customPrice}
                            onChange={(e) => setCustomPrice(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && confirmCustomPrice()}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setPricePromptProduct(null)}>Cancelar</Button>
                        <Button className="flex-1" onClick={confirmCustomPrice} disabled={!customPrice}>Agregar</Button>
                    </div>
                </Modal>
            )}
        </>
    );
};
