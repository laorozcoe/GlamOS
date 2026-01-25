import { seed } from "@/lib/prisma";

const Seed = () => {
    seed();
    return (
        <div>
            <h1>Seed works!</h1>
        </div>
    );
};

export default Seed;