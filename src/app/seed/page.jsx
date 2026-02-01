import { seed, createUserPrisma, createServicePrisma, createManicuristPrisma } from "@/lib/prisma";

const Seed = async () => {
    // seed();
    // createUserPrisma("laorozcoe@gmail.com", "6d6f0206-b659-455f-9743-283d6949bb4c", "Luis Alejandro", "Orozco Estrada", "123456", "ADMIN")
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "Manicure clásico", "Limpieza, corte y esmalte", 30, 150, "Uñas")
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "Pedicure spa", "Pedicure con exfoliación y masaje", 60, 350, "Uñas")
    // createServicePrisma("6d6f0206-b659-455f-9743-283d6949bb4c", "Uñas acrílicas", "Aplicación completa de uñas acrílicas", 120, 700, "Uñas")



    // const manicurists = [
    //     {
    //         user: {
    //             name: "Ana",
    //             lastName: "López",
    //             email: "ana.lopez@salon.com",
    //             password: "password123",
    //             role: "MANICURIST",
    //         },
    //         manicurist: {
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
    //             role: "MANICURIST",
    //         },
    //         manicurist: {
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
    //             role: "MANICURIST",
    //         },
    //         manicurist: {
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
    //             role: "MANICURIST",
    //         },
    //         manicurist: {
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
    //             role: "MANICURIST",
    //         },
    //         manicurist: {
    //             phone: "5555678901",
    //             bio: "Manicure express y esmaltado semipermanente.",
    //             commission: 0.25,
    //             rating: 4.5
    //         }
    //     }
    // ]

    // for (let i = 0; i < 5; i++) {
    //     const user = await createUserPrisma(manicurists[i].user.name, "6d6f0206-b659-455f-9743-283d6949bb4c", manicurists[i].user.lastName, manicurists[i].user.email, manicurists[i].user.password, manicurists[i].user.role)
    //     await createManicuristPrisma(user.businessId, user.id, manicurists[i].manicurist.phone, manicurists[i].manicurist.bio, manicurists[i].manicurist.commission, manicurists[i].manicurist.rating)
    // }
    return (
        <div>
            <h1>Seed works!</h1>
        </div>
    );
};

export default Seed;