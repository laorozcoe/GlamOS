import { seed, createUserPrisma, createServicePrisma, createEmployeePrisma, createServiceCategoryPrisma, createClientPrisma } from "@/lib/prisma";

const Seed = async () => {

    createClientPrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "Luis Estrada", "61431944524", "", "")
    createClientPrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "Alejandro Orozco", "61431944525", "", "")
    // seed();
    // createUserPrisma("laorozcoe@gmail.com", "6d6f0206-b659-455f-9743-283d6949bb4c", "Luis Alejandro", "Orozco Estrada", "123456", "ADMIN")

    // createServiceCategoryPrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "Manos", 1, true)
    // createServiceCategoryPrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "Pies", 2, true)
    // createServiceCategoryPrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "Acrilico", 3, true)
    // createServiceCategoryPrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "Retiros", 4, true)
    // createServiceCategoryPrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "Depilación", 5, true)
    // createServiceCategoryPrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "Cabello", 6, true)
    // createServiceCategoryPrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "Adicional", 7, true)

    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "b91b795b-9beb-4bee-bacb-49ad8a46c75a", "Manicura básica", "", 60, 150.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "b91b795b-9beb-4bee-bacb-49ad8a46c75a", "Shellac manos (solo esmaltado)", "", 30, 150.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "b91b795b-9beb-4bee-bacb-49ad8a46c75a", "Manicura + Shellac", "", 60, 250.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "b91b795b-9beb-4bee-bacb-49ad8a46c75a", "Rubber + Shellac", "", 30, 220.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "b91b795b-9beb-4bee-bacb-49ad8a46c75a", "Calcio + Shellac", "", 30, 200.00)

    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "f6dc4fd7-57fc-4a2d-938d-44fe0eac1871", "Pedicura básica", "", 60, 350.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "f6dc4fd7-57fc-4a2d-938d-44fe0eac1871", "Shellac pies (incluye calcio o rubber)", "", 30, 180.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "f6dc4fd7-57fc-4a2d-938d-44fe0eac1871", "Pedicura + Shellac", "", 60, 450.00)

    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "414cb5d1-0cf6-4e47-b9e2-2bc7d9d8c0ce", "Acrílico + Shellac (esculturales)", "", 90, 450.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "414cb5d1-0cf6-4e47-b9e2-2bc7d9d8c0ce", "Retoque de acrílico", "", 60, 360.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "414cb5d1-0cf6-4e47-b9e2-2bc7d9d8c0ce", "Baño de acrílico + Shellac", "", 60, 400.00)

    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "84459906-6ba8-43ca-8ca8-601a3df309a0", "Retiro acrílico sin servicio", "", 60, 100.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "84459906-6ba8-43ca-8ca8-601a3df309a0", "Retiro acrílico con servicio", "", 60, 80.00)

    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "8973e338-17ed-4fc3-9fce-d8695927420b", "cejas", "", 30, 170.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "8973e338-17ed-4fc3-9fce-d8695927420b", "Bozo", "", 30, 170.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "8973e338-17ed-4fc3-9fce-d8695927420b", "Facial completo", "", 60, 330.00)

    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "e79ead33-b61c-42ad-bdb5-1d9f7777700f", "Planchado ceja", "", 60, 270.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "e79ead33-b61c-42ad-bdb5-1d9f7777700f", "Exfoliación", "", 15, 50.00)

    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "ff84a043-8d53-485e-b107-cb09dc92b0bf", "Ondas corto", "", 60, 220.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "ff84a043-8d53-485e-b107-cb09dc92b0bf", "Ondas largo", "", 30, 325.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "ff84a043-8d53-485e-b107-cb09dc92b0bf", "Planchado corto", "", 30, 110.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "ff84a043-8d53-485e-b107-cb09dc92b0bf", "Planchado medio", "", 30, 165.00)
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "ff84a043-8d53-485e-b107-cb09dc92b0bf", "Planchado largo", "", 30, 220.00)

    // const employees = [
    //     {
    //         user: {
    //             name: "Ana",
    //             lastName: "López",
    //             email: "ana.lopez@salon.com",
    //             password: "password123",
    //             role: "EMPLOYEE",
    //         },
    //         employee: {
    //             phone: "5551234567",
    //             bio: "Especialista en manicure clásico y spa.",
    //             commission: 0.35,
    //             rating: 4.8
    //         }
    //     },
    //     {
    //         user: {
    //             name: "María",
    //             lastName: "Hernández",
    //             email: "maria.hernandez@salon.com",
    //             password: "password123",
    //             role: "EMPLOYEE",
    //         },
    //         employee: {
    //             phone: "5552345678",
    //             bio: "Experta en uñas acrílicas y gel.",
    //             commission: 0.4,
    //             rating: 4.9
    //         }
    //     },
    //     {
    //         user: {
    //             name: "Daniela",
    //             lastName: "Ramírez",
    //             email: "daniela.ramirez@salon.com",
    //             password: "password123",
    //             role: "EMPLOYEE",
    //         },
    //         employee: {
    //             phone: "5553456789",
    //             bio: "Diseños personalizados y nail art.",
    //             commission: 0.45,
    //             rating: 4.7
    //         }
    //     },
    //     {
    //         user: {
    //             name: "Sofía",
    //             lastName: "Martínez",
    //             email: "sofia.martinez@salon.com",
    //             password: "password123",
    //             role: "EMPLOYEE",
    //         },
    //         employee: {
    //             phone: "5554567890",
    //             bio: "Pedicure spa y tratamientos relajantes.",
    //             commission: 0.3,
    //             rating: 4.6
    //         }
    //     },
    //     {
    //         user: {
    //             name: "Valeria",
    //             lastName: "Gómez",
    //             email: "valeria.gomez@salon.com",
    //             password: "password123",
    //             role: "EMPLOYEE",
    //         },
    //         employee: {
    //             phone: "5555678901",
    //             bio: "Manicure express y esmaltado semipermanente.",
    //             commission: 0.25,
    //             rating: 4.5
    //         }
    //     }
    // ]

    // for (let i = 0; i < 5; i++) {

    //     const user = await createUserPrisma("6d6f0206-b659-455f-9743-283d6949bb4c", employees[i].user.name, employees[i].user.lastName, employees[i].user.email, employees[i].user.password, employees[i].user.role)
    //     await createEmployeePrisma(user.businessId, user.id, employees[i].employee.phone, employees[i].employee.bio, employees[i].employee.commission, employees[i].employee.rating)
    // }

    return (
        <div>
            <h1>Seed works!</h1>
        </div>
    );
};

export default Seed;