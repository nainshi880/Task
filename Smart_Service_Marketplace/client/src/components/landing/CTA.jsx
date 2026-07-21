import { Link } from "react-router-dom";
import Button from "../ui/Button";

function CTA() {
  return (
    <section className="bg-gradient-to-r from-indigo-600 to-blue-600 py-24">
      <div className="mx-auto max-w-4xl px-6 text-center text-white">
        <h2 className="text-5xl font-bold">
          Ready to Book Your First Service?
        </h2>

        <p className="mt-6 text-lg text-indigo-100">
          Join thousands of happy customers and experience hassle-free home
          services.
        </p>

        <div className="mt-10">
          <Link to="/register">
            <Button
              size="lg"
              className="!border-2 !border-white !bg-white !text-indigo-600 shadow-sm hover:!bg-indigo-600 hover:!text-white hover:!border-white"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CTA;
