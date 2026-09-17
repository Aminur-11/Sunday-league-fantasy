import Link from "next/link";
import { PrimaryButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <span className="text-5xl">🟥</span>
      <h1 className="text-2xl font-bold">Off target — page not found</h1>
      <p className="text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/">
        <PrimaryButton type="button">Back to safety</PrimaryButton>
      </Link>
    </div>
  );
}
