import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Search, Users, Bell, Shield } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex-1 ">
      {/* Hero Section with Government Seal */}
      <section className="relative py-12 md:py-20 overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80"></div>
        <div className="container relative px-4 mx-auto">
          <div className="flex flex-col items-center text-center">
            <div className="mb-8">
              <Image
                src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                alt="Government of India Seal"
                className="h-20 sm:h-24 md:h-32 dark:invert-[0.85]"
                width={128}
                height={128}
              />
            </div>
            <div className="space-y-4 text-primary-foreground">
              <div className="text-sm md:text-base tracking-wider">Government of India</div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold">
                ABSENS
              </h1>
              <p className="text-base sm:text-lg md:text-xl font-medium text-primary-foreground/90">
                AI-Based System for Efficiently Notifying and Searching
              </p>
              <p className="max-w-[42rem] mx-auto text-xs sm:text-sm md:text-base text-primary-foreground/80">
                A Government Initiative to Locate Missing Individuals Using Advanced Technology
              </p>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="accent" className="min-w-[180px] sm:min-w-[200px] text-sm sm:text-base" asChild>
                <Link href="/report">
                  Report Missing Person
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="min-w-[180px] sm:min-w-[200px] text-sm sm:text-base bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10" asChild>
                <Link href="/search">
                  Search Database
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-12 bg-secondary">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-lg bg-card shadow-sm overflow-hidden">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary break-words">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 bg-background">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              How ABSENS Works
            </h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">
              Advanced Technology for Missing Person Identification
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-card/80 p-4 sm:p-6 rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow"
              >
                <feature.icon className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-3 sm:mb-4" />
                <h3 className="font-bold text-foreground mb-1 sm:mb-2 text-base sm:text-lg">{feature.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 bg-accent/80 text-accent-foreground">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">
              Join Our Mission to Protect and Reunite
            </h2>
            <p className="text-accent-foreground/90 mb-6 sm:mb-8 text-sm sm:text-base">
              Be part of our nationwide network of volunteers and law enforcement agencies.
              Help us create a safer community for everyone.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild variant="default" size="lg" className="text-sm sm:text-base">
                <Link href="/register">
                  Register as Volunteer
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-transparent border-accent-foreground/40 text-accent-foreground hover:bg-accent-foreground/10 text-sm sm:text-base">
                <Link href="/dashboard">
                  Access Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const stats = [
  { value: "50,000+", label: "Missing Persons Found" },
  { value: "24/7", label: "Support Available" },
  { value: "100+", label: "Connected Agencies" },
  { value: "1000+", label: "Active Volunteers" }
];

const features = [
  {
    title: "AI Recognition",
    description: "State-of-the-art facial recognition and age progression technology for accurate identification",
    icon: Search
  },
  {
    title: "Real-time Alerts",
    description: "Instant notifications for potential matches and sightings across the country",
    icon: Bell
  },
  {
    title: "Volunteer Network",
    description: "Nationwide network of verified volunteers and organizations working together",
    icon: Users
  },
  {
    title: "Law Enforcement",
    description: "Secure integration with police and law enforcement agencies across India",
    icon: Shield
  }
];