"use client";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/ui";
import EpisodeForm from "@/components/EpisodeForm";

export default function NewEpisodePage() {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <PageTitle title="Ghi nhận phát bệnh" subtitle="Tự động liên kết với ngày hôm đó" />
      <EpisodeForm onDone={() => router.push("/episodes")} onCancel={() => router.back()} />
    </div>
  );
}
