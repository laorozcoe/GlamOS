import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
    const slug = 'demo';
    const userEmail = 'laorozcoe@gmail.com';
    const userPass = '123456';

    const themeColors = {
        '--color-brand-25': '#faf5ff',
        '--color-brand-50': '#f3e8ff',
        '--color-brand-100': '#e9d5ff',
        '--color-brand-200': '#d8b4fe',
        '--color-brand-300': '#c084fc',
        '--color-brand-400': '#a855f7',
        '--color-brand-500': '#9333ea',
        '--color-brand-600': '#7e22ce',
        '--color-brand-700': '#6b21a8',
        '--color-brand-800': '#581c87',
        '--color-brand-900': '#4c1d95',
        '--color-brand-950': '#2e1065'
    };

    let business = await prisma.business.findUnique({ where: { slug } });
    if (!business) {
        business = await prisma.business.create({
            data: { name: 'Sitio Demo', slug: slug, themeColors: themeColors, openHour: 9, closeHour: 20 }
        });
        console.log('Business created!');
    } else {
        await prisma.business.update({ where: { slug }, data: { themeColors } });
        console.log('Business updated!');
    }

    const hash = await bcrypt.hash(userPass, 10);
    let user = await prisma.user.findFirst({ where: { email: userEmail, businessId: business.id } });
    if (!user) {
        user = await prisma.user.create({
            data: { name: 'Luis', lastName: 'Orozco', email: userEmail, username: userEmail.split('@')[0], password: hash, role: 'ADMIN', businessId: business.id }
        });
        console.log('User created!');
    } else {
        await prisma.user.update({ where: { id: user.id }, data: { password: hash, role: 'ADMIN' } });
        console.log('User updated!');
    }

    const employees = [
        { name: 'Ana', phone: '5551111111', email: 'ana@demo.com' },
        { name: 'Maria', phone: '5552222222', email: 'maria@demo.com' },
        { name: 'Sofia', phone: '5553333333', email: 'sofia@demo.com' }
    ];

    for (const emp of employees) {
        let u = await prisma.user.findFirst({ where: { email: emp.email, businessId: business.id } });
        if (!u) {
            u = await prisma.user.create({
                data: { name: emp.name, lastName: 'Demo', email: emp.email, username: emp.email.split('@')[0], password: hash, role: 'EMPLOYEE', businessId: business.id }
            });
        }
        let employee = await prisma.employee.findUnique({ where: { userId: u.id } });
        if (!employee) {
            await prisma.employee.create({
                data: { businessId: business.id, userId: u.id, phone: emp.phone }
            });
            console.log('Employee created:', emp.name);
        }
    }
}
main().finally(() => prisma.$disconnect());