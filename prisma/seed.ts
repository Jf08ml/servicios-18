import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const birthDate = new Date("1995-05-10");

  // ── Admin ────────────────────────────────────────────────
  await db.user.upsert({
    where: { email: "admin@prepagoniacas.local" },
    update: {},
    create: {
      email: "admin@prepagoniacas.local",
      passwordHash,
      role: "ADMIN",
      displayName: "Equipo Prepagoniacas",
      birthDate,
    },
  });

  // ── Cuenta de hotel + hotel aliado ───────────────────────
  const hotelUser = await db.user.upsert({
    where: { email: "hotel@prepagoniacas.local" },
    update: {},
    create: {
      email: "hotel@prepagoniacas.local",
      passwordHash,
      role: "HOTEL",
      displayName: "Hotel Luna Azul",
      birthDate,
    },
  });

  const existingHotel = await db.hotel.findFirst({ where: { ownerId: hotelUser.id } });
  if (!existingHotel) {
    await db.hotel.create({
      data: {
        ownerId: hotelUser.id,
        name: "Hotel Luna Azul",
        city: "Bogotá",
        address: "Calle 45 #12-34, Chapinero",
        description:
          "Hotel discreto y seguro en el corazón de Chapinero. Recepción 24 horas, parqueadero privado y entrada independiente.",
        commissionPct: 10,
        roomTypes: {
          create: [
            {
              name: "Habitación estándar",
              description: "Cama doble, baño privado, TV y aire acondicionado.",
              blockHours: 3,
              price: 60000,
              totalRooms: 6,
            },
            {
              name: "Suite jacuzzi",
              description: "Suite amplia con jacuzzi, iluminación ambiental y minibar.",
              blockHours: 4,
              price: 140000,
              totalRooms: 2,
            },
          ],
        },
      },
    });
  }

  // ── Profesional verificada ───────────────────────────────
  const worker = await db.user.upsert({
    where: { email: "valentina@prepagoniacas.local" },
    update: {},
    create: {
      email: "valentina@prepagoniacas.local",
      passwordHash,
      role: "WORKER",
      displayName: "Valentina",
      birthDate: new Date("1997-03-22"),
      verifiedAt: new Date(),
      premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      profile: {
        create: {
          bio: "Acompañante independiente en Bogotá. Atención profesional, puntual y discreta. Agenda con anticipación por favor.",
          countryCode: "CO",
          countryName: "Colombia",
          stateCode: "DC",
          stateName: "Bogotá D.C.",
          city: "Bogotá D.C.",
          languages: "Español, Inglés",
          visible: true,
        },
      },
      verification: {
        create: {
          fullName: "Valentina Ejemplo Pérez",
          docType: "CC",
          docNumber: "1023456789",
          docImagePath: "verifications/demo-doc.jpg",
          selfiePath: "verifications/demo-selfie.jpg",
          isPremiumRequested: true,
          status: "APPROVED",
          reviewedAt: new Date(),
        },
      },
      availability: {
        create: [
          { weekday: 1, startMinute: 14 * 60, endMinute: 20 * 60 },
          { weekday: 3, startMinute: 14 * 60, endMinute: 20 * 60 },
          { weekday: 5, startMinute: 16 * 60, endMinute: 23 * 60 },
        ],
      },
    },
  });

  // ── Cliente verificado ───────────────────────────────────
  const client = await db.user.upsert({
    where: { email: "cliente@prepagoniacas.local" },
    update: {},
    create: {
      email: "cliente@prepagoniacas.local",
      passwordHash,
      role: "CLIENT",
      displayName: "Andrés M.",
      birthDate: new Date("1990-11-02"),
      verifiedAt: new Date(),
      profile: {
        create: {
          countryCode: "CO",
          countryName: "Colombia",
          stateCode: "DC",
          stateName: "Bogotá D.C.",
          city: "Bogotá D.C.",
        },
      },
      verification: {
        create: {
          fullName: "Andrés Ejemplo Mora",
          docType: "CC",
          docNumber: "79876543",
          docImagePath: "verifications/demo-doc-2.jpg",
          selfiePath: "verifications/demo-selfie-2.jpg",
          status: "APPROVED",
          reviewedAt: new Date(),
        },
      },
      emergencyContacts: {
        create: [{ name: "Hermano - Julián", phone: "+57 300 123 4567" }],
      },
    },
  });

  // ── Cita completada con reseñas (historial de ejemplo) ───
  const pastStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const pastEnd = new Date(pastStart.getTime() + 2 * 60 * 60 * 1000);
  const existingAppointment = await db.appointment.findFirst({
    where: { workerId: worker.id, clientId: client.id },
  });
  if (!existingAppointment) {
    const appointment = await db.appointment.create({
      data: {
        workerId: worker.id,
        clientId: client.id,
        startsAt: pastStart,
        endsAt: pastEnd,
        status: "COMPLETED",
      },
    });
    await db.review.createMany({
      data: [
        {
          appointmentId: appointment.id,
          authorId: client.id,
          targetId: worker.id,
          score: 5,
          comment: "Muy profesional y puntual. Todo tal como se acordó.",
        },
        {
          appointmentId: appointment.id,
          authorId: worker.id,
          targetId: client.id,
          score: 5,
          comment: "Cliente respetuoso y cumplido. Recomendado.",
        },
      ],
    });
  }

  console.log("Seed completado.");
  console.log("Cuentas de prueba (contraseña: password123):");
  console.log("  admin@prepagoniacas.local      → Administración");
  console.log("  hotel@prepagoniacas.local      → Panel de hotel aliado");
  console.log("  valentina@prepagoniacas.local  → Profesional verificada (premium)");
  console.log("  cliente@prepagoniacas.local    → Cliente verificado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
