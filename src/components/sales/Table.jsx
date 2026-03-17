import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Badge from "../ui/badge/Badge";
import moment from "moment"
import Label from "@/components/form/Label"

// Recibimos una nueva prop: onRowClick
export default function SalesTable({ sales }) {
    console.log(sales);
    return (
        <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/5">
                <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Ticket
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Empleado
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Total
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Fecha
                    </TableCell>
                </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                {sales.map((sale) => (
                    <TableRow
                        key={sale.id}
                        // 1. Aquí agregamos el evento click para retornar al padre
                        onClick={() => onRowClick && onRowClick(sale)}
                        // Agregamos cursor pointer y un hover para que se sepa que es clickable
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                        <TableCell className="px-5 py-4 text-start">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-brand-100 rounded-full text-brand-600 font-bold uppercase">
                                    {sale.folio}
                                </div>

                            </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 truncate">
                            {sale.employee?.user?.name + " " + sale.employee?.user?.lastName || "Sin asignar"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 truncate">
                            <Label color="text-brand-500 dark:text-brand-400 "> {sale.total} $</Label>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 truncate">
                            {moment(sale.createdAt).format("YYYY-MM-DD hh:mm:SS a")}
                        </TableCell>

                        {/*   <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                            {sale.phone ? (
                                // 2. Enlace a WhatsApp
                                <a
                                    // Limpiamos el numero para dejar solo digitos (quita espacios, guiones, etc)
                                    href={`https://wa.me/${sale.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()} // 3. IMPORTANTE: Evita que se abra el detalle del cliente al dar clic en whatsapp
                                >
                                    <Badge size="sm" color="success">
                                        {sale.phone}
                                    </Badge>
                                </a>
                            ) : (
                                <Badge size="sm" color="light">N/A</Badge>
                            )}
                        </TableCell>

                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 max-w-[200px] truncate">
                            {sale.employee?.user?.name || "Sin asignar"}
                        </TableCell>

                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                            {new Date(sale.createdAt).toLocaleDateString('es-MX')}
                        </TableCell>*/}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}