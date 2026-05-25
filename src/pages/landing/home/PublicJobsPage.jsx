import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import Seo from '../../../components/Seo';
import JobOpeningsSection from './components/JobOpeningsSection';

export default function PublicJobsPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Seo
        title="Opportunity discovery | Naveen Talent Hub"
        description="Explore publicly listed opportunities and prepare your application with better clarity—free and premium listings in one place."
        canonicalPath="/jobs"
        ogImage="/hero-section/hero-image.webp"
      />
      <Navbar />
      <main className="pt-28 sm:pt-32 lg:pt-36 min-w-0">
        <JobOpeningsSection variant="directory" hideWhenEmpty={false} />
      </main>
      <Footer />
    </div>
  );
}
