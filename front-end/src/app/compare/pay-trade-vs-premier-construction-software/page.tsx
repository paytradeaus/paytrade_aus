import CompetitorPage, {
  buildCompetitorPageMetadata,
} from "@/components/SeoShared/Comparison/CompetitorPage";
import { getCompetitor } from "@/components/SeoShared/Comparison/comparisonData";

const competitor = getCompetitor("premier-construction-software");

export const metadata = buildCompetitorPageMetadata(competitor, "vs");

export default function Page() {
  return (
    <CompetitorPage
      competitor={competitor}
      variant="vs"
      lastReviewed="2026-07-09"
    />
  );
}
