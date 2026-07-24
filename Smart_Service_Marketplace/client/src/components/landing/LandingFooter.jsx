import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaXTwitter,
} from "react-icons/fa6";

function LandingFooter() {
  return (
    <footer id="contact" className="bg-slate-900 text-white py-8 ">

      <div className="max-w-7xl mx-auto px-6 grid gap-10 md:grid-cols-4">

        <div>

          <h2 className="text-2xl font-bold text-indigo-400">

            SmartService

          </h2>

          <p className="mt-4 text-slate-400">

            Your trusted marketplace for professional home services.

          </p>

        </div>

        <div>

          <h3 className="font-semibold mb-4">

            Company

          </h3>

          <ul className="space-y-3 text-slate-400">

            <li>About</li>

            <li>Careers</li>

            <li>Blog</li>

          </ul>

        </div>

        <div>

          <h3 className="font-semibold mb-4">

            Services

          </h3>

          <ul className="space-y-3 text-slate-400">

            <li>Electrical</li>

            <li>Plumbing</li>

            <li>Cleaning</li>

          </ul>

        </div>

        <div>

          <h3 className="font-semibold mb-4">

            Follow Us

          </h3>

          <div className="flex gap-4 text-2xl">

  <FaFacebook className="cursor-pointer hover:text-indigo-400 transition-colors" />

  <FaInstagram className="cursor-pointer hover:text-indigo-400 transition-colors" />

  <FaLinkedin className="cursor-pointer hover:text-indigo-400 transition-colors" />

  <FaXTwitter className="cursor-pointer hover:text-indigo-400 transition-colors" />

</div>

        </div>

      </div>

      <div className="mt-16 border-t border-slate-700 pt-4 text-center text-slate-500">

        © {new Date().getFullYear()} Smart Service Marketplace. All Rights Reserved.

      </div>

    </footer>
  );
}

export default LandingFooter;