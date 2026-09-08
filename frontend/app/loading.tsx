import { PageContainer } from "@/components/page-shell";
import { BlogListSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <PageContainer>
      <BlogListSkeleton />
    </PageContainer>
  );
}
