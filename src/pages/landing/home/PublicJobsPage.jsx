import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import Seo from '../../../components/Seo';
import JobOpeningsSection from './components/JobOpeningsSection';

export default function PublicJobsPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Seo
        title="Open roles | Naveen Talent Hub"
        description="Browse every role we are hiring for on the landing page—free and premium openings in one place."
        canonicalPath="/jobs"
        ogImage="/hero-section/hero-image.jpg"
      />
      <Navbar />
      <main className="pt-28 sm:pt-32 lg:pt-36 min-w-0">
        <JobOpeningsSection variant="directory" hideWhenEmpty={false} />
      </main>
      <Footer />
    </div>
  );
}
