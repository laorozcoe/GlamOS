
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const anySale = await prisma.sale.findFirst({ select: { businessId: true } });
    if (!anySale) {
        console.log('No sales found at all');
        return;
    }
    const businessId = anySale.businessId;
    
    // Check total sales
    const totalSales = await prisma.sale.count({ where: { businessId } });
    console.log('Total sales:', totalSales);
    
    // Check sales with client
    const salesWithClient = await prisma.sale.count({ where: { businessId, clientId: { not: null } } });
    console.log('Sales with client:', salesWithClient);
}
main().finally(() => prisma.$disconnect());
