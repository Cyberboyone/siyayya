import { Navbar } from "@/components/Navbar";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSEO } from "@/hooks/useSEO";

const ContactUs = () => {
  useSEO({
    title: "Contact Us | Siyayya Support",
    description: "Got questions or feedback? Contact the Siyayya support team. We're here to help the Kashere community.",
  });
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Thank you for your message! Our support team will get back to you soon.");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-0">
      <Navbar />
      <div className="container max-w-4xl py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-4">Contact Support</h1>
            <p className="text-muted-foreground mb-8 text-pretty">
              Have a question, feedback, or need help with a transaction? We're here to help. 
              Fill out the form, and our team will respond as soon as possible.
            </p>

            <div className="grid gap-6">
              <a href="mailto:info@siyayya.com" className="flex items-start gap-4 p-4 rounded-2xl border border-black/5 bg-surface hover:bg-muted/50 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-black text-textPrimary uppercase tracking-widest text-xs mb-1">Email Support</h3>
                  <p className="text-sm text-textSecondary font-bold">info@siyayya.com</p>
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">Click to email</p>
                </div>
              </a>
              
              <a href="tel:+2348145455720" className="flex items-start gap-4 p-4 rounded-2xl border border-black/5 bg-surface hover:bg-muted/50 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-black text-textPrimary uppercase tracking-widest text-xs mb-1">Call Us</h3>
                  <p className="text-sm text-textSecondary font-bold">+234 8145455720</p>
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">Click to call</p>
                </div>
              </a>

              <div className="flex items-start gap-4 p-4 rounded-2xl border border-black/5 bg-surface shadow-sm">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-black text-textPrimary uppercase tracking-widest text-xs mb-1">Office Address</h3>
                  <p className="text-sm text-textSecondary font-bold leading-relaxed">
                    Block K Male Hostel,<br />
                    Federal University of Kashere,<br />
                    Gombe State, Nigeria.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  className="mt-1 h-12 w-full rounded-xl border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@fukashere.edu.ng"
                  className="mt-1 h-12 w-full rounded-xl border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <input
                  required
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="How can we help?"
                  className="mt-1 h-12 w-full rounded-xl border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Message</label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="mt-1 w-full rounded-xl border bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={5}
                  placeholder="Describe your issue or feedback in detail..."
                />
              </div>
              <Button type="submit" className="w-full h-12 bg-primary text-primary-foreground font-medium mt-2">
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
