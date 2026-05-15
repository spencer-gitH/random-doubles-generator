import { use } from "react";
import ResultBoard from "@/components/ResultBoard";

export default function RandomizePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <ResultBoard slug={slug} />;
}
