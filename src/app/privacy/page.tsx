import { Card } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <h1 className="mb-4 text-2xl font-bold">Privacy</h1>
      <Card className="prose prose-sm max-w-none dark:prose-invert">
        <p>
          This app is a private fantasy football game for a closed group of
          friends. It stores your username, a securely hashed password, your
          fantasy team selections, and the match statistics needed to
          calculate fantasy points.
        </p>
        <p>
          No email address is collected. Data is not shared with any third
          party and is not used for advertising or analytics.
        </p>
      </Card>
    </div>
  );
}
