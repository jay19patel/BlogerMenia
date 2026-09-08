import { PageContainer } from "@/components/page-shell";
import { ArticleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <PageContainer>
      <ArticleSkeleton />
    </PageContainer>
  );
}
