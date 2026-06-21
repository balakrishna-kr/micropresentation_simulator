import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main className="flex-1">
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}
