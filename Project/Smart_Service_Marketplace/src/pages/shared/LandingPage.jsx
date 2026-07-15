import PublicNavbar from "../../components/layout/PublicNavbar";

import Hero from "../../components/landing/Hero";
import Services from "../../components/landing/Services";
import HowItWorks from "../../components/landing/HowItWorks";
import Features from "../../components/landing/Features";
import Statistics from "../../components/landing/Statistics";
import Testimonials from "../../components/landing/Testimonials";
import CTA from "../../components/landing/CTA";
import LandingFooter from "../../components/landing/LandingFooter";


function LandingPage() {
  return (
    <div className="bg-slate-50">

      <PublicNavbar />
      <Hero />
      <Services />
      <HowItWorks />
      <Features />
      <Statistics />
      <Testimonials />
      <CTA />
      <LandingFooter />

    </div>
  );
}

export default LandingPage;