import MemorySpaceApp from "@/app/_components/memory-space-app";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <MemorySpaceApp routeSlug={decodeURIComponent(slug)} />;
}
