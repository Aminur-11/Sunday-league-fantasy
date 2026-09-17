import { Card } from "@/components/ui";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <h1 className="mb-4 text-2xl font-bold">Terms</h1>
      <Card className="prose prose-sm max-w-none dark:prose-invert">
        <p>
          This app is provided for private, personal use by an invited group
          of friends for a bit of fun around our weekly 7-a-side matches. It
          is not affiliated with, endorsed by, or associated with any
          professional football league or organisation.
        </p>
        <p>
          Fantasy points are calculated automatically from match statistics
          entered by a group admin. Scoring rules can change for future
          gameweeks at the admin&apos;s discretion; completed gameweeks are
          never silently altered.
        </p>
      </Card>
    </div>
  );
}
