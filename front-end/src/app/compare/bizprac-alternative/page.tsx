import CompetitorPage, {
  buildCompetitorPageMetadata,
} from "@/components/SeoShared/Comparison/CompetitorPage";
import { getCompetitor } from "@/components/SeoShared/Comparison/comparisonData";

const competitor = getCompetitor("bizprac");

export const metadata = buildCompetitorPageMetadata(competitor, "alternative");

export default function Page() {
  return (
    <CompetitorPage
      competitor={competitor}
      variant="alternative"
      lastReviewed="2026-07-09"
    />
  );
}
