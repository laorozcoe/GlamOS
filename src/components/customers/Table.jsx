import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Badge from "../ui/badge/Badge";

// Recibimos una nueva prop: onRowClick
export default function CustomerTable({ customers, onRowClick }) {
    return (
        <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/5">
                <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Nombre del Cliente
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Contacto
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Empleado Asignado
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Registro
                    </TableCell>
                </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                {customers.map((customer) => (
                    <TableRow
                        key={customer.id}
                        // 1. Aquí agregamos el evento click para retornar al padre
                        onClick={() => onRowClick && onRowClick(customer)}
                        // Agregamos cursor pointer y un hover para que se sepa que es clickable
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                        <TableCell className="px-5 py-4 text-start">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-blue-100 rounded-full text-blue-600 font-bold uppercase">
                                    {customer.name.charAt(0)}
                                </div>
                                <div>
                                    <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                        {customer.name}
                                    </span>
                                    <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                                        {customer.email || "Sin correo"}
                                    </span>
                                </div>
                            </div>
                        </TableCell>

                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                            {customer.phone ? (
                                // 2. Enlace a WhatsApp
                                <a
                                    // Limpiamos el numero para dejar solo digitos (quita espacios, guiones, etc)
                                    href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()} // 3. IMPORTANTE: Evita que se abra el detalle del cliente al dar clic en whatsapp
                                >
                                    <Badge size="sm" color="success">
                                        {customer.phone}
                                    </Badge>
                                </a>
                            ) : (
                                <Badge size="sm" color="light">N/A</Badge>
                            )}
                        </TableCell>

                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 max-w-[200px] truncate">
                            {customer.employee?.name || "Sin asignar"}
                        </TableCell>

                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                            {new Date(customer.createdAt).toLocaleDateString('es-MX')}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}