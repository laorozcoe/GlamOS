type BusinessCacheItem = {
  id: string
  slug: string
  expiresAt: number
}

const CACHE = new Map<string, BusinessCacheItem>()

const TTL = 1000 * 60 * 5 // 5 minutos

export async function getBusinessCached(slug: string) {
  const now = Date.now()

  const cached = CACHE.get(slug)

  if (cached && cached.expiresAt > now) {
    return cached
  }

  // ⚠️ aquí sí consultas Prisma
  const business = await fetchBusinessFromDB(slug)

  if (!business) return null

  const item: BusinessCacheItem = {
    id: business.id,
    slug: business.slug,
    expiresAt: now + TTL,
  }

  CACHE.set(slug, item)

  return item
}

// 👇 función real de Prisma (la separas)
async function fetchBusinessFromDB(slug: string) {
  const { prisma } = await import("@/lib/prisma")
  return prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  })
}
