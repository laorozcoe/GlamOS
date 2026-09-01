"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "../ui/button/Button";
import { Search, Plus, Trash, ShoppingBag, DollarSign, X } from "lucide-react";
import { getProducts } from "@/app/(admin)/(others-pages)/products/actions";
import { useBusiness } from "@/context/BusinessContext";
import { toast } from "react-toastify";
import InputField from "../form/input/InputField";
import { PaymentModal } from "@/components/calendar/PaymentModal";
import { createSalePrisma, getEmployeesPrisma } from "@/lib/prisma";

export const DirectSaleModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const business = useBusiness();
    
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<any[]>([]);
    
    // For variable price prompt
    const [pricePromptProduct, setPricePromptProduct] = useState<any>(null);
    const [customPrice, setCustomPrice] = useState<string>('');

    // For checkout
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            loadData();
            setCart([]);
        }
    }, [isOpen]);

    const loadData = async () => {
        try {
            const data = await getProducts();
            setProducts(data.products);
            setCategories(data.categories);
            if (data.categories.length > 0) setActiveCategory(data.categories[0].id);

            const emps = await getEmployeesPrisma(business?.id);
            setEmployees(emps);
            if (emps.length > 0) setSelectedEmployeeId(emps[0].id);
        } catch (e) {
            toast.error("Error cargando productos");
        }
    };

    const handleAddProduct = (product: any) => {
        if (product.variablePrice) {
            setPricePromptProduct(product);
            setCustomPrice('');
        } else {
            addToCart(product, product.price);
        }
    };

    const confirmCustomPrice = () => {
        if (!pricePromptProduct) return;
        const price = Number(customPrice);
        if (price <= 0 || isNaN(price)) {
            toast.error("Ingresa un precio válido");
            return;
        }
        addToCart(pricePromptProduct, price);
        setPricePromptProduct(null);
    };

    const addToCart = (product: any, price: number) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id && item.price === price);
            if (existing) {
                return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, price, quantity: 1 }];
        });
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    // For PaymentModal
    const paymentCartItems = cart.map(item => ({
        productId: item.product.id,
        price: item.price,
        description: item.product.name,
        quantity: item.quantity
    }));

    const handleFinalizeSale = async (paymentData: any) => {
        try {
            const salePayload = {
                businessId: business?.id,
                clientId: null,
                employeeId: selectedEmployeeId,
                items: paymentCartItems.map(i => ({
                    productId: i.productId,
                    description: i.description,
                    price: i.price,
                    quantity: i.quantity
                })),
                payment: paymentData.payment,
                totals: {
                    subtotal: paymentData.subtotal,
                    discount: paymentData.discount,
                    total: paymentData.total
                },
                couponId: paymentData.couponId,
                tokenId: paymentData.tokenId,
                mpPaymentId: paymentData.mpPaymentId,
                mpFee: paymentData.mpFee,
                promotionDiscount: paymentData.promotionDiscount
            };

            await createSalePrisma(salePayload);
            toast.success("Venta completada");
            setIsPaymentOpen(false);
            onClose();
        } catch (e) {
            toast.error("Error al registrar la venta");
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} className="w-[95svw] max-w-5xl h-[85svh] p-0 flex flex-col bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden" showCloseButton={true}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ShoppingBag className="text-brand-500" />
                            Venta de Productos
                        </h2>
                        <p className="text-sm text-gray-500">Venta rápida de mostrador</p>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Catálogo de Productos */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full overflow-hidden">
                        {/* Categorías */}
                        <div className="flex gap-2 overflow-x-auto p-3 border-b border-gray-100 dark:border-gray-800 no-scrollbar shrink-0">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeCategory === cat.id ? 'bg-brand-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>

                        {/* Grid Productos */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 dark:bg-gray-900/50 grid grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-max">
                            {products.filter(p => p.categoryId === activeCategory).map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => handleAddProduct(product)}
                                    className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 cursor-pointer hover:border-brand-500 hover:shadow-md transition-all flex flex-col"
                                >
                                    <div className="flex-1 font-bold text-gray-800 dark:text-white leading-tight mb-2">
                                        {product.name}
                                    </div>
                                    <div className="mt-auto">
                                        {product.variablePrice ? (
                                            <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">Variable</span>
                                        ) : (
                                            <span className="text-sm font-black text-brand-600 dark:text-brand-400">${product.price}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Carrito */}
                    <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white dark:bg-gray-900 h-full shrink-0">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                            <label className="text-xs font-bold text-gray-500 uppercase">Vendedor</label>
                            <select
                                className="w-full mt-1 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm focus:ring-brand-500 focus:border-brand-500"
                                value={selectedEmployeeId}
                                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            >
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.user.name} {emp.user.lastName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30 dark:bg-gray-900/30">
                            {cart.length === 0 ? (
                                <div className="text-center text-gray-400 py-10">
                                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Agrega productos al carrito</p>
                                </div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xs">
                                        <div className="flex-1 pr-2">
                                            <p className="font-bold text-sm text-gray-800 dark:text-white leading-tight">{item.product.name}</p>
                                            <p className="text-xs text-gray-500">{item.quantity} x ${item.price}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="font-black text-gray-900 dark:text-white">${item.price * item.quantity}</span>
                                            <button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/20 p-1 rounded-md">
                                                <Trash className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-gray-500 uppercase text-sm">Total a cobrar</span>
                                <span className="text-2xl font-black text-brand-600 dark:text-brand-400">${cartTotal.toLocaleString()}</span>
                            </div>
                            <Button 
                                className="w-full py-4 text-lg font-bold shadow-brand-500/30 shadow-lg" 
                                disabled={cart.length === 0}
                                onClick={() => setIsPaymentOpen(true)}
                            >
                                Cobrar
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Prompt para Precio Variable */}
            {pricePromptProduct && (
                <Modal isOpen={!!pricePromptProduct} onClose={() => setPricePromptProduct(null)} className="max-w-sm p-5 text-center">
                    <h3 className="text-xl font-bold mb-1">{pricePromptProduct.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">Ingresa el precio de venta de este artículo.</p>
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

            {/* Modal de Pagos */}
            {isPaymentOpen && (
                <PaymentModal
                    isOpen={isPaymentOpen}
                    onClose={() => setIsPaymentOpen(false)}
                    total={cartTotal}
                    onFinalize={handleFinalizeSale}
                    cartItems={paymentCartItems}
                />
            )}
        </>
    );
};
