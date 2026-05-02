import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GraduationCap, Banknote, ArrowRight } from "lucide-react";

// Each brand's public Vercel URL. Overridable via env so this page can be
// reused on a separate "chooser" Vercel project that doesn't carry one
// brand's API binding.
const FMC_URL =
  process.env.NEXT_PUBLIC_FMC_URL || "https://be-crm.vercel.app";
const ADMITVERSE_URL =
  process.env.NEXT_PUBLIC_ADMITVERSE_URL || "https://avcrm-alpha.vercel.app";

const brands = [
  {
    name: "FundMyCampus",
    href: FMC_URL,
    icon: Banknote,
    title: "FundMyCampus",
    description:
      "Loan consultancy for Indian students studying abroad — manage leads, track applications, run AI voice campaigns.",
    accent: "from-emerald-500/20 to-emerald-500/5",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    name: "Admitverse",
    href: ADMITVERSE_URL,
    icon: GraduationCap,
    title: "Admitverse",
    description:
      "Admissions consultancy for international students — pipeline, counselling tasks, AI-assisted outreach.",
    accent: "from-blue-500/20 to-blue-500/5",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
];

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Welcome
          </h1>
          <p className="text-muted-foreground">
            Choose the CRM you want to sign in to.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {brands.map((brand) => {
            const Icon = brand.icon;
            return (
              <Link key={brand.name} href={brand.href} className="group">
                <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer relative overflow-hidden">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${brand.accent} opacity-0 group-hover:opacity-100 transition-opacity`}
                  />
                  <CardHeader className="relative">
                    <div className={`mb-4 ${brand.iconClass}`}>
                      <Icon className="h-12 w-12" strokeWidth={1.5} />
                    </div>
                    <CardTitle className="text-2xl">{brand.title}</CardTitle>
                    <CardDescription className="text-base">
                      {brand.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                      <span>Sign in</span>
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Two separate workspaces · Different data · Same login flow
        </p>
      </div>
    </div>
  );
}
