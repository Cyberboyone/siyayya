import { Navbar } from "@/components/Navbar";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background pb-28 md:pb-0">
      <Navbar />
      <div className="container max-w-3xl py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-6">About Siyayya</h1>
        
        <div className="prose dark:prose-invert max-w-none text-muted-foreground space-y-6">
          <p>
            Welcome to Siyayya, the dedicated marketplace for the Federal University of Kashere (FUK) community. 
            Our platform was built with a single purpose: to make buying, selling, and finding services on campus 
            as easy, safe, and efficient as possible.
          </p>
          
          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Our Mission</h2>
          <p>
            We aim to connect students and staff, fostering a micro-economy within the FUK campus. Whether you're 
            a graduating student looking to sell your textbooks and hostel items, a freshman trying to find 
            affordable essentials, or a skilled student offering services like graphic design or phone repair, 
            Siyayya is your go-to platform.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Why Siyayya?</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Campus-Focused:</strong> Everything listed here is by someone within the Kashere community. No dealing with distant logistics.</li>
            <li><strong>Safe & Secure:</strong> By restricting the platform to the university ecosystem, we reduce the risks associated with public online marketplaces.</li>
            <li><strong>Empowering Students:</strong> Siyayya provides a platform for student-entrepreneurs to reach their direct target market easily.</li>
          </ul>

          <div className="mt-12 p-6 bg-secondary rounded-xl text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Ready to start trading?</h3>
            <p className="mb-4">Join hundreds of students already using Siyayya to buy and sell on campus.</p>
            <div className="flex justify-center gap-4">
              <Link to="/marketplace" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
                Browse Marketplace
              </Link>
              <Link to="/signup" className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
