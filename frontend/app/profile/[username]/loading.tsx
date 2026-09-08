import { PageContainer } from "@/components/page-shell";
import { ProfileSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <PageContainer>
      <ProfileSkeleton />
    </PageContainer>
  );
}
