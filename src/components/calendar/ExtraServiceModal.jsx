import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";


export const ExtraServiceModal =({
    isOpen, onClose, extraService,setExtraService, onSave
}) => {

    const handleOnSave = () => {
        debugger
        onSave({
            price: extraService,
            name: "Servicio extra",
            id:null
        
        });
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-sm p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-2">Agregar servicio extra?</h3>
                <div className="py-5">
                    <InputField type="number" value={extraService} placeholder="Inserta el monto" onChange={(e) => {
        // Aquí está el cambio: extraemos el valor del evento
        setExtraService(parseFloat(e.target.value) || 0); 
    }}></InputField>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
                    <Button className="flex-1 bg-brand-500 hover:bg-brand-600 text-white" onClick={handleOnSave}>Agregar</Button>
                </div>
            </Modal>
    );
};



// active:true
// businessId:"6d6f0206-b659-455f-9743-283d6949bb4c"
// categoryId:"b91b795b-9beb-4bee-bacb-49ad8a46c75a"
// createdAt:Mon Feb 02 2026 19:48:54 GMT-0600 (hora estándar central) {}
// description:""
// descriptionTicket:"Manicura básica"
// duration:60
// id:"227ec1cb-d0b1-45d4-b22d-c7713803e0ab"
// name:"Manicura básica"
// price:150