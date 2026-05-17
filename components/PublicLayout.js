import Link from "next/link";
import { getContact } from "@/lib/data";
import YearlyChartSeoContent from "@/components/YearlyChartSeoContent";

export default async function PublicLayout({ children }) {
  const contact = await getContact();
  const year = new Date().getFullYear();
  const whatsapp = contact?.contactNumber || "";

  return (
    <section>
      <div className="text-center text-2xl text-white py-2">
        <div className="flex justify-center">
          <Link href="/">
            <img className="site-logo" alt="SattaKingFast" src="/img/logosm.jpg" />
          </Link>
        </div>
      </div>
      <div>
        <nav className="flex border border-white">
          <Link className="flex items-center justify-center md:px-16 bg-red-600 border-r border-white px-3" href="/" aria-label="Home">
            <span className="text-white text-3xl">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <path d="M280.37 148.26L96 300.11V464a16 16 0 0 0 16 16l112.06-.29a16 16 0 0 0 15.92-16V368a16 16 0 0 1 16-16h64a16 16 0 0 1 16 16v95.64a16 16 0 0 0 16 16.05L464 480a16 16 0 0 0 16-16V300L295.67 148.26a12.19 12.19 0 0 0-15.3 0zM571.6 251.47L488 182.56V44.05a12 12 0 0 0-12-12h-56a12 12 0 0 0-12 12v72.61L318.47 43a48 48 0 0 0-61 0L4.34 251.47a12 12 0 0 0-1.6 16.9l25.5 31A12 12 0 0 0 45.15 301l235.22-193.74a12.19 12.19 0 0 1 15.3 0L530.9 301a12 12 0 0 0 16.9-1.6l25.5-31a12 12 0 0 0-1.7-16.93z"></path>
              </svg>
            </span>
          </Link>
          <Link className="w-full bg-blue-600 border-r border-white text-white font-semibold text-center py-3 text-sm px-3" href="/">
            Home
          </Link>
          <Link className="w-full bg-blue-600 border-r border-white text-white font-semibold text-center py-3 text-sm px-3" href="/charts">
            Charts
          </Link>
          <a className="w-full bg-blue-600 border-r border-white text-white font-semibold text-center py-3 text-sm px-3" href={`https://wa.me/+${whatsapp}`} target="_blank">
            Contact
          </a>
          <Link className="w-full bg-blue-600 text-white font-semibold text-center py-3 text-sm px-3" href="/blog">
            Blog
          </Link>
        </nav>
        <marquee className="bg-white border border-white text-black font-semibold text-right px-4 py-3 text-xs md:text-sm">
          SATTA KING, SATTAKING, SATTA RESULT, GALI RESULT, GALI SATTA, SATTA BAZAR, GALI SATTA RESULT, SATTA KING 2024 SATTA KING 2025, SATTA KING RESULT, SATTA KING UP, SATTA GAME TODAY RESULT, SATTA RESULT CHART, SATTA KING LIVE, DESAWAR SATTA, FARIDABAD SATTA, FARIDABAD RESULT, BLACK SATTA KING
        </marquee>
        <p className="yellow_bg text-center py-3 font-semibold mx-1">Satta king | Satta result | सत्ता किंग</p>
      </div>
      {children}
      <a href={`https://wa.me/+${whatsapp}?text=${encodeURIComponent(contact?.name || "")}`} className="floating" target="_blank" rel="noreferrer" aria-label="WhatsApp">
        <svg className="fab-icon" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"></path>
        </svg>
      </a>
      <YearlyChartSeoContent />
      <footer className="mt-8">
        <div className="mx-5 border-2 border-blue-600 rounded-md p-6 bg-white text-center space-y-6">
          <div>
            <h2 className="text-red-600 font-bold text-xl mb-2">What is Satta King Fast</h2>
            <p className="text-gray-800 leading-relaxed">Satta King Fast refers to a popular number-based betting system where participants place bids on digits ranging from 00-99. This website keeps live results and old record charts for major markets.</p>
          </div>
          <div>
            <h2 className="text-red-600 font-bold text-xl mb-2">How Satta King Fast charts help in finding leak jodi</h2>
            <p className="text-gray-800 leading-relaxed">Players study Satta King Fast charts and historical results to identify patterns and trends. No method guarantees success, but old charts make comparison easier.</p>
          </div>
          <div>
            <h2 className="text-red-600 font-bold text-xl mb-2">How can I check old Satta King Fast results?</h2>
            <p className="text-gray-800 leading-relaxed">Use the monthly and yearly chart pages to check market-wise records by date and year.</p>
          </div>
        </div>
        <div className="bg-black text-center text-white py-8 mt-8 px-5">
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <Link className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-sm text-sm font-semibold" href="/about-us">ABOUT US</Link>
            <Link className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-sm text-sm font-semibold" href="/disclaimer">DISCLAIMER</Link>
            <Link className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-sm text-sm font-semibold" href="/Privacy-Policy">PRIVACY POLICY</Link>
          </div>
          <p className="text-gray-300 text-sm border-t border-gray-600 pt-4">Copyright © 2018-{year} - Satta King Fast</p>
        </div>
      </footer>
    </section>
  );
}
