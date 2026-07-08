import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.medicine.count();
  if (count === 0) {
    await prisma.medicine.create({
      data: {
        name: "Thuốc chính",
        dosage: "1 viên",
        morningTime: "07:00",
        eveningTime: "21:00",
        active: true,
      },
    });
    console.log("✔ Đã tạo thuốc mặc định (07:00 sáng / 21:00 tối). Chỉnh lại trong phần Cài đặt.");
  } else {
    console.log("→ Đã có thuốc, bỏ qua seed.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
