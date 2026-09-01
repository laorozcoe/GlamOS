"use server";

import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";
import { revalidatePath } from "next/cache";

export async function getProducts() {
  const business = await getBusiness();
  if (!business) throw new Error("Business not found");

  const products = await prisma.product.findMany({
    where: { businessId: business.id, active: true },
    include: { category: true },
    orderBy: { name: 'asc' }
  });

  const categories = await prisma.productCategory.findMany({
    where: { businessId: business.id, active: true },
    orderBy: { order: 'asc' }
  });

  return { products, categories };
}

export async function createProductCategory(name: string) {
  const business = await getBusiness();
  if (!business) throw new Error("Business not found");

  const lastCategory = await prisma.productCategory.findFirst({
    where: { businessId: business.id, active: true },
    orderBy: { order: 'desc' }
  });

  const order = lastCategory?.order != null ? lastCategory.order + 1 : 1;

  const category = await prisma.productCategory.create({
    data: {
      name,
      order,
      businessId: business.id
    }
  });
  
  revalidatePath('/products');
  return category;
}

export async function deleteProductCategory(id: string) {
  const business = await getBusiness();
  if (!business) throw new Error("Business not found");

  await prisma.productCategory.update({
    where: { id, businessId: business.id },
    data: { active: false }
  });

  revalidatePath('/products');
  return { success: true };
}

export async function createProduct(data: { name: string; categoryId: string; description?: string; price: number; variablePrice?: boolean; stock?: number; barcode?: string }) {
  const business = await getBusiness();
  if (!business) throw new Error("Business not found");

  const product = await prisma.product.create({
    data: {
      name: data.name,
      categoryId: data.categoryId,
      description: data.description,
      price: data.price,
      variablePrice: data.variablePrice || false,
      stock: data.stock || 0,
      barcode: data.barcode,
      businessId: business.id
    }
  });

  revalidatePath('/products');
  return product;
}

export async function updateProduct(id: string, data: { name: string; categoryId: string; description?: string; price: number; variablePrice?: boolean; stock?: number; barcode?: string }) {
  const business = await getBusiness();
  if (!business) throw new Error("Business not found");

  const product = await prisma.product.update({
    where: { id, businessId: business.id },
    data: {
      name: data.name,
      categoryId: data.categoryId,
      description: data.description,
      price: data.price,
      variablePrice: data.variablePrice || false,
      stock: data.stock || 0,
      barcode: data.barcode,
    }
  });

  revalidatePath('/products');
  return product;
}

export async function deleteProduct(id: string) {
  const business = await getBusiness();
  if (!business) throw new Error("Business not found");

  await prisma.product.update({
    where: { id, businessId: business.id },
    data: { active: false }
  });

  revalidatePath('/products');
  return { success: true };
}
