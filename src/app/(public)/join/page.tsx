import type { Metadata } from "next";
import { SectionHeading } from "@/components/common/section-heading";
import { JoinForm } from "@/features/applications/components/join-form";
import { defaultOpenGraph } from "@/lib/site";

export const metadata: Metadata = {
  title: "Apply as an Artist",
  description: "Artists can apply to have their paintings featured on Art By Sukrutha.",
  alternates: { canonical: "/join" },
  openGraph: { ...defaultOpenGraph, url: "/join", title: "Apply as an Artist | Art By Sukrutha" },
};

const STEPS = [
  { title: "Apply", description: "Tell us about yourself and share links to your work." },
  { title: "Review", description: "Each application is looked at personally. You will hear back by email." },
  { title: "Get featured", description: "If it's a fit, you'll be invited to set up your profile and add your paintings." },
];

export default function JoinPage() {
  return (
    <div className="container-page grid gap-16 py-16 md:py-20 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
      <div className="space-y-10">
        <SectionHeading
          as="h1"
          eyebrow="For artists"
          title="Have your paintings featured"
          description="Art By Sukrutha is opening up to a small number of artists whose work celebrates heritage, nature and everyday life."
        />
        <ol className="space-y-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-serif text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-foreground/75">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <JoinForm />
    </div>
  );
}
