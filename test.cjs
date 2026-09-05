
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const anySale = await prisma.sale.findFirst({ select: { businessId: true } });
    if (!anySale) return;
    const businessId = anySale.businessId;
    
    const countGuestsWithPhone = await prisma.appointment.count({ where: { businessId, guestName: { not: null }, guestPhone: { not: null, not: '' } } });
    console.log('Guests with phone:', countGuestsWithPhone);
    const countGuestsWithoutPhone = await prisma.appointment.count({ where: { businessId, guestName: { not: null }, OR: [{ guestPhone: null }, { guestPhone: '' }] } });
    console.log('Guests without phone:', countGuestsWithoutPhone);
}
main().then(() => process.exit(0));
