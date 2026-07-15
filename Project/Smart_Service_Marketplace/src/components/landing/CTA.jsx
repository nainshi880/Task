import Button from "../ui/Button";

function CTA() {
  return (
    <section className="py-24 bg-gradient-to-r from-indigo-600 to-blue-600">

      <div className="max-w-4xl mx-auto text-center text-white px-6">

        <h2 className="text-5xl font-bold">

          Ready to Book Your First Service?

        </h2>

        <p className="mt-6 text-lg text-indigo-100">

          Join thousands of happy customers and experience hassle-free home services.

        </p>

        <div className="mt-10">

          <Button
            className="bg-white text-indigo-600 hover:bg-slate-100"
          >
            Get Started
          </Button>

        </div>

      </div>

    </section>
  );
}

export default CTA;