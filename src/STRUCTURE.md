# Source structure

- **components/** – Shared UI used across pages
  - **auth/** – AuthListener, ProtectedRoute
  - Navbar, Footer, SectionContainer (global layout)

- **layouts/** – Page layout shells (sidebar + outlet, etc.)
  - DashboardLayout.jsx

- **pages/** – Route areas; each route has a subfolder named after the route, with page + components (and optional data/)
  - **landing/** – data/ (shared). **home/** (route `/`) – LandingPage + home/components/
  - **auth/** – LoginPage
  - **dashboard/** – shared components/, data/. **overview/** (`/dashboard`), **jobs/** (`/dashboard/jobs`), **applications/** (`/dashboard/applications`) – page + route-specific components/
  - **pricing/** – data/ (shared). **pricing/** (route `/pricing`) – PricingPage + pricing/components/
  - PlaceholderPage.jsx (misc)

- **store/** – Redux store, slices, hooks
- **lib/** – Supabase client and other shared utilities
